// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest'
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings'
import type { Context } from '@deepseek-ai/cordis'
import { apply, Config } from '../src/index.ts'

/** Minimal cordis context: only the settings registration face the plugin uses. */
function fakeCtx(register: (ns: unknown, schema: unknown, options: unknown) => void): Context {
  return { settings: { register } } as unknown as Context
}

describe('session-pin host apply', () => {
  it('registers the session-pin namespace with the policy base layer', () => {
    const register = vi.fn()
    apply(fakeCtx(register), (Config as (value: unknown) => Config)({ maxPins: 5, reorderOnLoad: false, pruneStale: false }))
    expect(register).toHaveBeenCalledTimes(1)
    const [ns, schema, options] = register.mock.calls[0] as [unknown, unknown, { base: unknown; applies: unknown }]
    expect(ns).toBe('session-pin' as SettingsNamespace)
    expect(typeof schema).toBe('function') // schemastery schemas are callable
    expect(options).toMatchObject({
      base: {
        pinned: [],
        workspacePinned: [],
        colors: {},
        workspaceColors: {},
        maxPins: 5,
        reorderOnLoad: false,
        pruneStale: false,
      },
      applies: 'live',
      expose: true,
    })
  })

  it('fills the policy defaults from the config schema', () => {
    const parsed = (Config as (value: unknown) => Config)({})
    expect(parsed).toEqual({ maxPins: 0, reorderOnLoad: true, pruneStale: true, enableBoards: true, enableTags: true, enableViews: true, enableHealth: true, enableGoto: true, enableLogBacking: false })
  })

  it('rejects a negative maxPins at parse time', () => {
    expect(() => (Config as (value: unknown) => Config)({ maxPins: -1 })).toThrow()
  })

  it('mounts the log-backed projection reader and mirrors a folded session/pin event into settings', async () => {
    const updates: Array<Record<string, unknown>> = []
    let sessionHandler: ((session: { id?: unknown }, event: unknown) => void) | undefined
    const scope = {
      get: () => ({ pinned: ['existing'], colors: { existing: '#f97316' } }),
      update: async (patch: Record<string, unknown>): Promise<void> => {
        updates.push(patch)
      },
    }
    const ctx = {
      settings: { register: vi.fn(() => scope) },
      on: vi.fn((_name: string, handler: (session: { id?: unknown }, event: unknown) => void) => {
        sessionHandler = handler
        return (): void => {}
      }),
      logger: { warn: vi.fn() },
    }
    apply(ctx as unknown as Context, (Config as (value: unknown) => Config)({ enableLogBacking: true }))
    expect(sessionHandler).toBeDefined()
    expect(ctx.settings.register).toHaveBeenCalledTimes(1)
    sessionHandler!({ id: 's1' }, { type: 'session/pin', data: { sessionId: 's1', pinned: true, at: 9 } })
    await Promise.resolve()
    expect(updates).toEqual([{ pinned: ['s1', 'existing'], colors: { existing: '#f97316' } }])
  })
})
