// SPDX-License-Identifier: Apache-2.0
/**
 * Host half of the dual-face session-pin plugin: registers the durable
 * `session-pin` settings namespace whose user layer holds both pin levels
 * (pinned session ids and pinned workspace ids) plus the per-level row-color
 * maps, and whose composition base carries the host policy (`maxPins`,
 * `reorderOnLoad`, `pruneStale`) so the browser half reads everything
 * through the same settings snapshot. This half owns no runtime behavior
 * beyond the registration.
 *
 * TODO(plugin): the canonical DSH residence for per-session UI metadata is a
 * log-backed `session/pin` event (like `session/title`) folded through a
 * session projection; once the upstream write channel (an RPC the browser can
 * call) exists, fold pinned ids from the logs and retire this namespace.
 * Until then the settings namespace is the durable store.
 * @module dsh-session-pin
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { settingsNamespace, type SettingsRegisterOptions } from '@deepseek-ai/dsh-settings'

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
}

export const Config: z<Config> = z.object({
  maxPins: z.number().step(1).min(0).default(0),
  reorderOnLoad: z.boolean().default(true),
  pruneStale: z.boolean().default(true),
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
}

/**
 * Namespace schema: the two ordered pinned id lists (newest pin first), the
 * two row-color maps, and the host policy mirrored into the user-editable
 * section defaults.
 */
const PinSchema = z.object({
  pinned: z.array(z.string()).default([]),
  workspacePinned: z.array(z.string()).default([]),
  colors: z.dict(z.string()).default({}),
  workspaceColors: z.dict(z.string()).default({}),
  maxPins: z.number().step(1).min(0).default(0),
  reorderOnLoad: z.boolean().default(true),
  pruneStale: z.boolean().default(true),
})

/**
 * Register the `session-pin` settings namespace. The policy fields ride the
 * composition base layer so the browser half reads them through the same
 * settings snapshot that carries the pinned ids and colors. `expose` declares
 * wire exposure (settings.* RPCs serve the namespace to browsers) on builds
 * whose settings service supports the option — the rc.6 baseline answers
 * `settings-not-exposed` and the browser half degrades to localStorage; the
 * cast crosses that version boundary once, at the call site.
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
      maxPins: config.maxPins,
      reorderOnLoad: config.reorderOnLoad,
      pruneStale: config.pruneStale,
    },
    applies: 'live' as const,
    expose: true,
  } as unknown as SettingsRegisterOptions<PinUserLayer & { maxPins: number; reorderOnLoad: boolean; pruneStale: boolean }>
  ctx.settings.register(settingsNamespace('session-pin'), PinSchema, options)
}
