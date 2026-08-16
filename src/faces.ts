// SPDX-License-Identifier: Apache-2.0
/**
 * Narrow structural faces crossing the plugin's own module boundaries
 * (controller ↔ overlay ↔ slot components ↔ browser glue). They exist so the
 * framework-free modules stay testable without the deepseek client types
 * and the glue performs the one branded-id adaptation per boundary.
 * @module dsh-session-pin/faces
 */

/** Outcome of one pin commit attempt. */
export type PinToggleResult = 'pinned' | 'unpinned' | 'limit'

/**
 * Pin-state read/write face the UI consumes: two pin levels (sessions and
 * workspaces) plus the per-level row-color maps.
 */
export interface PinReadFace {
  getPinned(): readonly string[]
  isPinned(id: string): boolean
  getWorkspacePinned(): readonly string[]
  isWorkspacePinned(id: string): boolean
  getMaxPins(): number
  /** Toggle one session id's membership (store-truth based). */
  toggle(id: string): Promise<PinToggleResult>
  /** Commit an explicit next session-pin state (projection-aware callers use this). */
  setPinned(id: string, next: boolean): Promise<PinToggleResult>
  /** Toggle one workspace id's membership (store-truth based). */
  toggleWorkspace(id: string): Promise<PinToggleResult>
  /** Commit an explicit next workspace-pin state. */
  setWorkspacePinned(id: string, next: boolean): Promise<PinToggleResult>
  /** Stored row color of one session, or undefined. */
  getColor(id: string): string | undefined
  /** Stored row color of one workspace, or undefined. */
  getWorkspaceColor(id: string): string | undefined
  /** Advance one session's color to the next palette step (wraps to none). */
  cycleColor(id: string): Promise<void>
  /** Advance one workspace's color to the next palette step (wraps to none). */
  cycleWorkspaceColor(id: string): Promise<void>
  /** Remove one session's color. */
  clearColor(id: string): Promise<void>
  /** Remove one workspace's color. */
  clearWorkspaceColor(id: string): Promise<void>
  /** The board registry (pin groups + membership). */
  getBoards(): import('./navigator.ts').BoardRegistry
  /** The id → tags map. */
  getTags(): Record<string, string[]>
  /** The saved filter views, newest last. */
  getViews(): readonly import('./navigator.ts').SavedView[]
  subscribe(listener: () => void): () => void
}

/**
 * Optional log-backed write channel (the upstream `session.setPinned` RPC).
 * Absent on baselines without it; a failing remote disables itself until the
 * next connection generation re-enables it. Workspace pins and colors never
 * ride this channel — they are plugin-local state.
 */
export interface PinRemoteLike {
  setPinned(id: string, pinned: boolean): Promise<{ ok: true } | { ok: false }>
  reenable(): void
}

/** Sessions-list slice the UI reads (ids are plain strings at this boundary). */
export interface SessionListFace {
  getSnapshot(): {
    phase: string
    ids: readonly string[]
    byId: Record<string, { displayTitle: string; blank: boolean } | undefined>
  }
  subscribe(listener: () => void): () => void
}

/** Workspaces-list slice the UI reads (ids and labels as plain strings). */
export interface WorkspaceListFace {
  getSnapshot(): {
    phase: string
    items: readonly { workspaceId: string; title: string }[]
  }
  subscribe(listener: () => void): () => void
}

/** Dictionary keys of the plugin's `session-pin` locale namespace. */
export type PinKey =
  | 'pin'
  | 'unpin'
  | 'limit'
  | 'pinWorkspace'
  | 'unpinWorkspace'
  | 'limitWorkspace'
  | 'colorChange'
  | 'panelTitle'
  | 'panelEmpty'
  | 'panelSessions'
  | 'panelWorkspaces'
  | 'footerTitle'

/** Translate one plugin dictionary key (bound locale or English fallback). */
export type PinTranslate = (key: PinKey) => string

/** Open/close state of the pinned-sessions panel (tiny observable). */
export interface PinUiState {
  getSnapshot(): { open: boolean }
  subscribe(listener: () => void): () => void
  setOpen(open: boolean): void
  toggle(): void
}
