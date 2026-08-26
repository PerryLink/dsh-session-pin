// SPDX-License-Identifier: Apache-2.0
/**
 * Lifecycle and export-contract suite: the HMR-safety test (dispose the
 * contributing fiber, re-query the authoritative settings registry), the
 * default-export guard (module namespace + Loader unwrap round-trip), and the
 * config value-domain negatives (the settings-namespace policy fields).
 *
 * @module dsh-session-pin/test/lifecycle.test
 */

import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { SettingsProvider, settingsNamespace } from '@deepseek-ai/dsh-settings'
import { Config, apply } from '../src/index.ts'

/** In-memory settings provider: the plugin registers the session-pin namespace on it. */
class InMemorySettings extends SettingsProvider {
  readonly writable = true
  protected async load(): Promise<Record<string, unknown>> {
    return {}
  }
  protected async persist(): Promise<void> {}
}

// ---------------------------------------------------------------------------
// C2: the function-plugin namespace must survive Loader unwrapping
// ---------------------------------------------------------------------------

describe('export contract', () => {
  it('module carries no default export and Loader unwrap round-trips the namespace', async () => {
    const plugin = await import('../src/index.ts')
    expect('default' in plugin).toBe(false)
    const loader = Object.create(Loader.prototype)
    const unwrapped = loader.unwrapExports(plugin)
    expect(unwrapped).toBe(plugin)
    expect(unwrapped.name).toBe('session-pin')
    expect(unwrapped.inject).toEqual(['settings'])
    expect(typeof unwrapped.Config).toBe('function')
    expect(typeof unwrapped.apply).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// C1: disposing the contributing fiber removes the settings namespace
// ---------------------------------------------------------------------------

describe('fiber disposal', () => {
  it('removes the session-pin settings namespace on dispose', async () => {
    const ctx = new Context()
    try {
      await ctx.plugin(InMemorySettings)
      const settings = ctx.get('settings') as InMemorySettings
      const plugin = await import('../src/index.ts')
      const pluginFiber = await ctx.plugin(plugin as unknown as import('@deepseek-ai/cordis').Plugin, { maxPins: 5 })

      expect(settings.get(settingsNamespace('session-pin'))).toBeDefined()

      await pluginFiber.dispose()

      expect(settings.get(settingsNamespace('session-pin'))).toBeUndefined()
    } finally {
      await ctx.fiber.dispose()
    }
  })
})

// ---------------------------------------------------------------------------
// U4: the settings-namespace policy value domain rejects out-of-domain values
// ---------------------------------------------------------------------------

describe('config value domain', () => {
  it('rejects a non-integer maxPins at parse time', () => {
    expect(() => (Config as (value: unknown) => Config)({ maxPins: 1.5 })).toThrow()
  })

  it('rejects a negative maxPins at parse time', () => {
    expect(() => (Config as (value: unknown) => Config)({ maxPins: -1 })).toThrow()
  })

  it('rejects a non-boolean feature switch at parse time', () => {
    expect(() => (Config as (value: unknown) => Config)({ enableBoards: 'yes' })).toThrow()
  })

  it('fills every policy default for an empty config', () => {
    expect((Config as (value: unknown) => Config)({})).toEqual({
      maxPins: 0, reorderOnLoad: true, pruneStale: true, enableBoards: true, enableTags: true, enableViews: true, enableHealth: true, enableGoto: true, enableLogBacking: false,
    })
  })

  it('registers the namespace with a real in-memory settings provider', async () => {
    const ctx = new Context()
    try {
      await ctx.plugin(InMemorySettings)
      const plugin = await import('../src/index.ts')
      await ctx.plugin(plugin as unknown as import('@deepseek-ai/cordis').Plugin, {})
      const resolved = (ctx.get('settings') as InMemorySettings).get(settingsNamespace('session-pin'))
      expect(resolved).toMatchObject({ maxPins: 0, reorderOnLoad: true })
      expect(apply).toBeTypeOf('function')
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
