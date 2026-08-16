// SPDX-License-Identifier: Apache-2.0
/**
 * Pure pin-set logic shared by the host half, the browser half, the
 * controller, and the unit tests. No DOM, no cordis, no I/O: everything here
 * is a deterministic transform. Two pin levels share this module — sessions
 * and workspaces — plus the preset row-color palette the swatch button cycles.
 * @module dsh-session-pin/pin-core
 */

/** Preset row-color palette cycled by the swatch button (the only values the store accepts). */
export const PIN_COLOR_PALETTE = [
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#0ea5e9', // sky
  '#6366f1', // indigo
  '#a855f7', // purple
  '#ec4899', // pink
] as const

/** One palette hex literal. */
export type PinColorHex = (typeof PIN_COLOR_PALETTE)[number]

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
 * @param id - entity id to pin or unpin.
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
 * Resolve the anchor for moving one pinned entity to the top of its ordered
 * list (insert-before semantics).
 * @param orderedIds - the ordered ids of one account/list.
 * @param id - the entity to move.
 * @returns the id to insert before, or undefined when the entity is already
 * first or absent from the list.
 */
export function topAnchor(orderedIds: readonly string[], id: string): string | undefined {
  const index = orderedIds.indexOf(id)
  if (index <= 0) return undefined
  return orderedIds[0]
}

// ── Row colors ────────────────────────────────────────────────────────────

/** Whether a candidate value is one of the preset palette hexes. */
export function isPaletteColor(value: unknown): value is PinColorHex {
  return typeof value === 'string' && (PIN_COLOR_PALETTE as readonly string[]).includes(value)
}

/**
 * Normalize an unknown id→color map: non-empty string keys only, values kept
 * only when they are preset palette hexes (the row tint is class-based, so
 * arbitrary values could not render and would only diverge the store).
 * @param value - candidate color map from the settings wire or storage.
 * @returns the normalized map.
 */
export function normalizeColors(value: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return out
  for (const [key, color] of Object.entries(value as Record<string, unknown>)) {
    if (key.length === 0 || !isPaletteColor(color)) continue
    out[key] = color
  }
  return out
}

/**
 * Palette index of a stored color (for the `data-color="cN"` class hook), or
 * undefined when the row has no color.
 * @param color - stored color or nothing.
 * @returns the zero-based palette index.
 */
export function colorClassIndex(color: string | null | undefined): number | undefined {
  if (color === null || color === undefined) return undefined
  const index = (PIN_COLOR_PALETTE as readonly string[]).indexOf(color)
  return index === -1 ? undefined : index
}

/**
 * The swatch cycle: none → palette[0] → palette[1] → … → none. Unknown values
 * restart at palette[0]; null means "no color".
 * @param current - current stored color, or nothing.
 * @returns the next color, or null when the cycle leaves the palette (clear).
 */
export function nextPaletteColor(current: string | null | undefined): string | null {
  if (typeof current !== 'string') return PIN_COLOR_PALETTE[0]
  const index = (PIN_COLOR_PALETTE as readonly string[]).indexOf(current)
  if (index === -1) return PIN_COLOR_PALETTE[0]
  return index + 1 < PIN_COLOR_PALETTE.length ? PIN_COLOR_PALETTE[index + 1]! : null
}

/**
 * Convert a `#rrggbb` hex to an `rgba()` literal (for the generated tint CSS).
 * @param hex - palette hex.
 * @param alpha - 0..1 alpha.
 * @returns the rgba literal, or 'transparent' for malformed input.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex)
  if (match === null) return 'transparent'
  const n = Number.parseInt(match[1]!, 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  return `rgba(${r},${g},${b},${alpha})`
}

// ── Browser-local storage envelope ────────────────────────────────────────

/** The complete pin document the browser-local store persists (v2). */
export interface StoredPinsDoc {
  /** Normalized pinned session ids, newest pin first. */
  pinned: string[]
  /** Normalized pinned workspace ids, newest pin first. */
  workspacePinned: string[]
  /** Session id → palette color. */
  colors: Record<string, string>
  /** Workspace id → palette color. */
  workspaceColors: Record<string, string>
}

/** Empty document baseline. */
export function emptyStoredPins(): StoredPinsDoc {
  return { pinned: [], workspacePinned: [], colors: {}, workspaceColors: {} }
}

/** Versioned browser-local storage envelope (v2). */
export interface StoredPinsV2 extends StoredPinsDoc {
  /** Envelope version discriminator. */
  v: 2
}

/**
 * Encode the pin document for browser-local storage. Always writes the
 * versioned envelope so future format changes can migrate.
 * @param doc - the normalized pin document.
 * @returns the JSON document to store.
 */
export function encodeStoredPins(doc: StoredPinsDoc): string {
  const payload: StoredPinsV2 = {
    v: 2,
    pinned: [...doc.pinned],
    workspacePinned: [...doc.workspacePinned],
    colors: { ...doc.colors },
    workspaceColors: { ...doc.workspaceColors },
  }
  return JSON.stringify(payload)
}

/**
 * Decode a stored pin document: the v2 envelope, the v1 envelope (session
 * pins only), or a legacy bare string array from pre-envelope versions.
 * Malformed input yields the empty document.
 * @param value - parsed JSON from browser-local storage.
 * @returns the normalized pin document.
 */
export function decodeStoredPins(value: unknown): StoredPinsDoc {
  const empty = emptyStoredPins()
  if (Array.isArray(value)) return { ...empty, pinned: normalizePins(value) }
  if (typeof value === 'object' && value !== null) {
    const candidate = value as {
      v?: unknown
      pinned?: unknown
      workspacePinned?: unknown
      colors?: unknown
      workspaceColors?: unknown
    }
    if (candidate.v === 1 && Array.isArray(candidate.pinned)) {
      return { ...empty, pinned: normalizePins(candidate.pinned) }
    }
    if (candidate.v === 2) {
      return {
        pinned: normalizePins(candidate.pinned),
        workspacePinned: normalizePins(candidate.workspacePinned),
        colors: normalizeColors(candidate.colors),
        workspaceColors: normalizeColors(candidate.workspaceColors),
      }
    }
  }
  return empty
}

/**
 * Drop ids absent from the authoritative live set (deleted or archived
 * entities no longer listed), preserving order.
 * @param pinned - normalized pinned ids.
 * @param liveIds - the ids a ready list currently contains.
 * @returns the pruned list.
 */
export function prunePins(pinned: readonly string[], liveIds: ReadonlySet<string>): string[] {
  return pinned.filter(id => liveIds.has(id))
}

/**
 * Drop color entries whose ids are absent from the live set (colors ride
 * entity lifetime; unpinning alone never clears a color).
 * @param colors - normalized id→color map.
 * @param liveIds - the ids a ready list currently contains.
 * @returns the pruned map.
 */
export function pruneColors(colors: Record<string, string>, liveIds: ReadonlySet<string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [id, color] of Object.entries(colors)) {
    if (liveIds.has(id)) out[id] = color
  }
  return out
}

/**
 * Plan the moves that re-assert one ordered list's pinned prefix: pinned
 * entities must sit at the list front in pin-recency order (newest pin
 * first). Returns ids to move, oldest pin first, so sequential
 * insert-before-front calls end with the newest pin first. Empty when the
 * front already matches, or no pinned id lives in the list.
 * @param orderedIds - the ordered ids of one list.
 * @param pinned - normalized pinned ids, newest pin first.
 * @returns ids to move, oldest pin first.
 */
export function reorderMoves(orderedIds: readonly string[], pinned: readonly string[]): string[] {
  const present = pinned.filter(id => orderedIds.includes(id))
  if (present.length === 0) return []
  // The list head must be exactly the pinned prefix in pin order.
  const head = orderedIds.slice(0, present.length)
  const inOrder = head.length === present.length
    && head.every((id, index) => id === present[index])
  if (inOrder) return []
  return [...present].reverse()
}
