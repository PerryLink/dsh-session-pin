// SPDX-License-Identifier: Apache-2.0
/**
 * Host half of the dual-face session-pin plugin: registers the durable
 * `session-pin` settings namespace whose user layer holds both pin levels
 * (pinned session ids and pinned workspace ids) plus the per-level row-color
 * maps, and whose composition base carries the host policy (`maxPins`,
 * `reorderOnLoad`, `pruneStale`) so the browser half reads everything
 * through the same settings snapshot.
 *
 * Canonical residence (P0): when `enableLogBacking` is on, this half also
 * mounts a projection reader over the `session/pin` event log (see
 * `pin-log.ts`) — it folds live `session/event` events back into the pin set
 * and mirrors the folded `pinned`/`colors` into the settings namespace, which
 * then serves as the idempotent cache for the log-backed canonical state.
 * The settings namespace (and the browser-local fallback) remain the compat +
 * degradation path; the session log is authoritative when log-backing is
 * enabled. Workspace pins, both color maps' workspace half, and the organizer
 * metadata stay plugin-local state and never ride the session log.
 *
 * @module dsh-session-pin
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { settingsNamespace, type SettingsRegisterOptions, type SettingsScope } from '@deepseek-ai/dsh-settings'
import { normalizeColors, normalizePins } from './pin-core.ts'
import { PIN_EVENT, normalizePinEventValue, type PinLogValue } from './pin-log.ts'

export const name = 'session-pin'

export const inject = ['settings']

/** Required host policy; 0 maxPins means unlimited pins per level. */
export type Config = {
  /** Maximum pinned entities per level (sessions and workspaces); pinning beyond this count is rejected in the browser half. */
  maxPins: number
  /** Re-assert the pinned prefixes (newest pin first) once the lists are ready. */
  reorderOnLoad: boolean
  /** Drop pins/colors for entities absent from a ready list (deleted/archived). */
  pruneStale: boolean
  /** Enable pin groups (boards) in the sidebar. */
  enableBoards: boolean
  /** Enable session/workspace tags and the sidebar filter bar. */
  enableTags: boolean
  /** Enable saved filter views. */
  enableViews: boolean
  /** Enable the per-pinned-session health summary (read-only, sanitized). */
  enableHealth: boolean
  /** Enable the `/goto <keyword>` composer command (fuzzy title/tag jump). */
  enableGoto: boolean
  /**
   * Gate the log-backed canonical pin residence: fold `session/pin` events
   * into a projection and mirror the folded pin set + colors into the
   * settings cache. Fail-closed default `false` — enable on builds that emit
   * the `session/pin` event (upstream `session.setPinned` RPC or this
   * plugin's own appender); on baselines without it the reader simply never
   * folds and the settings store remains the durable path.
   */
  enableLogBacking: boolean
}

export const Config: z<Config> = z.object({
  maxPins: z.number().step(1).min(0).default(0),
  reorderOnLoad: z.boolean().default(true),
  pruneStale: z.boolean().default(true),
  enableBoards: z.boolean().default(true),
  enableTags: z.boolean().default(true),
  enableViews: z.boolean().default(true),
  enableHealth: z.boolean().default(true),
  enableGoto: z.boolean().default(true),
  enableLogBacking: z.boolean().default(false),
})

/** User-layer pin document shape mirrored by the browser half. */
export interface PinUserLayer {
  /** Ordered pinned session ids (newest pin first). */
  pinned: string[]
  /** Ordered pinned workspace ids (newest pin first). */
  workspacePinned: string[]
  /** Session id → preset palette color. */
  colors: Record<string, string>
  /** Workspace id → preset palette color. */
  workspaceColors: Record<string, string>
  /** Pin groups (boards) and their membership. */
  boards: Record<string, unknown>
  /** Session/workspace id → tags. */
  tags: Record<string, string[]>
  /** Saved filter views. */
  views: Array<Record<string, unknown>>
}

/**
 * Namespace schema: the two ordered pinned id lists (newest pin first), the
 * two row-color maps, the navigator metadata (boards/tags/views), and the
 * host policy mirrored into the user-editable section defaults.
 */
const PinSchema = z.object({
  pinned: z.array(z.string()).default([]),
  workspacePinned: z.array(z.string()).default([]),
  colors: z.dict(z.string()).default({}),
  workspaceColors: z.dict(z.string()).default({}),
  boards: z.any().default({}),
  tags: z.dict(z.array(z.string())).default({}),
  views: z.array(z.any()).default([]),
  maxPins: z.number().step(1).min(0).default(0),
  reorderOnLoad: z.boolean().default(true),
  pruneStale: z.boolean().default(true),
  enableBoards: z.boolean().default(true),
  enableTags: z.boolean().default(true),
  enableViews: z.boolean().default(true),
  enableHealth: z.boolean().default(true),
  enableGoto: z.boolean().default(true),
})

/** Narrow host session-event sink (runtime-probed; `session/event` is a dsh-session event, not typed here). */
interface SessionEventSink {
  on(name: 'session/event', listener: (session: { id?: unknown }, event: unknown) => void): () => void
}

/**
 * Register the `session-pin` settings namespace. The policy fields ride the
 * composition base layer so the browser half reads them through the same
 * settings snapshot that carries the pinned ids and colors. `expose` declares
 * wire exposure (settings.* RPCs serve the namespace to browsers) on builds
 * whose settings service supports the option — the rc.6 baseline answers
 * `settings-not-exposed` and the browser half degrades to localStorage; the
 * cast crosses that version boundary once, at the call site. When
 * `enableLogBacking` is on, the returned scope also receives the folded
 * `session/pin` projection (see {@link mountPinProjection}).
 * @param ctx - harness context exposing the settings service.
 * @param config - pin policy from the cordis.yml row.
 */
export function apply(ctx: Context, config: Config): void {
  const options = {
    base: {
      pinned: [],
      workspacePinned: [],
      colors: {},
      workspaceColors: {},
      boards: {},
      tags: {},
      views: [],
      maxPins: config.maxPins,
      reorderOnLoad: config.reorderOnLoad,
      pruneStale: config.pruneStale,
      enableBoards: config.enableBoards,
      enableTags: config.enableTags,
      enableViews: config.enableViews,
      enableHealth: config.enableHealth,
      enableGoto: config.enableGoto,
    },
    applies: 'live' as const,
    expose: true,
  } as unknown as SettingsRegisterOptions<Record<string, unknown>>
  const scope = ctx.settings.register(
    settingsNamespace('session-pin'),
    PinSchema,
    options,
  ) as unknown as SettingsScope<Record<string, unknown>>
  if (config.enableLogBacking) mountPinProjection(ctx, scope)
}

/**
 * Mount the log-backed projection reader: fold live `session/pin` events into
 * the canonical pin set and mirror each folded session into the settings
 * cache. The listener is owned by the plugin fiber (Cordis auto-disposes it),
 * and the mirror is best-effort — a failed write is logged, never thrown.
 * @param ctx - harness context (provides `logger` and the `session/event` bus).
 * @param scope - the registered `session-pin` settings scope receiving the fold.
 */
function mountPinProjection(ctx: Context, scope: SettingsScope<Record<string, unknown>>): void {
  const events = ctx as unknown as SessionEventSink
  events.on('session/event', (session, event) => {
    const id = session.id
    if (typeof id !== 'string' || id.length === 0) return
    const candidate = event as { type?: unknown; data?: unknown } | null | undefined
    if (candidate?.type !== PIN_EVENT) return
    const value = normalizePinEventValue(id, candidate.data)
    if (value === undefined) return
    void mirrorSessionPin(scope, value).catch((error: unknown) => {
      ctx.logger.warn(`session-pin: pin projection mirror failed: ${String(error)}`)
    })
  })
}

/**
 * Merge one folded session into the settings cache: pinning moves the session
 * to the front of the pinned list, unpinning removes it, and a defined color
 * sets or clears the row color — leaving every other session's state intact.
 * @param scope - the registered settings scope.
 * @param value - the folded whole-value pin state.
 */
async function mirrorSessionPin(scope: SettingsScope<Record<string, unknown>>, value: PinLogValue): Promise<void> {
  const current = scope.get()
  const pinned = value.pinned
    ? [value.sessionId, ...normalizePins(current.pinned).filter(id => id !== value.sessionId)]
    : normalizePins(current.pinned).filter(id => id !== value.sessionId)
  const colors = normalizeColors(current.colors)
  if (value.color === null) delete colors[value.sessionId]
  else if (value.color !== undefined) colors[value.sessionId] = value.color
  await scope.update({ pinned, colors })
}
