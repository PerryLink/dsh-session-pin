// @vitest-environment jsdom
// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { apply, inject, name } from '../src/client.ts'

/**
 * Regression: the browser half reads `ctx.slots` on apply, so `slots` must be
 * declared in the plugin's inject. Cordis property reads resolve a service
 * through an ANCESTOR-ONLY fiber walk; the runtime entry that provides the
 * real SlotRegistry is a SIBLING fiber on the client graph, so an undeclared
 * `ctx.slots` read reaches the root fiber and throws
 * `cannot get property "slots" without inject` (see harness postmortem 0001).
 * A fake registry provided on a sibling fiber reproduces that topology.
 */

/** Slot registry face the client apply touches (inject defers; never called back here). */
function fakeSlots() {
  return {
    inject: (_key: string, _callback: () => () => void) => (): void => {},
    register: (_options: unknown, _component: unknown) => (): void => {},
    snapshot: () => [] as unknown[],
    subscribe: () => (): void => {},
  }
}

/** Narrowed runtime services the client apply consumes beyond slots. */
function fakeRuntimeServices() {
  return {
    sessions: {
      list: {
        getSnapshot: () => ({ phase: 'ready', ids: [], byId: {} }),
        subscribe: () => (): void => {},
      },
      open: (): void => {},
    },
    workspaces: {
      list: {
        getSnapshot: () => ({ items: [], phase: 'ready' }),
        subscribe: () => (): void => {},
      },
      insertSessionBefore: async (): Promise<void> => {},
      insertBefore: async (): Promise<void> => {},
      startSession: (): void => {},
    },
    settingsScope: {
      bind: () => ({
        getSnapshot: () => ({
          value: {
            pinned: [],
            workspacePinned: [],
            colors: {},
            workspaceColors: {},
            maxPins: 0,
            reorderOnLoad: true,
            pruneStale: true,
          },
        }),
        set: async (): Promise<void> => {},
        subscribe: () => (): void => {},
      }),
    },
    connection: {},
    remote: {},
  }
}

describe('session-pin client apply on a real cordis graph', () => {
  let root: Context | undefined

  afterEach(async () => {
    await root?.fiber.dispose()
    root = undefined
  })

  it('declares every service its apply reads directly, including slots', () => {
    const reads = ['sessions', 'workspaces', 'settingsScope', 'connection', 'slots']
    for (const name of reads) {
      expect(inject, `inject must declare "${name}"`).toContain(name)
    }
  })

  it('activates when slots is provided by a sibling fiber, not an ancestor', async () => {
    root = new Context()
    // The runtime entry provides the slot registry (and the rest of the
    // client runtime services) on its own fiber — never on the root.
    const runtime = root.plugin({
      name: 'runtime',
      inject: [],
      apply: (ctx: Context) => {
        ctx.provide('slots', fakeSlots())
        for (const [key, value] of Object.entries(fakeRuntimeServices())) {
          ctx.provide(key, value)
        }
      },
    })
    // Activate the runtime first, exactly as the client graph does; this is
    // what makes `slots` available to a sibling entry.
    await runtime.await()

    // The session-pin browser half mounts as a separate sibling entry.
    const fiber = root.plugin({ name, inject, apply })

    // Stringify the outcome: pretty-formatting the fiber proxy itself would
    // trip the cordis get trap on unrelated properties.
    const settled = await fiber.await().then(
      () => 'ok' as const,
      (error: unknown) => `failed: ${String(error)}` as const,
    )
    // Without `slots` in inject this is:
    //   failed: Error: cannot get property "slots" without inject
    expect(settled).toBe('ok')
  })
})
