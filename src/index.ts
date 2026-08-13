/**
 * Host half of the dual-face session-pin plugin: registers the durable
 * `session-pin` settings namespace whose user layer holds the pinned session
 * ids. The browser half reads and writes that section through the standard
 * `settings.*` loopback RPCs, so this half owns no runtime behavior beyond
 * the registration and the `maxPins` composition base.
 *
 * TODO(plugin): the canonical DSH residence for per-session UI metadata is a
 * log-backed `session/pin` event (like `session/title`); fold pinned ids from
 * the logs once a client-readable channel for plugin-owned projections
 * exists. Until then the settings namespace is the durable store.
 * @module @dsh-external/dsh-session-pin
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'

export const name = 'session-pin'

export const inject = ['settings']

/** Required host policy; 0 means unlimited pins. */
export type Config = {
  /** Maximum pinned sessions; pinning beyond this count is rejected in the browser half. */
  maxPins: number
}

export const Config: z<Config> = z.object({
  maxPins: z.number().step(1).min(0).default(0),
})

/** Namespace schema: the ordered pinned session ids and the pin-count limit. */
const PinSchema = z.object({
  pinned: z.array(z.string()).default([]),
  maxPins: z.number().step(1).min(0).default(0),
})

/**
 * Register the `session-pin` settings namespace. `maxPins` rides the
 * composition base layer so the browser half reads the limit through the
 * same settings snapshot that carries the pinned ids.
 * @param ctx - harness context exposing the settings service.
 * @param config - pin-count limit from the cordis.yml row (defaults to unlimited).
 */
export function apply(ctx: Context, config: Config): void {
  ctx.settings.register(settingsNamespace('session-pin'), PinSchema, {
    base: { pinned: [], maxPins: config.maxPins },
    applies: 'live',
  })
}
