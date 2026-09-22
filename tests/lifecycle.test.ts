// SPDX-License-Identifier: Apache-2.0
/**
 * Lifecycle and export-contract suite: the HMR-safety test (dispose the
 * contributing fiber, re-register on the authoritative settings service) and
 * the default-export guard (module namespace + Loader unwrap round-trip).
 *
 * The `0.1.7` settings service keys an instance's page policy by its OWNER
 * FIBER and throws for an instance that already has one, so the disposer the
 * host half registers through `ctx.effect` is what makes unload/reload safe —
 * exactly the role the removed namespace registration's fiber effect played.
 *
 * @module dsh-session-pin/test/lifecycle.test
 */

import { describe, expect, it } from 'vitest'
import { Context, type Plugin } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { Config, SETTINGS_ENTRY_ID, apply, inject, name } from '../src/index.ts'

/**
 * Duplicate-strict settings stand-in: like the real `SettingsForms.configure`,
 * it refuses a second presentation for the same owner fiber and releases the
 * first only through the returned disposer.
 */
class PresentationRegistry {
  readonly owners = new Set<unknown>()
  configure(_presentation: { auto?: boolean }, owner: unknown): () => void {
    if (this.owners.has(owner)) throw new Error('Settings presentation is already configured for this plugin instance')
    this.owners.add(owner)
    return () => {
      this.owners.delete(owner)
    }
  }
}

/** Mount a settings provider fiber, then the host half on a sibling fiber. */
async function mountHost(registry: PresentationRegistry, configValue: Record<string, unknown> = {}) {
  const root = new Context()
  const provider = root.plugin({
    name: 'settings-provider',
    inject: [],
    apply: (ctx: Context) => {
      ctx.provide('settings', registry as unknown as Context['settings'])
    },
  })
  await provider.await()
  const fiber = root.plugin({ name, inject, Config, apply } as unknown as Plugin, configValue)
  await fiber.await()
  return { root, fiber }
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
    expect(unwrapped.SETTINGS_ENTRY_ID).toBe('session-pin')
    expect(typeof unwrapped.Config).toBe('function')
    expect(typeof unwrapped.apply).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// C1: disposing the contributing fiber releases its settings presentation
// ---------------------------------------------------------------------------

describe('fiber disposal', () => {
  it('releases the settings presentation on dispose and re-registers on remount', async () => {
    const registry = new PresentationRegistry()
    const first = await mountHost(registry)
    try {
      expect(registry.owners.size).toBe(1)

      await first.fiber.dispose()
      expect(registry.owners.size).toBe(0)

      // A remount (HMR / re-enable) must not trip the duplicate guard.
      const second = await mountHost(registry)
      expect(registry.owners.size).toBe(1)
      await second.root.fiber.dispose()
      expect(registry.owners.size).toBe(0)
    } finally {
      await first.root.fiber.dispose()
    }
  })

  it('keeps the entry id the browser half binds to', () => {
    expect(SETTINGS_ENTRY_ID).toBe('session-pin')
  })
})
