// @vitest-environment jsdom
// SPDX-License-Identifier: Apache-2.0
/**
 * Regression (issue #4): the pinned-prefix re-assertion must not re-enter its
 * own echo, and it must not re-issue a plan the observed order already
 * satisfies.
 *
 * The browser half re-asserts order on every list change, and every reorder it
 * issues comes back as a list change (the host broadcasts the persisted order).
 * The re-assertion plan is planned for SEQUENTIAL application — `reorderMoves`
 * returns the ids oldest-pin-first so that repeated insert-before-the-current-
 * head calls end with the newest pin first — but the glue issued the whole
 * batch concurrently with `void moveToTop(id)`, so every move computed its
 * anchor from the same pre-move snapshot. With three or more pinned sessions in
 * one account the resulting order is not the pinned prefix, the next list
 * change plans the same moves again, and the client never stops POSTing
 * `workspace/insertSessionBefore` (the reported loop: tens of thousands of
 * requests until `net::ERR_INSUFFICIENT_RESOURCES`).
 *
 * The suite drives the REAL browser half (`src/client.ts` `apply`) over a fake
 * client workspace service that models the 0.1.5-rc.1 seam: one serialized
 * host write chain (`WorkspaceEntity.mutate`), a unary response that installs
 * the confirmed row in this client's projection (`ClientWorkspaceModel.upsert`),
 * and a list-change notification after each accepted move (the echo this plugin
 * must ignore). `emitChange()` models the unrelated list churn (session
 * activity, follow-stream frames) that re-runs the re-assertion.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { apply, inject, name } from '../src/client.ts'

/** Pinned sessions, newest pin first (what `PinController.getPinned()` publishes). */
const PINNED = ['p1', 'p2', 'p3']
/** The account's sessions: every pin sits behind one unpinned head. */
const BEHIND = ['x', ...PINNED]
/** The re-asserted order: the pinned prefix first, the unpinned session after it. */
const ASSERTED = [...PINNED, 'x']
/** Hard stop for a runaway client, so a failing run stays bounded and readable. */
const CALL_CAP = 60

/** One intercepted `workspace/insertSessionBefore` POST. */
interface MoveCall {
  /** Owning workspace account. */
  workspaceId: string
  /** Session the plugin asked to move. */
  sessionId: string
  /** Anchor the plugin asked to insert before. */
  anchor: string | undefined
}

/** Fake of the client `workspaces` service + host write chain (see the file docblock). */
class FakeWorkspaces {
  /** Host-authoritative order of the account's sessions. */
  private server: string[]
  /** Order this client observes — the projection the plugin plans against. */
  private observed: string[]
  /** Every POST the plugin issued. */
  readonly calls: MoveCall[] = []
  /** Concurrent POSTs right now. */
  private inFlight = 0
  /** High-water mark of concurrent POSTs (the socket-exhaustion metric). */
  maxInFlight = 0
  /** Order changes the host persisted. */
  writes = 0
  private readonly listeners = new Set<() => void>()

  /**
   * @param order - the account's session order at mount.
   * @param applies - whether the host persists the move. `false` models the
   * reporter's saturated gateway: every POST is rejected with
   * `net::ERR_INSUFFICIENT_RESOURCES` before it reaches the host, so the order
   * this client observes never changes.
   */
  constructor(order: readonly string[], private readonly applies: boolean) {
    this.server = [...order]
    this.observed = [...order]
  }

  /** The client-visible list snapshot the plugin reads. */
  snapshot(): { phase: string; items: Array<{ workspaceId: string; title: string; sessionIds: string[] }> } {
    return { phase: 'ready', items: [{ workspaceId: 'w1', title: 'W1', sessionIds: [...this.observed] }] }
  }

  /** The client `workspaces` service face the browser half consumes. */
  service(): Record<string, unknown> {
    return {
      list: {
        getSnapshot: () => this.snapshot(),
        subscribe: (listener: () => void) => this.subscribe(listener),
      },
      insertSessionBefore: (workspaceId: string, sessionId: string, anchor?: string) =>
        this.insertSessionBefore(workspaceId, sessionId, anchor),
    }
  }

  /** Register a list-change listener. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** The order this client currently observes. */
  head(): string[] {
    return [...this.observed]
  }

  /** One list-change event (a host echo or unrelated sidebar churn). */
  emitChange(): void {
    for (const listener of [...this.listeners]) listener()
  }

  /** One `workspace/insertSessionBefore` POST plus its unary response and echo. */
  insertSessionBefore(workspaceId: string, sessionId: string, anchor: string | undefined): Promise<void> {
    this.calls.push({ workspaceId, sessionId, anchor })
    if (this.calls.length > CALL_CAP) {
      return Promise.reject(new Error('host saturated (test call cap)'))
    }
    this.inFlight += 1
    this.maxInFlight = Math.max(this.maxInFlight, this.inFlight)
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        this.inFlight -= 1
        if (!this.applies) {
          reject(new Error('net::ERR_INSUFFICIENT_RESOURCES'))
          return
        }
        const next = moveBefore(this.server, sessionId, anchor)
        if (!next.every((id, index) => id === this.server[index])) this.writes += 1
        this.server = next
        // The unary response installs the confirmed row in this client's
        // projection, and the persisted order is broadcast as a list change.
        this.observed = [...this.server]
        resolve()
        this.emitChange()
      }, 0)
    })
  }
}

/** `WorkspaceEntity.insertSessionBefore`: remove, then insert before the anchor. */
function moveBefore(order: readonly string[], sessionId: string, anchor: string | undefined): string[] {
  const without = order.filter(id => id !== sessionId)
  const at = anchor === undefined ? without.length : without.indexOf(anchor)
  const next = [...without.slice(0, at), sessionId, ...without.slice(at)]
  return next
}

/** Slot registry face the client apply touches (row-slot gate stays undeclared). */
function fakeSlots(): Record<string, unknown> {
  return {
    inject: () => (): void => {},
    register: () => (): void => {},
    snapshot: () => [] as unknown[],
    subscribe: () => (): void => {},
  }
}

/** Sessions list face: ready, every pinned id live (so pruning never intervenes). */
function fakeSessions(): Record<string, unknown> {
  const ids = [...BEHIND]
  return {
    list: {
      getSnapshot: () => ({
        phase: 'ready',
        ids,
        byId: Object.fromEntries(ids.map(id => [id, { displayTitle: `Session ${id}`, blank: false }])),
      }),
      subscribe: () => (): void => {},
    },
    open: (): void => {},
    binding: () => undefined,
  }
}

/** Host-backed `session-pin` settings scope with the shipped defaults. */
function fakeSettingsScope(): Record<string, unknown> {
  return {
    bind: () => ({
      getSnapshot: () => ({
        mode: 'host',
        status: 'ready',
        value: {
          pinned: [...PINNED],
          workspacePinned: [],
          colors: {},
          workspaceColors: {},
          maxPins: 0,
          reorderOnLoad: true,
          pruneStale: true,
        },
      }),
      subscribe: () => (): void => {},
      set: async (): Promise<void> => {},
    }),
  }
}

/** Drain the microtask + timer generations a pass needs to settle. */
async function settle(ticks = 12): Promise<void> {
  for (let index = 0; index < ticks; index += 1) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

describe('session-pin client reorder loop (issue #4)', () => {
  let root: Context | undefined

  afterEach(async () => {
    await root?.fiber.dispose()
    root = undefined
  })

  /** Mount the real browser half over the fake runtime services. */
  async function mount(host: FakeWorkspaces): Promise<void> {
    const context = new Context()
    const runtime = context.plugin({
      name: 'runtime',
      inject: [],
      apply: (ctx: Context) => {
        ctx.provide('slots', fakeSlots())
        ctx.provide('sessions', fakeSessions())
        ctx.provide('workspaces', host.service())
        ctx.provide('settingsScope', fakeSettingsScope())
        ctx.provide('connection', {})
        ctx.provide('remote', {})
      },
    })
    await runtime.await()
    await context.plugin({ name, inject, apply }).await()
    root = context
  }

  it('converges the pinned prefix in one sequential batch and ignores its own echo', async () => {
    const host = new FakeWorkspaces(BEHIND, true)
    await mount(host)
    await settle()

    // No two reorders in flight at once (the socket-exhaustion metric), and
    // exactly one move per pinned session: one pass, applied sequentially.
    expect(host.maxInFlight).toBe(1)
    expect(host.calls.length).toBe(PINNED.length)
    expect(host.writes).toBe(PINNED.length)
    // The pinned prefix must lead the account, newest pin first — the pre-fix
    // concurrent batch left three or more pins in the wrong order.
    expect(host.head()).toEqual(ASSERTED)

    // The echo of the confirmed batch, and later list churn, are no-ops.
    host.emitChange()
    host.emitChange()
    await settle()
    expect(host.calls.length).toBe(PINNED.length)
  })

  it('does not re-issue a reorder while the observed order stays unchanged', async () => {
    // The reporter's saturated gateway: every POST fails, so the order this
    // client observes never changes while list changes keep arriving.
    const host = new FakeWorkspaces(BEHIND, false)
    await mount(host)
    await settle()
    const issued = host.calls.length
    expect(issued).toBeGreaterThan(0)

    for (let round = 0; round < 20; round += 1) {
      host.emitChange()
      await settle(2)
    }

    // Re-issuing the same plan against the same observed order cannot change
    // it: the storm must stop instead of POSTing once per list change.
    expect(host.calls.length).toBe(issued)
    expect(host.maxInFlight).toBe(1)
  })

  it('issues nothing when the pinned prefix already leads the account', async () => {
    const host = new FakeWorkspaces(ASSERTED, true)
    await mount(host)
    await settle()
    host.emitChange()
    await settle()
    expect(host.calls).toEqual([])
    expect(host.head()).toEqual(ASSERTED)
  })
})
