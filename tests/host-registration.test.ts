// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
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
    expect(ns).toBe(settingsNamespace('session-pin'))
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
    expect(parsed).toEqual({ maxPins: 0, reorderOnLoad: true, pruneStale: true, enableBoards: true, enableTags: true, enableViews: true, enableHealth: true, enableGoto: true })
  })

  it('rejects a negative maxPins at parse time', () => {
    expect(() => (Config as (value: unknown) => Config)({ maxPins: -1 })).toThrow()
  })
})
