// SPDX-License-Identifier: Apache-2.0
/**
 * Host half of the dual-face session-pin plugin. On the `0.1.7` settings
 * contract a plugin's durable settings surface IS its own live Config: the
 * profile entry's id names the form, every `.volatile()` field is a
 * user-editable, live-updatable value persisted in the profile patch, and the
 * browser half reads exactly those fields through `configForms.get(entryId)`.
 *
 * So this half declares the whole former `session-pin` namespace as volatile
 * Config fields: the user layer (both pin levels, both row-color maps, and the
 * organizer state) plus the host policy (`maxPins`, `reorderOnLoad`,
 * `pruneStale`, and the five feature switches) that the browser half reads
 * from the same resolved snapshot. `enableLogBacking` stays ordinary Config —
 * it was never part of the editable namespace, and it is a host-only switch.
 *
 * Canonical residence (P0): when `enableLogBacking` is on, this half also
 * mounts a projection reader over the `session/pin` event log (see
 * `pin-log.ts`) — it folds live `session/event` events back into the pin set
 * and mirrors the folded `pinned`/`colors` into the live Config, which then
 * serves as the idempotent cache for the log-backed canonical state. The
 * volatile Config (and the browser-local fallback) remain the compat +
 * degradation path; the session log is authoritative when log-backing is
 * enabled. Workspace pins, both color maps' workspace half, and the organizer
 * metadata stay plugin-local state and never ride the session log.
 *
 * @module dsh-session-pin
 */
import type { Context, Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
// Type-only: declares the `ctx.settings` (SettingsForms) Context merge.
import type {} from '@deepseek-ai/dsh-settings'
import { normalizeColors, normalizePins } from './pin-core.ts'
import type { BoardRegistry, SavedView } from './navigator.ts'
import { PIN_EVENT, normalizePinEventValue, type PinLogValue } from './pin-log.ts'

export const name = 'session-pin'

export const inject = ['settings']

/**
 * Profile entry id carrying this plugin's settings form. The `0.1.7` contract
 * names a form by the local id of its profile entry, and `cordis.patch.yml`
 * mounts this plugin as `session-pin`; the browser half binds the same string
 * through `configForms.get()`, so the two halves agree by construction.
 */
export const SETTINGS_ENTRY_ID = 'session-pin'

/** Required host policy plus the user layer; every live field is a `Volatile` reference. */
export interface Config {
  /** Ordered pinned session ids (newest pin first) — the browser half's user layer. */
  pinned: Volatile<string[]>
  /** Ordered pinned workspace ids (newest pin first). */
  workspacePinned: Volatile<string[]>
  /** Session id → preset palette color. */
  colors: Volatile<Record<string, string>>
  /** Workspace id → preset palette color. */
  workspaceColors: Volatile<Record<string, string>>
  /** Pin groups (boards) and their membership. */
  boards: Volatile<BoardRegistry>
  /** Session/workspace id → tags. */
  tags: Volatile<Record<string, string[]>>
  /** Saved filter views. */
  views: Volatile<SavedView[]>
  /** Maximum pinned entities per level (sessions and workspaces); pinning beyond this count is rejected in the browser half. */
  maxPins: Volatile<number>
  /** Re-assert the pinned prefixes (newest pin first) once the lists are ready. */
  reorderOnLoad: Volatile<boolean>
  /** Drop pins/colors for entities absent from a ready list (deleted/archived). */
  pruneStale: Volatile<boolean>
  /** Enable pin groups (boards) in the sidebar. */
  enableBoards: Volatile<boolean>
  /** Enable session/workspace tags and the sidebar filter bar. */
  enableTags: Volatile<boolean>
  /** Enable saved filter views. */
  enableViews: Volatile<boolean>
  /** Enable the per-pinned-session health summary (read-only, sanitized). */
  enableHealth: Volatile<boolean>
  /** Enable the `/goto <keyword>` composer command (fuzzy title/tag jump). */
  enableGoto: Volatile<boolean>
  /**
   * Gate the log-backed canonical pin residence: fold `session/pin` events
   * into a projection and mirror the folded pin set + colors into the live
   * Config cache. Fail-closed default `false` — enable on builds that emit
   * the `session/pin` event (upstream `session.setPinned` RPC or this
   * plugin's own appender); on baselines without it the reader simply never
   * folds and the volatile Config remains the durable path.
   *
   * Host-only switch: deliberately NOT volatile, because it was never a field
   * of the old `session-pin` settings namespace and no browser half reads it.
   */
  enableLogBacking: boolean
}

/**
 * Live Config schema. Every field except {@link Config.enableLogBacking} is
 * marked volatile: volatile fields are the ones the settings service projects
 * into a form, admits edits on, and hot-applies to the running plugin — the
 * exact surface the removed `settings.register(ns, schema, { base })` call
 * used to own. `schemastery` restricts `.volatile()` to a fixed object path
 * (never inside an array, dict, union, lazy, or transform node), which every
 * field here satisfies.
 *
 * The schema carries no `z<Config>` annotation: a volatile field's declared
 * metadata type is derived from the PRE-volatile input type, so `z<Config>`
 * cannot be satisfied by a Config whose fields are `Volatile<T>` (the official
 * `ui-theme` host half omits it for the same reason). {@link Config} remains
 * the interface `apply` receives and the resolved output is exactly it.
 */
export const Config = z.object({
  pinned: z.array(z.string()).default([]).volatile(),
  workspacePinned: z.array(z.string()).default([]).volatile(),
  colors: z.dict(z.string()).default({}).volatile(),
  workspaceColors: z.dict(z.string()).default({}).volatile(),
  boards: z.any().default({}).volatile(),
  tags: z.dict(z.array(z.string())).default({}).volatile(),
  views: z.array(z.any()).default([]).volatile(),
  maxPins: z.number().step(1).min(0).default(0).volatile(),
  reorderOnLoad: z.boolean().default(true).volatile(),
  pruneStale: z.boolean().default(true).volatile(),
  enableBoards: z.boolean().default(true).volatile(),
  enableTags: z.boolean().default(true).volatile(),
  enableViews: z.boolean().default(true).volatile(),
  enableHealth: z.boolean().default(true).volatile(),
  enableGoto: z.boolean().default(true).volatile(),
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

/** Narrow host session-event sink (runtime-probed; `session/event` is a dsh-session event, not typed here). */
interface SessionEventSink {
  on(name: 'session/event', listener: (session: { id?: unknown }, event: unknown) => void): () => void
}

/**
 * Apply the host half. The durable settings surface is the exported
 * {@link Config} itself: the settings service projects its volatile fields
 * into the profile entry's form and hot-applies accepted edits to this
 * plugin's live Config references, so nothing has to be registered here. This
 * half therefore only (a) claims the entry's presentation policy — the
 * generated form is the plugin's settings page, since it ships no custom one —
 * and (b) mounts the optional log-backed projection reader.
 * @param ctx - harness context exposing the settings service.
 * @param config - live pin Config from the cordis.yml row.
 */
export function apply(ctx: Context, config: Config): void {
  // `inject` guarantees the service; the child scope keeps the registration's
  // disposer on this plugin's fiber so unload/reload re-registers cleanly
  // (SettingsForms.configure throws for an instance that already has one).
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: true }, ctx.fiber), 'session-pin: settings presentation')
  })
  if (config.enableLogBacking) mountPinProjection(ctx, config)
}

/**
 * Mount the log-backed projection reader: fold live `session/pin` events into
 * the canonical pin set and mirror each folded session into the live Config.
 * The listener is owned by the plugin fiber (Cordis auto-disposes it), and the
 * mirror is best-effort — a failed write is logged, never thrown.
 * @param ctx - harness context (provides `logger` and the `session/event` bus).
 * @param config - the plugin's live Config references (the mirror's cache).
 */
function mountPinProjection(ctx: Context, config: Config): void {
  // Consumer — fold live `session/event` events from the host event bus into
  // the pin projection (mirrored back into the live Config cache).
  const events = ctx as unknown as SessionEventSink
  events.on('session/event', (session, event) => {
    const id = session.id
    if (typeof id !== 'string' || id.length === 0) return
    const candidate = event as { type?: unknown; data?: unknown } | null | undefined
    if (candidate?.type !== PIN_EVENT) return
    const value = normalizePinEventValue(id, candidate.data)
    if (value === undefined) return
    void mirrorSessionPin(ctx, config, value).catch((error: unknown) => {
      ctx.logger.warn(`session-pin: pin projection mirror failed: ${String(error)}`)
    })
  })
}

/**
 * Merge one folded session into the live Config cache: pinning moves the
 * session to the front of the pinned list, unpinning removes it, and a defined
 * color sets or clears the row color — leaving every other session's state
 * intact. The read is the plugin's own stable volatile reference (so it sees
 * both the composition value and every earlier mirror and user edit); the
 * write goes through the settings service, which merges it into the profile
 * entry's override layer exactly as the removed scope `update()` did.
 * @param ctx - harness context exposing the settings service.
 * @param config - the plugin's live Config references.
 * @param value - the folded whole-value pin state.
 */
async function mirrorSessionPin(ctx: Context, config: Config, value: PinLogValue): Promise<void> {
  const current = config.pinned.get()
  const pinned = value.pinned
    ? [value.sessionId, ...normalizePins(current).filter(id => id !== value.sessionId)]
    : normalizePins(current).filter(id => id !== value.sessionId)
  const colors = normalizeColors(config.colors.get())
  if (value.color === null) delete colors[value.sessionId]
  else if (value.color !== undefined) colors[value.sessionId] = value.color
  await ctx.settings.update(SETTINGS_ENTRY_ID, { pinned, colors })
}
