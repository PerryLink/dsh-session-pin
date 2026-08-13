/**
 * Pure pin-set logic shared by both halves and the unit tests. No DOM, no
 * cordis, no I/O: everything here is a deterministic transform.
 * @module @dsh-external/dsh-session-pin/pin-core
 */

/**
 * Normalize an unknown pin list (settings wire value or localStorage JSON):
 * strings only, deduplicated, first occurrence order.
 * @param value - candidate pinned ids.
 * @returns the normalized id list, or an empty list for malformed input.
 */
export function normalizePins(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of value) {
    if (typeof item !== 'string' || item.length === 0 || seen.has(item)) continue
    seen.add(item)
    out.push(item)
  }
  return out
}

/**
 * Toggle one id's membership in the pin list.
 * @param pinned - current normalized pin list.
 * @param id - session id to pin or unpin.
 * @param maxPins - maximum pinned count; 0 means unlimited. Unpinning always
 * succeeds; pinning beyond the limit returns null.
 * @returns the next pin list (newly pinned ids go to the front), or null when
 * the pin would exceed the limit.
 */
export function togglePin(pinned: readonly string[], id: string, maxPins = 0): string[] | null {
  const without = pinned.filter(item => item !== id)
  if (without.length !== pinned.length) return without
  if (maxPins > 0 && pinned.length >= maxPins) return null
  return [id, ...pinned]
}

/**
 * Resolve the anchor for moving one pinned session to the top of its
 * workspace account (insert-before semantics).
 * @param sessionIds - the workspace account's ordered session ids.
 * @param id - the session to move.
 * @returns the id to insert before, or undefined when the session is already
 * first or absent from the account.
 */
export function topAnchor(sessionIds: readonly string[], id: string): string | undefined {
  const index = sessionIds.indexOf(id)
  if (index <= 0) return undefined
  return sessionIds[0]
}
