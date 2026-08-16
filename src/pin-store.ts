// SPDX-License-Identifier: Apache-2.0
/**
 * PinStore: the persistence adapter between the PinController and the two
 * durable stores — the Host-backed `session-pin` settings namespace (host
 * mode: settings RPCs round-trip to the Host document) and browser-local
 * storage (local mode: memory/unavailable settings — remote browsers and
 * builds whose web proxy does not serve the namespace — degrade to
 * per-browser persistence). Mode switches are re-evaluated on every read, so
 * a settings transport that (re-)connects adopts the Host store live.
 *
 * The stored document carries both pin levels (sessions and workspaces) and
 * both color maps. Cross-tab consistency in local mode rides the window
 * `storage` event: a write in another tab republishes through the subscribe
 * feed.
 * @module dsh-session-pin/pin-store
 */
import { decodeStoredPins, emptyStoredPins, encodeStoredPins, normalizeColors, normalizePins } from './pin-core.ts'
import { normalizeBoards, normalizeTags, normalizeViews, type BoardRegistry, type SavedView } from './navigator.ts'

/** Browser-local storage key (remote-browser fallback). */
export const STORAGE_KEY = 'dsh.session-pin.pinned'

/** Pin-section fields of the `session-pin` settings namespace. */
export interface PinSection {
  pinned?: string[]
  workspacePinned?: string[]
  colors?: Record<string, string>
  workspaceColors?: Record<string, string>
  maxPins?: number
  reorderOnLoad?: boolean
  pruneStale?: boolean
  /** Pin groups (boards) and their membership. */
  boards?: BoardRegistry
  /** Session/workspace id → tags. */
  tags?: Record<string, string[]>
  /** Saved filter views. */
  views?: SavedView[]
  /** Feature switches mirrored from the host Config base. */
  enableBoards?: boolean
  enableTags?: boolean
  enableViews?: boolean
  enableHealth?: boolean
  enableGoto?: boolean
}

/** One consistent read of the pin store. */
export interface PinStoreSnapshot {
  /** Normalized pinned session ids, newest pin first. */
  pinned: string[]
  /** Normalized pinned workspace ids, newest pin first. */
  workspacePinned: string[]
  /** Session id → palette color. */
  colors: Record<string, string>
  /** Workspace id → palette color. */
  workspaceColors: Record<string, string>
  /** Pin groups (boards) and their membership. */
  boards: BoardRegistry
  /** Session/workspace id → tags. */
  tags: Record<string, string[]>
  /** Saved filter views (newest last). */
  views: SavedView[]
  /** Whether persistence is browser-local (no Host settings transport). */
  local: boolean
  /** Pin-count limit visible in this mode (per level); 0 = unlimited. */
  maxPins: number
  /** Re-assert pinned order once the session/workspace lists are ready. */
  reorderOnLoad: boolean
  /** Drop pins for entities absent from a ready list (deleted/archived). */
  pruneStale: boolean
  /** Feature switches mirrored from the host Config base. */
  enableBoards: boolean
  enableTags: boolean
  enableViews: boolean
  enableHealth: boolean
  enableGoto: boolean
}

/** The settings-scope slice the store reads and writes through. */
export interface PinScope {
  getSnapshot(): {
    mode: 'host' | 'memory'
    status: 'loading' | 'ready' | 'unavailable'
    value?: PinSection
  }
  subscribe(listener: () => void): () => void
  set(field: string, value: unknown): Promise<void>
}

/** Synchronous browser-local key/value storage (localStorage face). */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Storage event face (window `storage` events for cross-tab sync). */
export interface StorageEventLike {
  key: string | null
}

/** Event-target slice for storage events. */
export interface StorageEventsLike {
  addEventListener(type: 'storage', listener: (event: StorageEventLike) => void): void
  removeEventListener(type: 'storage', listener: (event: StorageEventLike) => void): void
}

/** Read/write/subscribe face the controller consumes. */
export interface PinStore {
  read(): PinStoreSnapshot
  /** Merge a partial section write (host mode: per-field settings RPCs). */
  write(section: Partial<PinSection>): void | Promise<void>
  subscribe(listener: () => void): () => void
}

/** Whether the settings transport cannot carry this namespace to the Host. */
function isLocalMode(scope: PinScope): boolean {
  const snapshot = scope.getSnapshot()
  return snapshot.mode === 'memory' || snapshot.status === 'unavailable'
}

/**
 * Build the pin store over one settings scope and one browser-local storage.
 * @param scope - bound `session-pin` settings scope.
 * @param storage - browser-local key/value storage.
 * @param storageEvents - window storage-event source.
 * @returns the store face.
 */
export function createPinStore(scope: PinScope, storage: StorageLike, storageEvents: StorageEventsLike): PinStore {
  const readLocal = (): {
    pinned: string[]
    workspacePinned: string[]
    colors: Record<string, string>
    workspaceColors: Record<string, string>
    boards: BoardRegistry
    tags: Record<string, string[]>
    views: SavedView[]
  } => {
    try {
      return decodeStoredPins(JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]'))
    } catch {
      return emptyStoredPins()
    }
  }

  const snapshot = (): PinStoreSnapshot => {
    if (isLocalMode(scope)) {
      // Remote browsers cannot read the Host base layer (settings RPCs are
      // loopback-only): unlimited limit and default policy until the
      // transport carries the namespace again.
      return {
        ...readLocal(),
        local: true,
        maxPins: 0,
        reorderOnLoad: true,
        pruneStale: true,
        enableBoards: true,
        enableTags: true,
        enableViews: true,
        enableHealth: true,
        enableGoto: true,
      }
    }
    const value = scope.getSnapshot().value
    return {
      pinned: normalizePins(value?.pinned ?? []),
      workspacePinned: normalizePins(value?.workspacePinned ?? []),
      colors: normalizeColors(value?.colors ?? {}),
      workspaceColors: normalizeColors(value?.workspaceColors ?? {}),
      boards: normalizeBoards(value?.boards),
      tags: normalizeTags(value?.tags),
      views: normalizeViews(value?.views),
      local: false,
      maxPins: value?.maxPins ?? 0,
      reorderOnLoad: value?.reorderOnLoad ?? true,
      pruneStale: value?.pruneStale ?? true,
      enableBoards: value?.enableBoards ?? true,
      enableTags: value?.enableTags ?? true,
      enableViews: value?.enableViews ?? true,
      enableHealth: value?.enableHealth ?? true,
      enableGoto: value?.enableGoto ?? true,
    }
  }

  return {
    read: snapshot,
    write(section) {
      if (isLocalMode(scope)) {
        const doc = readLocal()
        if (section.pinned !== undefined) doc.pinned = normalizePins(section.pinned)
        if (section.workspacePinned !== undefined) doc.workspacePinned = normalizePins(section.workspacePinned)
        if (section.colors !== undefined) doc.colors = normalizeColors(section.colors)
        if (section.workspaceColors !== undefined) doc.workspaceColors = normalizeColors(section.workspaceColors)
        if (section.boards !== undefined) doc.boards = normalizeBoards(section.boards)
        if (section.tags !== undefined) doc.tags = normalizeTags(section.tags)
        if (section.views !== undefined) doc.views = normalizeViews(section.views)
        try {
          storage.setItem(STORAGE_KEY, encodeStoredPins(doc))
        } catch {
          /* private mode / disabled storage: pinning degrades to session-lifetime */
        }
        return
      }
      // Host mode: the settings transport carries each field separately.
      const writes: Array<Promise<void>> = []
      for (const [field, value] of Object.entries(section)) writes.push(scope.set(field, value))
      return Promise.all(writes).then(() => undefined)
    },
    subscribe(listener) {
      const disposeScope = scope.subscribe(listener)
      const onStorage = (event: StorageEventLike): void => {
        // null key = clear() swept the whole storage; republish either way.
        if (event.key === null || event.key === STORAGE_KEY) listener()
      }
      storageEvents.addEventListener('storage', onStorage)
      return () => {
        storageEvents.removeEventListener('storage', onStorage)
        disposeScope()
      }
    },
  }
}
