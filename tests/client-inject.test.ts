// @vitest-environment jsdom
// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { apply, inject, name } from '../src/client.ts'
import { LOCALE_NS } from '../src/locales.ts'

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

/**
 * Duplicate-strict stand-in for the host locale service: like the real
 * `ctx.locale`, it throws on a duplicate namespace and its returned disposer
 * is the only unregistration path.
 */
function fakeLocale() {
  const registrations = new Set<string>()
  return {
    registrations,
    register: (namespace: string, _dicts: unknown): (() => void) => {
      if (registrations.has(namespace)) throw new Error(`locale namespace "${namespace}" already has locale "en"`)
      registrations.add(namespace)
      return () => { registrations.delete(namespace) }
    },
    bind: (namespace: string) => (key: string) => `${namespace}.${key}`,
  }
}

/** Wait out the secondary inject scope's asynchronous activation. */
async function untilSettled(expectation: () => boolean): Promise<void> {
  for (let i = 0; i < 50 && !expectation(); i++) {
    await new Promise(resolve => setTimeout(resolve, 0))
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

  it('unregisters its locale dictionaries on dispose and re-registers cleanly on remount', async () => {
    root = new Context()
    const locale = fakeLocale()
    const runtime = root.plugin({
      name: 'runtime',
      inject: [],
      apply: (ctx: Context) => {
        ctx.provide('slots', fakeSlots())
        for (const [key, value] of Object.entries(fakeRuntimeServices())) {
          ctx.provide(key, value)
        }
        ctx.provide('locale', locale)
      },
    })
    await runtime.await()

    const first = root.plugin({ name, inject, apply })
    await first.await()
    await untilSettled(() => locale.registrations.has(LOCALE_NS))
    expect(locale.registrations.has(LOCALE_NS)).toBe(true)

    await first.dispose()
    expect(locale.registrations.has(LOCALE_NS)).toBe(false)

    // A remount (HMR / re-enable) must not trip the duplicate guard.
    const second = root.plugin({ name, inject, apply })
    await second.await()
    await untilSettled(() => locale.registrations.has(LOCALE_NS))
    expect(locale.registrations.has(LOCALE_NS)).toBe(true)
  })
})
