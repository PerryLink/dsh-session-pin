// SPDX-License-Identifier: Apache-2.0
/**
 * PinController: the framework-free state machine over the two-level pinned
 * set (sessions and workspaces) and the per-level row-color maps. It owns the
 * state transitions the browser UI triggers (explicit set / toggle, color
 * cycle / clear, and the list-ready lifecycle: stale-pin pruning plus the
 * re-assertion of pinned order) and republishes a subscription feed for every
 * consumer (DOM overlay, slot components, tests). Persistence lives in the
 * injected {@link PinStore}; ordering in the injected {@link PinReorderer};
 * the sessions/workspaces lists in the injected sources; the optional
 * log-backed write channel (session pins only) in the injected
 * {@link PinRemoteLike} — all narrow structural faces, so no cordis or DOM
 * type reaches this module.
 *
 * Write precedence: when the remote (upstream `session.setPinned` RPC) is
 * present, session-pin commits go through it first — the session log is the
 * canonical residence — and the store write mirrors the commit so the ordered
 * list, panel, and reordering stay consistent. A failing remote self-disables
 * and the store takes over; `connection/reset` re-enables it. Workspace pins
 * and both color maps are plugin-local state and always write to the store.
 * @module dsh-session-pin/pin-controller
 */
import { nextPaletteColor, normalizePins, pruneColors, prunePins } from './pin-core.ts'
import type { PinRemoteLike } from './faces.ts'
import type { PinStore, PinStoreSnapshot } from './pin-store.ts'

/** The ready phase of the sessions list (pruning and initial reorder gate). */
const LIST_READY = 'ready'

/** Sessions-list slice the controller reads (phase + authoritative ids). */
export interface PinListSource {
  getSnapshot(): { phase: string; ids: readonly string[] }
  subscribe(listener: () => void): () => void
}

/** Workspaces-list slice the controller reads (phase + authoritative ids). */
export interface PinWorkspaceSource {
  getSnapshot(): { phase: string; ids: readonly string[] }
  subscribe(listener: () => void): () => void
}

/** Ordering sinks (the browser glue wraps `ctx.workspaces`). */
export interface PinReorderer {
  /**
   * Move one pinned session to the front of its workspace account. A no-op
   * when the session is ungrouped or already first.
   * @param id - session id to move.
   */
  moveToTop(id: string): Promise<void>
  /**
   * Re-assert every pinned session's front position in pin order. Must be
   * idempotent (no-op when the front already matches), so repeated calls on
   * workspace-list changes cannot loop.
   * @param pinned - normalized pinned ids, newest pin first.
   */
  reapplyOrder(pinned: readonly string[]): void
  /**
   * Move one pinned workspace to the front of the workspace list.
   * @param id - workspace id to move.
   */
  moveWorkspaceToTop(id: string): Promise<void>
  /**
   * Re-assert the pinned workspace prefix (newest pin first), idempotently.
   * @param pinned - normalized pinned workspace ids, newest pin first.
   */
  reapplyWorkspaceOrder(pinned: readonly string[]): void
}

/** Outcome of one commit attempt. */
export type PinToggleResult = 'pinned' | 'unpinned' | 'limit'

/**
 * The controller. Construction resolves the first store snapshot;
 * {@link start} subscribes and flushes the lifecycle hooks.
 */
export class PinController {
  private snapshot: PinStoreSnapshot
  private readonly listeners = new Set<() => void>()
  private readonly disposers: Array<() => void> = []
  private started = false

  constructor(
    private readonly store: PinStore,
    private readonly list: PinListSource,
    private readonly workspaceList: PinWorkspaceSource,
    private readonly reorderer: PinReorderer,
    private readonly remote?: PinRemoteLike,
  ) {
    this.snapshot = store.read()
  }

  /** Subscribe the store and list feeds and run the initial refresh. Idempotent. */
  start(): void {
    if (this.started) return
    this.started = true
    this.disposers.push(
      this.store.subscribe(() => this.refresh()),
      this.list.subscribe(() => this.onListChange()),
      this.workspaceList.subscribe(() => this.onWorkspaceListChange()),
    )
    this.refresh()
    this.onListChange()
    this.onWorkspaceListChange()
  }

  /** Dispose every subscription; the controller becomes inert. */
  stop(): void {
    for (const dispose of this.disposers.splice(0)) dispose()
    this.listeners.clear()
    this.started = false
  }

  /**
   * Subscribe to pin/color-state changes.
   * @param listener - invoked after each adopted or refreshed state.
   * @returns the unsubscribe function.
   */
  // Arrow property, not a prototype method: slot components hand
  // `pin.subscribe` to React's useSyncExternalStore, which invokes it
  // unbound — a method body would lose `this` and crash on the first render.
  readonly subscribe = (listener: () => void): () => void => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** The normalized pinned session ids, newest pin first (stable reference between changes). */
  getPinned(): readonly string[] {
    return this.snapshot.pinned
  }

  /** Whether one session id is currently pinned. */
  isPinned(id: string): boolean {
    return this.snapshot.pinned.includes(id)
  }

  /** The normalized pinned workspace ids, newest pin first (stable reference between changes). */
  getWorkspacePinned(): readonly string[] {
    return this.snapshot.workspacePinned
  }

  /** Whether one workspace id is currently pinned. */
  isWorkspacePinned(id: string): boolean {
    return this.snapshot.workspacePinned.includes(id)
  }

  /** The pin-count limit in force, per level (0 = unlimited). */
  getMaxPins(): number {
    return this.snapshot.maxPins
  }

  /** Stored row color of one session, or undefined. */
  getColor(id: string): string | undefined {
    return this.snapshot.colors[id]
  }

  /** Stored row color of one workspace, or undefined. */
  getWorkspaceColor(id: string): string | undefined {
    return this.snapshot.workspaceColors[id]
  }

  /**
   * Toggle one session id based on the store's membership. Callers with a
   * fresher truth (the log-backed projection) use {@link setPinned} with the
   * explicit next state instead.
   * @param id - session id to pin or unpin.
   * @returns the outcome.
   */
  async toggle(id: string): Promise<PinToggleResult> {
    return this.setPinned(id, !this.snapshot.pinned.includes(id))
  }

  /**
   * Commit an explicit next session-pin state. Unpinning always succeeds;
   * pinning beyond the limit answers `'limit'` without a write. A successful
   * pin also moves the session to the front of its workspace account.
   * @param id - session id to pin or unpin.
   * @param next - the explicit post-change membership.
   * @returns the outcome.
   */
  async setPinned(id: string, next: boolean): Promise<PinToggleResult> {
    const currently = this.snapshot.pinned.includes(id)
    if (next === currently) return next ? 'pinned' : 'unpinned'
    if (next && this.snapshot.maxPins > 0 && this.snapshot.pinned.length >= this.snapshot.maxPins) return 'limit'
    const candidate = next
      ? [id, ...this.snapshot.pinned.filter(item => item !== id)]
      : this.snapshot.pinned.filter(item => item !== id)

    if (this.remote !== undefined) {
      const result = await this.remote.setPinned(id, next)
      if (result.ok) {
        // Mirror the log-backed commit into the store so the ordered list,
        // panel, and workspace reordering stay consistent.
        await this.store.write({ pinned: candidate })
        this.adopt({ pinned: candidate })
        if (next) void this.reorderer.moveToTop(id)
        return next ? 'pinned' : 'unpinned'
      }
      // Remote absent or failed: the store path takes over.
    }
    await this.store.write({ pinned: candidate })
    // Adopt the write outcome immediately: the settings round trip (and its
    // subscription republish) lands later, but consumers must see the commit
    // at the click. A rejected write reloads Host state through refresh().
    this.adopt({ pinned: candidate })
    if (next) void this.reorderer.moveToTop(id)
    return next ? 'pinned' : 'unpinned'
  }

  /** Toggle one workspace id based on the store's membership.
   * @param id - workspace id to pin or unpin.
   * @returns the outcome.
   */
  async toggleWorkspace(id: string): Promise<PinToggleResult> {
    return this.setWorkspacePinned(id, !this.snapshot.workspacePinned.includes(id))
  }

  /**
   * Commit an explicit next workspace-pin state (store-only; no remote).
   * A successful pin moves the workspace to the front of the workspace list.
   * @param id - workspace id to pin or unpin.
   * @param next - the explicit post-change membership.
   * @returns the outcome.
   */
  async setWorkspacePinned(id: string, next: boolean): Promise<PinToggleResult> {
    const currently = this.snapshot.workspacePinned.includes(id)
    if (next === currently) return next ? 'pinned' : 'unpinned'
    if (next && this.snapshot.maxPins > 0 && this.snapshot.workspacePinned.length >= this.snapshot.maxPins) return 'limit'
    const candidate = next
      ? [id, ...this.snapshot.workspacePinned.filter(item => item !== id)]
      : this.snapshot.workspacePinned.filter(item => item !== id)
    await this.store.write({ workspacePinned: candidate })
    this.adopt({ workspacePinned: candidate })
    if (next) void this.reorderer.moveWorkspaceToTop(id)
    return next ? 'pinned' : 'unpinned'
  }

  /** Advance one session's color to the next palette step (wraps to none).
   * @param id - session id.
   */
  async cycleColor(id: string): Promise<void> {
    const next = nextPaletteColor(this.snapshot.colors[id])
    await this.setColor(id, next)
  }

  /** Advance one workspace's color to the next palette step (wraps to none).
   * @param id - workspace id.
   */
  async cycleWorkspaceColor(id: string): Promise<void> {
    const next = nextPaletteColor(this.snapshot.workspaceColors[id])
    await this.setWorkspaceColor(id, next)
  }

  /** Remove one session's color. */
  async clearColor(id: string): Promise<void> {
    await this.setColor(id, null)
  }

  /** Remove one workspace's color. */
  async clearWorkspaceColor(id: string): Promise<void> {
    await this.setWorkspaceColor(id, null)
  }

  /** Commit one session color (null clears; palette values only).
   * @param id - session id.
   * @param color - next color or null.
   */
  async setColor(id: string, color: string | null): Promise<void> {
    const colors = { ...this.snapshot.colors }
    if (color === null) delete colors[id]
    else colors[id] = color
    await this.store.write({ colors })
    this.adopt({ colors })
  }

  /** Commit one workspace color (null clears; palette values only).
   * @param id - workspace id.
   * @param color - next color or null.
   */
  async setWorkspaceColor(id: string, color: string | null): Promise<void> {
    const colors = { ...this.snapshot.workspaceColors }
    if (color === null) delete colors[id]
    else colors[id] = color
    await this.store.write({ workspaceColors: colors })
    this.adopt({ workspaceColors: colors })
  }

  /**
   * Re-assert pinned order against the current workspace accounts and the
   * workspace list. Glue wires this to workspace-list changes; the
   * reorderer's idempotence makes repeated calls safe.
   */
  reapplyOrder(): void {
    if (!this.snapshot.reorderOnLoad) return
    if (this.snapshot.pinned.length > 0) this.reorderer.reapplyOrder(this.snapshot.pinned)
    if (this.snapshot.workspacePinned.length > 0) this.reorderer.reapplyWorkspaceOrder(this.snapshot.workspacePinned)
  }

  /** Store feed arrived: re-read the snapshot and republish. */
  private refresh(): void {
    this.snapshot = this.store.read()
    this.notify()
  }

  /** Sessions list changed: gate pruning and initial reorder on the ready phase. */
  private onListChange(): void {
    const list = this.list.getSnapshot()
    if (list.phase !== LIST_READY) return
    if (this.snapshot.pruneStale) {
      const live = new Set(list.ids)
      const pruned = prunePins(this.snapshot.pinned, live)
      const colors = pruneColors(this.snapshot.colors, live)
      if (pruned.length !== this.snapshot.pinned.length || Object.keys(colors).length !== Object.keys(this.snapshot.colors).length) {
        this.snapshot = { ...this.snapshot, pinned: pruned, colors }
        void this.store.write({ pinned: pruned, colors })
        this.notify()
      }
    }
    this.reapplyOrder()
  }

  /** Workspaces list changed: gate pruning and initial reorder on the ready phase. */
  private onWorkspaceListChange(): void {
    const list = this.workspaceList.getSnapshot()
    if (list.phase !== LIST_READY) return
    if (this.snapshot.pruneStale) {
      const live = new Set(list.ids)
      const pruned = prunePins(this.snapshot.workspacePinned, live)
      const colors = pruneColors(this.snapshot.workspaceColors, live)
      if (pruned.length !== this.snapshot.workspacePinned.length || Object.keys(colors).length !== Object.keys(this.snapshot.workspaceColors).length) {
        this.snapshot = { ...this.snapshot, workspacePinned: pruned, workspaceColors: colors }
        void this.store.write({ workspacePinned: pruned, workspaceColors: colors })
        this.notify()
      }
    }
    this.reapplyOrder()
  }

  /** Adopt locally computed partial state and republish. */
  private adopt(partial: Partial<PinStoreSnapshot>): void {
    const next = { ...this.snapshot }
    if (partial.pinned !== undefined) next.pinned = normalizePins(partial.pinned)
    if (partial.workspacePinned !== undefined) next.workspacePinned = normalizePins(partial.workspacePinned)
    if (partial.colors !== undefined) next.colors = { ...partial.colors }
    if (partial.workspaceColors !== undefined) next.workspaceColors = { ...partial.workspaceColors }
    this.snapshot = next
    this.notify()
  }

  private notify(): void {
    for (const listener of [...this.listeners]) listener()
  }
}
