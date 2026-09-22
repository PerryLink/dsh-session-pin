// SPDX-License-Identifier: Apache-2.0
/**
 * Host-half contract suite for the `0.1.7` settings model.
 *
 * The removed contract (`ctx.settings.register(ns, schema, { base, applies })`)
 * is gone: a plugin's durable settings surface is now its OWN live Config. A
 * form namespace is the local id of a profile entry, and the fields a form
 * projects, edits, and hot-applies are exactly the `.volatile()` ones. These
 * tests pin that surface 鈥?the entry id the browser half binds, the volatile
 * field set, the live defaults, and the settings writes this half performs
 * (the presentation claim and the log-backed mirror).
 *
 * @module dsh-session-pin/test/host-registration.test
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { Context, type Fiber, type Plugin, type Volatile } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { Config, SETTINGS_ENTRY_ID, apply, inject, name } from '../src/index.ts'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The live Config the Loader hands `apply`: the schema's runtime output. */
interface LiveConfig {
  pinned: Volatile<string[]>
  workspacePinned: Volatile<string[]>
  colors: Volatile<Record<string, string>>
  workspaceColors: Volatile<Record<string, string>>
  boards: Volatile<Record<string, unknown>>
  tags: Volatile<Record<string, string[]>>
  views: Volatile<unknown[]>
  maxPins: Volatile<number>
  reorderOnLoad: Volatile<boolean>
  pruneStale: Volatile<boolean>
  enableBoards: Volatile<boolean>
  enableTags: Volatile<boolean>
  enableViews: Volatile<boolean>
  enableHealth: Volatile<boolean>
  enableGoto: Volatile<boolean>
  enableLogBacking: boolean
}

/**
 * Resolve the schema exactly as the Loader does. `schemastery`'s object typing
 * derives a field's declared output from its PRE-volatile input type, so this
 * cast crosses that (upstream) typing gap once, at the test boundary; the
 * runtime value is the host half's own `Config` interface, volatile references
 * included.
 */
const resolveConfig = Config as unknown as (value: unknown) => LiveConfig

/** The former `session-pin` namespace fields: the surface the browser half reads and writes. */
const LIVE_FIELDS = [
  'pinned', 'workspacePinned', 'colors', 'workspaceColors', 'boards', 'tags', 'views',
  'maxPins', 'reorderOnLoad', 'pruneStale', 'enableBoards', 'enableTags', 'enableViews', 'enableHealth', 'enableGoto',
] as const

/** One settings write the host half attempted, in order. */
interface SettingsCall {
  ns: string
  patch: Record<string, unknown>
}

/** The settings stand-in `mount` records through. */
interface SettingsRecorder {
  claims: Array<{ auto: unknown; owner: unknown }>
  writes: SettingsCall[]
  attempts: string[]
}

/** A mounted host half plus the stand-in it wrote through. */
interface MountedGraph {
  settings: SettingsRecorder
  /** Emit one `session/event` on the plugin's own context. */
  emit: (event: unknown, session?: unknown) => void
  /** The live config the mounted fiber currently holds. */
  liveConfig: () => LiveConfig
  /** The Loader entry id the row was mounted under. */
  entryId: string
  /** Commit new composition config the way the host does (volatile paths only, no remount). */
  updateConfig: (next: Record<string, unknown>) => Promise<void>
  dispose: () => Promise<void>
}

/**
 * Mount the host half through a REAL Loader entry over a minimal settings
 * stand-in: `configure` records the presentation claim, `update` records the
 * mirror writes. Everything else about the graph (inject scoping, effect
 * ownership, schema resolution, event dispatch, and the Loader's in-place
 * volatile commit) is the real framework, so the tests exercise the same
 * lifecycle the harness runs.
 * @param configValue - raw composition config for the plugin row.
 * @param failWrites - reject every settings write, to prove containment.
 * @returns the mounted graph and its recorder.
 */
async function mount(configValue: Record<string, unknown>, failWrites = false): Promise<MountedGraph> {
  const settings: SettingsRecorder = { claims: [], writes: [], attempts: [] }
  const standIn = {
    configure: (presentation: { auto?: boolean }, owner: unknown): (() => void) => {
      settings.claims.push({ auto: presentation.auto, owner })
      return () => {}
    },
    update: async (ns: string, patch: object): Promise<void> => {
      settings.attempts.push(ns)
      if (failWrites) throw new Error('settings provider refused the write')
      settings.writes.push({ ns, patch: patch as Record<string, unknown> })
    },
  }
  const root = new Context()
  const provider = root.plugin({
    name: 'settings-provider',
    inject: [],
    apply: (ctx: Context) => {
      ctx.provide('settings', standIn as unknown as Context['settings'])
    },
  })
  await provider.await()

  await root.plugin(Loader)
  root.loader.builtins['session-pin-host'] = { name, inject, Config, apply } as unknown as Plugin
  const entryId = await root.loader.create({ name: 'cordis:session-pin-host', config: configValue })
  const entry = root.loader.resolve(entryId)
  const fiber = entry.fiber as Fiber
  await fiber.await()
  const fiberCtx = fiber.ctx as unknown as { emit: (event: string, ...args: unknown[]) => void }
  return {
    settings,
    emit: (event, session = { id: 's1' }) => {
      fiberCtx.emit('session/event', session, event)
    },
    liveConfig: () => fiber.config as LiveConfig,
    entryId,
    updateConfig: async (next) => {
      await entry.update({ config: next })
      await fiber.await()
    },
    dispose: () => root.fiber.dispose(),
  }
}

/** Drain the mirror's promise chain (the event listener is fire-and-forget by contract). */
async function settle(): Promise<void> {
  for (let index = 0; index < 8; index += 1) await new Promise(resolve => setTimeout(resolve, 0))
}

describe('session-pin host half on the 0.1.7 settings contract', () => {
  it('names the settings form after the profile entry the bundle patch mounts', () => {
    expect(SETTINGS_ENTRY_ID).toBe('session-pin')
    const patch = readFileSync(join(repositoryRoot, 'cordis.patch.yml'), 'utf8')
    expect(patch).toMatch(new RegExp(`^\\s*(?:-\\s*)?id:\\s*${SETTINGS_ENTRY_ID}\\s*$`, 'mu'))
  })

  it('exposes the whole former namespace as live (volatile) Config fields', () => {
    const live = resolveConfig({})
    for (const field of LIVE_FIELDS) {
      expect(typeof live[field].get, `${field} must be a live reference`).toBe('function')
    }
    // The host-only switch was never part of the editable namespace: it stays
    // ordinary Config, so no generated form ever offers it.
    expect(live.enableLogBacking).toBe(false)
  })

  it('fills every live default the browser half falls back to', () => {
    const live = resolveConfig({})
    expect(live.pinned.get()).toEqual([])
    expect(live.workspacePinned.get()).toEqual([])
    expect(live.colors.get()).toEqual({})
    expect(live.workspaceColors.get()).toEqual({})
    expect(live.boards.get()).toEqual({})
    expect(live.tags.get()).toEqual({})
    expect(live.views.get()).toEqual([])
    expect(live.maxPins.get()).toBe(0)
    expect(live.reorderOnLoad.get()).toBe(true)
    expect(live.pruneStale.get()).toBe(true)
    expect(live.enableBoards.get()).toBe(true)
    expect(live.enableTags.get()).toBe(true)
    expect(live.enableViews.get()).toBe(true)
    expect(live.enableHealth.get()).toBe(true)
    expect(live.enableGoto.get()).toBe(true)
    expect(live.enableLogBacking).toBe(false)
  })

  it('carries the configured policy into the live references', () => {
    const live = resolveConfig({ maxPins: 5, reorderOnLoad: false, pruneStale: false, enableGoto: false })
    expect(live.maxPins.get()).toBe(5)
    expect(live.reorderOnLoad.get()).toBe(false)
    expect(live.pruneStale.get()).toBe(false)
    expect(live.enableGoto.get()).toBe(false)
  })

  it('rejects out-of-domain policy values at parse time', () => {
    expect(() => resolveConfig({ maxPins: -1 })).toThrow()
    expect(() => resolveConfig({ maxPins: 1.5 })).toThrow()
    expect(() => resolveConfig({ enableBoards: 'yes' })).toThrow()
  })

  it('claims the generated-form presentation for its own instance', async () => {
    const graph = await mount({})
    try {
      expect(graph.settings.claims).toHaveLength(1)
      expect(graph.settings.claims[0]!.auto).toBe(true)
      expect(graph.settings.claims[0]!.owner).toBeDefined()
      expect(graph.settings.attempts).toEqual([])
    } finally {
      await graph.dispose()
    }
  })

  it('applies the configured maxPins to the live reference the browser half reads', async () => {
    const graph = await mount({ maxPins: 5 })
    try {
      expect(graph.liveConfig().maxPins.get()).toBe(5)
    } finally {
      await graph.dispose()
    }
  })

  it('mounts no log-backed reader unless enableLogBacking is on', async () => {
    const graph = await mount({})
    try {
      graph.emit({ type: 'session/pin', data: { sessionId: 's1', pinned: true, at: 9 } })
      await settle()
      expect(graph.settings.attempts).toEqual([])
    } finally {
      await graph.dispose()
    }
  })

  it('mirrors a folded session/pin event into the session-pin entry and ignores every other event', async () => {
    const graph = await mount({ enableLogBacking: true })
    try {
      graph.emit({ type: 'session/pin', data: { sessionId: 's1', pinned: true, at: 9 } })
      await settle()
      expect(graph.settings.writes).toEqual([{ ns: SETTINGS_ENTRY_ID, patch: { pinned: ['s1'], colors: {} } }])

      graph.emit({ type: 'assistant/message', data: { text: 'hi' } })
      graph.emit({ type: 'session/pin', data: { pinned: 'yes' } })
      await settle()
      expect(graph.settings.writes).toHaveLength(1)
    } finally {
      await graph.dispose()
    }
  })

  it('merges a folded pin over the live pin list already held', async () => {
    // The mirror reads its cache from the plugin's own live references, so a
    // composition value is the merge base 鈥?exactly the old scope.get() read 鈥?    // and the pin/unpin/color semantics are unchanged. (The real host
    // hot-applies an accepted write back into the same reference; the stand-in
    // records only, so the second event folds over the composition value
    // again, which is the case asserted here.)
    const graph = await mount({ enableLogBacking: true, pinned: ['existing'], colors: { existing: '#f97316' } })
    try {
      graph.emit({ type: 'session/pin', data: { sessionId: 's1', pinned: true, at: 9 } })
      await settle()
      expect(graph.settings.writes).toEqual([
        { ns: SETTINGS_ENTRY_ID, patch: { pinned: ['s1', 'existing'], colors: { existing: '#f97316' } } },
      ])

      graph.emit({ type: 'session/pin', data: { sessionId: 'existing', pinned: false, color: null, at: 10 } })
      await settle()
      expect(graph.settings.writes[1]).toEqual({ ns: SETTINGS_ENTRY_ID, patch: { pinned: [], colors: {} } })
    } finally {
      await graph.dispose()
    }
  })

  it('folds over the config the fiber currently holds, not the value it was mounted with', async () => {
    const graph = await mount({ enableLogBacking: true, pinned: ['existing'] })
    try {
      // A settings edit reaches the plugin as a Loader config update on the
      // same entry. Whatever the Loader does to the references, the mirror must
      // fold over what the plugin holds NOW — never over a value captured at
      // mount or at the first fold.
      await graph.updateConfig({ enableLogBacking: true, pinned: ['reloaded'] })
      expect(graph.liveConfig().pinned.get()).toEqual(['reloaded'])

      graph.emit({ type: 'session/pin', data: { sessionId: 's1', pinned: true, at: 9 } })
      await settle()
      expect(graph.settings.writes[0]!.patch.pinned).toEqual(['s1', 'reloaded'])
    } finally {
      await graph.dispose()
    }
  })

  it('contains a refused mirror write and keeps reading later events', async () => {
    const graph = await mount({ enableLogBacking: true }, true)
    try {
      graph.emit({ type: 'session/pin', data: { sessionId: 's1', pinned: true, at: 9 } })
      await settle()
      // A rejection is logged on the plugin's logger, never rethrown into the
      // event bus: the listener survives and keeps folding.
      graph.emit({ type: 'session/pin', data: { sessionId: 's2', pinned: true, at: 10 } })
      await settle()
      expect(graph.settings.attempts).toEqual([SETTINGS_ENTRY_ID, SETTINGS_ENTRY_ID])
      expect(graph.settings.writes).toEqual([])
    } finally {
      await graph.dispose()
    }
  })
})
