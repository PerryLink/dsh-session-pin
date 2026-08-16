// SPDX-License-Identifier: Apache-2.0
/**
 * The session navigation organizer: boards (pin groups), session tags and
 * saved filter views, per-session health summaries, and `/goto` matching.
 * Everything here is a deterministic transform — no DOM, no cordis, no I/O —
 * shared by the store, the controller, and the unit tests. Persistence rides
 * the existing pin store envelope (v3); nothing here ever touches the network.
 * @module dsh-session-pin/navigator
 */

/** Hard caps (protocol constants, not deployment tunables). */
export const MAX_BOARDS = 24
export const MAX_BOARD_NAME = 32
export const MAX_TAGS_PER_ENTITY = 8
export const MAX_TAG_LENGTH = 24
export const MAX_VIEWS = 20
export const MAX_GOTO_MATCHES = 10

/** One board (a named pin group). */
export interface BoardRecord {
  /** Display name (trimmed, 1..32 chars). */
  readonly name: string
  /** Stable ordering key (creation order). */
  readonly order: number
}

/** The complete board registry. */
export interface BoardRegistry {
  /** boardId → board record. */
  readonly byId: Record<string, BoardRecord>
  /** pin id (session or workspace) → board id. */
  readonly membership: Record<string, string>
}

/** One saved filter view. */
export interface SavedView {
  /** View id (kebab-case). */
  readonly id: string
  /** Display name (trimmed, 1..32 chars). */
  readonly name: string
  /** Text quick filter ('' = none). */
  readonly text: string
  /** Tag filters (any-match). */
  readonly tags: readonly string[]
  /** Board filter (undefined = all boards). */
  readonly board?: string
}

/** One filterable sidebar entry (a pinned entity with its metadata). */
export interface NavEntry {
  /** Entity id (session or workspace). */
  readonly id: string
  /** Display title. */
  readonly name: string
  /** Entity tags. */
  readonly tags: readonly string[]
  /** Board id, or undefined when ungrouped. */
  readonly boardId?: string
}

/** Active filter state (the panel's filter bar + the saved-view projection). */
export interface NavFilter {
  /** Text quick filter ('' = none). */
  readonly text: string
  /** Tag filters (any-match). */
  readonly tags: readonly string[]
  /** Board filter (undefined = all boards). */
  readonly board?: string
}

/** Minimal session-event face for the health summary (no DSH imports). */
export interface HealthEventFace {
  /** Event type discriminator ('user/message', 'assistant/message', …). */
  readonly type: string
  /** Event timestamp (epoch ms). */
  readonly time: number
}

/** One per-pinned-session health summary (read-only, sanitized). */
export interface HealthSummary {
  /** Epoch ms of the last event, or null when the log is empty. */
  readonly lastActivity: number | null
  /** Count of user + assistant messages. */
  readonly messages: number
  /** Direction of the last message, or null when there are none. */
  readonly lastDirection: 'user' | 'assistant' | null
}

/** Validate and normalize a board name; throws on the first violation. */
export function validateBoardName(name: string): string {
  const trimmed = name.trim()
  if (trimmed === '' || trimmed.length > MAX_BOARD_NAME) {
    throw new Error(`board name must be 1..${MAX_BOARD_NAME} characters after trimming`)
  }
  return trimmed
}

/** Normalize an unknown board registry (settings wire or storage JSON). */
export function normalizeBoards(value: unknown): BoardRegistry {
  const byId: Record<string, BoardRecord> = {}
  const membership: Record<string, string> = {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { byId, membership }
  const candidate = value as { byId?: unknown; membership?: unknown }
  if (typeof candidate.byId === 'object' && candidate.byId !== null) {
    for (const [id, raw] of Object.entries(candidate.byId as Record<string, unknown>)) {
      if (raw === null || typeof raw !== 'object') continue
      const record = raw as { name?: unknown; order?: unknown }
      if (typeof record.name !== 'string' || record.name.trim() === '' || typeof record.order !== 'number') continue
      byId[id] = { name: record.name.trim().slice(0, MAX_BOARD_NAME), order: record.order }
    }
  }
  if (typeof candidate.membership === 'object' && candidate.membership !== null) {
    for (const [pinId, boardId] of Object.entries(candidate.membership as Record<string, unknown>)) {
      if (typeof boardId === 'string' && byId[boardId] !== undefined) membership[pinId] = boardId
    }
  }
  return { byId, membership }
}

/** Empty board registry. */
export function emptyBoards(): BoardRegistry {
  return { byId: {}, membership: {} }
}

/**
 * Create a board (or rename it when the id exists) and return the next
 * registry. Creation beyond {@link MAX_BOARDS} fails loudly.
 * @param boards - current registry.
 * @param id - stable board id (kebab-case).
 * @param name - display name.
 * @returns the next registry.
 */
export function upsertBoard(boards: BoardRegistry, id: string, name: string): BoardRegistry {
  const trimmed = validateBoardName(name)
  const existing = boards.byId[id]
  if (existing === undefined && Object.keys(boards.byId).length >= MAX_BOARDS) {
    throw new Error(`at most ${MAX_BOARDS} boards`)
  }
  const nextOrder = existing?.order ?? nextOrderOf(boards)
  return {
    byId: { ...boards.byId, [id]: { name: trimmed, order: nextOrder } },
    membership: boards.membership,
  }
}

/** Remove a board; its pins fall back to the ungrouped section. */
export function removeBoard(boards: BoardRegistry, id: string): BoardRegistry {
  const byId = { ...boards.byId }
  delete byId[id]
  const membership: Record<string, string> = {}
  for (const [pinId, boardId] of Object.entries(boards.membership)) {
    if (boardId !== id) membership[pinId] = boardId
  }
  return { byId, membership }
}

/** Assign one pin to a board (boardId '' = ungrouped). */
export function assignPinToBoard(boards: BoardRegistry, pinId: string, boardId: string): BoardRegistry {
  const membership = { ...boards.membership }
  if (boardId === '') delete membership[pinId]
  else if (boards.byId[boardId] !== undefined) membership[pinId] = boardId
  return { byId: boards.byId, membership }
}

/** The board a pin belongs to, or undefined when ungrouped. */
export function boardOf(boards: BoardRegistry, pinId: string): string | undefined {
  return boards.membership[pinId]
}

/** Next creation order (max existing + 1). */
function nextOrderOf(boards: BoardRegistry): number {
  let max = -1
  for (const record of Object.values(boards.byId)) max = Math.max(max, record.order)
  return max + 1
}

/** Normalize an unknown id→tags map (tags trimmed, deduped, capped). */
export function normalizeTags(value: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return out
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(raw)) continue
    const tags: string[] = []
    const seen = new Set<string>()
    for (const item of raw) {
      if (typeof item !== 'string') continue
      const tag = item.trim().slice(0, MAX_TAG_LENGTH)
      if (tag === '' || seen.has(tag)) continue
      seen.add(tag)
      tags.push(tag)
    }
    if (tags.length > 0) out[id] = tags.slice(0, MAX_TAGS_PER_ENTITY)
  }
  return out
}

/** Set one entity's tags (empty list removes the entry). */
export function setEntityTags(tags: Record<string, string[]>, id: string, next: readonly string[]): Record<string, string[]> {
  const normalized = normalizeTags({ [id]: next })[id] ?? []
  const out = { ...tags }
  if (normalized.length === 0) delete out[id]
  else out[id] = normalized
  return out
}

/** Normalize an unknown view list. */
export function normalizeViews(value: unknown): SavedView[] {
  if (!Array.isArray(value)) return []
  const out: SavedView[] = []
  for (const raw of value) {
    if (raw === null || typeof raw !== 'object') continue
    const record = raw as Record<string, unknown>
    if (typeof record.id !== 'string' || record.id === '' || typeof record.name !== 'string' || record.name.trim() === '') continue
    const tags = Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, MAX_TAGS_PER_ENTITY) : []
    out.push({
      id: record.id,
      name: record.name.trim().slice(0, MAX_BOARD_NAME),
      text: typeof record.text === 'string' ? record.text : '',
      tags,
      ...typeof record.board === 'string' && record.board !== '' ? { board: record.board } : {},
    })
  }
  return out.slice(0, MAX_VIEWS)
}

/** Save a view (same id replaces); the list caps at {@link MAX_VIEWS} (newest kept). */
export function saveView(views: readonly SavedView[], view: SavedView): SavedView[] {
  const next = views.filter(item => item.id !== view.id)
  next.push(view)
  return next.slice(-MAX_VIEWS)
}

/**
 * Filter sidebar entries: case-insensitive substring over the title, any-match
 * over tags, exact board match. An empty filter lists everything.
 * @param entries - the pinned entities with their metadata.
 * @param filter - the active filter state.
 * @returns matching entries in input order.
 */
export function filterEntries(entries: readonly NavEntry[], filter: NavFilter): NavEntry[] {
  const needle = filter.text.toLowerCase()
  return entries.filter((entry) => {
    if (filter.board !== undefined && entry.boardId !== filter.board) return false
    if (needle !== '' && !entry.name.toLowerCase().includes(needle)) return false
    if (filter.tags.length > 0 && !filter.tags.some(tag => entry.tags.includes(tag))) return false
    return true
  })
}

/**
 * The per-session health summary: last activity time, message count, and the
 * direction of the last message. Reads only the given event faces — callers
 * extract them from the public session snapshot; nothing is written.
 * @param events - session events, oldest first.
 * @returns the summary (all-null/zero for an empty log).
 */
export function summarizeHealth(events: readonly HealthEventFace[]): HealthSummary {
  let lastActivity: number | null = null
  let messages = 0
  let lastDirection: 'user' | 'assistant' | null = null
  for (const event of events) {
    if (typeof event.time === 'number' && Number.isFinite(event.time)) {
      lastActivity = lastActivity === null ? event.time : Math.max(lastActivity, event.time)
    }
    if (event.type === 'user/message') {
      messages += 1
      lastDirection = 'user'
    } else if (event.type === 'assistant/message') {
      messages += 1
      lastDirection = 'assistant'
    }
  }
  return { lastActivity, messages, lastDirection }
}

/**
 * Fuzzy `/goto` matching: case-insensitive substring over the title and every
 * tag. Results cap at {@link MAX_GOTO_MATCHES}.
 * @param entries - the listed sessions (id, name, tags).
 * @param keyword - the search text.
 * @returns matching entries in input order ('' matches nothing).
 */
export function gotoMatches(entries: readonly NavEntry[], keyword: string): NavEntry[] {
  const needle = keyword.trim().toLowerCase()
  if (needle === '') return []
  return entries.filter(entry =>
    entry.name.toLowerCase().includes(needle) || entry.tags.some(tag => tag.toLowerCase().includes(needle))).slice(0, MAX_GOTO_MATCHES)
}

/**
 * Sanitize a health label for display: strip control characters and cap the
 * length (the summary is read-only and never carries raw log content).
 * @param text - the raw label.
 * @returns the sanitized label.
 */
export function sanitizeLabel(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200)
}
