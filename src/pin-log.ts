// SPDX-License-Identifier: Apache-2.0
/**
 * Log-backed canonical pin residence: the `session/pin` structured event, the
 * pure projection fold that rebuilds the canonical pin set from a session log,
 * and the ignorable-gated append seam that writes those events.
 *
 * This module is the plugin's canonical home for per-session pin state. It is
 * deliberately framework-free — no cordis, no DOM, and no `@deepseek-ai/*`
 * value import — so the fold and appender are deterministic, pure, and unit
 * testable from the host half and tests alike.
 *
 * Seam alignment: the `session/pin` event key and the `{ pinned, at }`
 * whole-value shape match the upstream `@deepseek-ai/dsh-session-pin` package
 * (which appends the event with `ignorable: true` and folds the `pin`
 * projection). The plugin extends that shape with the per-pin row color and
 * the owning workspace it needs; {@link normalizePinEventValue} accepts both
 * the upstream payload (session id supplied by the `session/event` carrier)
 * and the plugin's own full payload, so one fold reads either producer. On
 * builds that mount the upstream service, the upstream `pin` projection is the
 * canonical read; on builds without it, {@link foldPinEvents} reconstructs the
 * same state from the raw log and {@link PinLogAppender} self-builds the
 * events behind the `ignorable` envelope gate.
 *
 * @module dsh-session-pin/pin-log
 */

/** The log-only `session/pin` event type (seam-aligned with upstream). */
export const PIN_EVENT = 'session/pin' as const

/** Whole-value payload of one `session/pin` event (a superset of the upstream `SessionPinValue`). */
export interface PinLogValue {
  /** The session whose pin state this event commits. */
  readonly sessionId: string
  /** The complete post-change pin membership — never a delta. */
  readonly pinned: boolean
  /** Epoch-millis recency key ordering pins across sessions (carried for upstream seam alignment). */
  readonly at: number
  /** Post-change row color: a palette hex, `null` clears, `undefined` leaves the fold's color untouched. */
  readonly color?: string | null
  /** Owning workspace id at commit time (provenance for grouped ordering). */
  readonly workspace?: string
}

/** Narrow structural face of one logged session event (no `@deepseek-ai/dsh-session` import). */
export interface SessionEventLike {
  /** The event type discriminator. */
  readonly type: string
  /** Epoch-millis envelope timestamp. */
  readonly time?: number
  /** Log sequence number. */
  readonly seq?: number
  /** Event payload (structurally narrowed, never trusted at compile time). */
  readonly data?: unknown
  /** Whether the envelope carried the `ignorable` marker. */
  readonly ignorable?: boolean
}

/** Canonical pin projection: the folded pinned session ids plus per-session colors. */
export interface PinProjection {
  /** Ordered pinned session ids, newest pin first. */
  readonly pinned: string[]
  /** Session id → palette color. */
  readonly colors: Record<string, string>
}

/** Empty projection baseline. */
export function emptyPinProjection(): PinProjection {
  return { pinned: [], colors: {} }
}

/**
 * Whether a candidate payload is a complete plugin-format `PinLogValue`
 * (session id, boolean membership, and a finite recency key; color/workspace
 * optional). Upstream payloads that omit `sessionId` do NOT pass this guard —
 * normalize them first with {@link normalizePinEventValue}.
 * @param value - candidate event payload.
 * @returns true only for a well-formed plugin-format pin value.
 */
export function isPinLogValue(value: unknown): value is PinLogValue {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  if (typeof candidate.sessionId !== 'string' || candidate.sessionId.length === 0) return false
  if (typeof candidate.pinned !== 'boolean') return false
  if (typeof candidate.at !== 'number' || !Number.isFinite(candidate.at)) return false
  if (candidate.color !== undefined && candidate.color !== null && typeof candidate.color !== 'string') return false
  if (candidate.workspace !== undefined && (typeof candidate.workspace !== 'string' || candidate.workspace.length === 0)) return false
  return true
}

/**
 * Normalize one `session/pin` payload into a foldable {@link PinLogValue},
 * accepting both the plugin's own full payload and the upstream
 * `{ pinned, at }` payload whose session id comes from the carrier.
 * @param sessionId - the session the event belongs to (used when the payload omits it).
 * @param data - raw event payload.
 * @returns the normalized value, or undefined when membership is absent or malformed.
 */
export function normalizePinEventValue(sessionId: string, data: unknown): PinLogValue | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const candidate = data as Record<string, unknown>
  if (typeof candidate.pinned !== 'boolean') return undefined
  const id = typeof candidate.sessionId === 'string' && candidate.sessionId.length > 0 ? candidate.sessionId : sessionId
  if (id.length === 0) return undefined
  const at = typeof candidate.at === 'number' && Number.isFinite(candidate.at) ? candidate.at : 0
  const color = candidate.color === null || typeof candidate.color === 'string' ? candidate.color : undefined
  const workspace = typeof candidate.workspace === 'string' && candidate.workspace.length > 0 ? candidate.workspace : undefined
  return {
    sessionId: id,
    pinned: candidate.pinned,
    at,
    ...(color === undefined ? {} : { color }),
    ...(workspace === undefined ? {} : { workspace }),
  }
}

/**
 * Apply one validated pin value to the projection: pinning moves the session
 * to the front (newest pin first, matching the store's `[id, ...pinned]`
 * order) and unpinning removes it; a defined color sets the row color and a
 * null color clears it (an undefined color leaves it untouched, so pin toggles
 * never erase colors and color cycles never disturb membership).
 * @param state - projection covering all prior events.
 * @param value - the next committed whole-value pin state.
 * @returns the next projection.
 */
export function foldPinValue(state: PinProjection, value: PinLogValue): PinProjection {
  const rest = state.pinned.filter(id => id !== value.sessionId)
  const pinned = value.pinned ? [value.sessionId, ...rest] : rest
  const colors = { ...state.colors }
  if (value.color === null) delete colors[value.sessionId]
  else if (value.color !== undefined) colors[value.sessionId] = value.color
  return { pinned, colors }
}

/**
 * Fold one raw logged event: non-`session/pin` events return the same
 * reference, and a well-formed plugin-format pin event applies its value.
 * @param state - projection covering all prior events.
 * @param event - the next committed session event.
 * @returns the next projection (same reference for non-pin events).
 */
export function foldPinEvent(state: PinProjection, event: SessionEventLike): PinProjection {
  if (event.type !== PIN_EVENT) return state
  return isPinLogValue(event.data) ? foldPinValue(state, event.data) : state
}

/**
 * Rebuild the canonical pin set from a session log: folds every
 * `session/pin` event in order (last-wins per session, newest pin first).
 * @param events - live or persisted session log (plugin-format events).
 * @returns the folded projection.
 */
export function foldPinEvents(events: readonly SessionEventLike[]): PinProjection {
  return events.reduce((state, event) => foldPinEvent(state, event), emptyPinProjection())
}

/** Narrow append face of the upstream session (no `@deepseek-ai/dsh-session` import). */
export interface PinAppendFace {
  /** Append one log event, requesting the envelope's `ignorable` marker. */
  append(type: string, data: unknown, options?: { ignorable?: true }): unknown
}

/** Whether an `append` call honored the `ignorable` marker (the returned envelope carries it). */
export function isMarkedIgnorable(result: unknown): boolean {
  return typeof result === 'object' && result !== null && (result as { ignorable?: unknown }).ignorable === true
}

/**
 * Host-gated `session/pin` appender: requests the envelope's `ignorable: true`
 * marker so builds that do not know the type still read the log. On hosts
 * whose `append` drops the marker, the FIRST append is probed via its returned
 * envelope and further appends are disabled with a one-time warning so session
 * logs stay loadable everywhere. `allowUnmarked` opts back into unmarked
 * appends — deliberately dangerous — and append failures are contained so a
 * pin-log hiccup never disturbs the caller.
 */
export class PinLogAppender {
  private support: 'unknown' | 'supported' | 'unsupported' = 'unknown'
  private warned = false

  constructor(
    private readonly allowUnmarked: boolean,
    private readonly warn: (message: string) => void,
  ) {}

  /**
   * Append one log-only pin value, requesting the ignorable marker. Skipped
   * after a failed probe (and on any append throw) so the log stays loadable.
   * @param session - the session whose log carries the event.
   * @param value - the whole-value pin state to commit.
   */
  append(session: PinAppendFace, value: PinLogValue): void {
    if (!this.mayAppend()) return
    try {
      const result = (session.append as unknown as (t: string, d: unknown, o?: { ignorable?: true }) => unknown)(PIN_EVENT, value, { ignorable: true })
      this.probe(result)
    } catch (error) {
      this.warn(`session/pin append failed: ${String(error)}`)
    }
  }

  /** Whether the host is known to stamp the marker (or the dangerous opt-in is set). */
  private mayAppend(): boolean {
    return this.allowUnmarked || this.support !== 'unsupported'
  }

  /** After the first append on an unknown host, probe the returned envelope for the marker. */
  private probe(result: unknown): void {
    if (this.support !== 'unknown' || this.allowUnmarked) return
    this.support = isMarkedIgnorable(result) ? 'supported' : 'unsupported'
    if (this.support === 'unsupported') this.warnOnce()
  }

  /** One-time warning that pin appends were disabled to keep session logs loadable. */
  private warnOnce(): void {
    if (this.warned) return
    this.warned = true
    this.warn(
      'this host drops the ignorable marker on the session/pin event (Session.append predates it), which would make sessions unresumable on stricter harness builds — session/pin appends are disabled and the projection degrades to the settings cache',
    )
  }
}
