// SPDX-License-Identifier: Apache-2.0
/**
 * Browser half of the dual-face session-pin plugin. Assembles the pin store
 * (Host-backed `session-pin` settings namespace, degrading to browser-local
 * storage when the transport cannot carry it), the PinController (two pin
 * levels — sessions and workspaces — plus per-level row colors), the row
 * overlay and row-slot controls, the session-header toggle, the sidebar foot
 * action, and the pinned-sessions panel.
 *
 * Ordering goes through `workspace.insertSessionBefore` / `workspace.insertBefore`:
 * a newly pinned session moves to the front of its workspace account and a
 * newly pinned workspace moves to the front of the workspace list;
 * `reorderOnLoad` re-asserts both pinned prefixes once the lists are ready
 * and again on workspace-list changes — idempotent, so it cannot loop
 * against the core's own re-sorting.
 *
 * The row slot (`sessions.row.action`) is the authoritative session-row
 * surface; while it is declared the DOM overlay skips session rows entirely
 * (no duplicate pins) and only paints workspace rows, which have no slot.
 * @module dsh-session-pin/client
 */
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId, WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { PinController } from './pin-controller.ts'
import { reorderMoves, topAnchor } from './pin-core.ts'
import { createPinStore, type PinSection, type StorageEventsLike, type StorageLike } from './pin-store.ts'
import { mountNavigator } from './nav-ui.ts'
import type { HealthEventFace } from './navigator.ts'
import type { PinRemoteLike, PinTranslate, SessionListFace, WorkspaceListFace } from './faces.ts'
import { LOCALE_DICTS, LOCALE_NS, fallbackTranslate } from './locales.ts'
import { mountOverlay, type OverlayDoc } from './overlay.ts'
import { STYLE_TEXT } from './pin-ui-shared.ts'
import { createPinUiState, registerSlots } from './ui.ts'
import { mountRowSlot, ROW_SLOT_KEY, type RowSlotRegistryLike } from './row-slot.ts'

export const name = 'session-pin'

// The settings-scope binder resolves `connection` and `remote` on the caller's
// context at bind time; this plugin names both so the bound scope's transport
// and invalidation subscription live on this fiber. `slots` is a hard
// dependency (row badges and slot contributions register on apply): naming it
// puts the service on this fiber's own store — a bare `ctx.slots` read would
// otherwise walk the ancestor fiber chain only and never reach the runtime
// fiber that provides the registry.
export const inject = ['sessions', 'workspaces', 'settingsScope', 'connection', 'remote', 'slots']

/** Settings namespace registered by the host half. */
const NAMESPACE = 'session-pin'
/** Plugin identity for style-tag bookkeeping. */
const PLUGIN_ID = 'dsh-session-pin'

/** Inject the plugin-owned stylesheet once per factory execution. */
function injectStyles(): HTMLStyleElement {
  const tag = document.createElement('style')
  tag.dataset.plugin = PLUGIN_ID
  tag.textContent = STYLE_TEXT
  document.head.appendChild(tag)
  return tag
}

/** Access-guarded browser-local storage (private-mode/iframes degrade to memory). */
function guardedStorage(): StorageLike {
  return {
    getItem(key) {
      try {
        return window.localStorage.getItem(key)
      } catch {
        return null
      }
    },
    setItem(key, value) {
      try {
        window.localStorage.setItem(key, value)
      } catch {
        /* private mode / disabled storage: pinning degrades to session-lifetime */
      }
    },
  }
}

/** Narrow wire face of the upstream `session.setPinned` channel (post-D3 builds). */
interface SetPinnedChannel {
  api?: {
    session?: {
      setPinned?: (payload: { sessionId: string; pinned: boolean }, signal?: AbortSignal) => Promise<{ ok: boolean }>
    }
  }
  rpc?: {
    call?: (channel: string, endpoint: string, payload: unknown, signal?: AbortSignal) => Promise<{ ok: boolean }>
  }
}

/**
 * Build the optional log-backed write channel. The typed api face is
 * preferred; the generic connection RPC covers builds whose api face predates
 * the method but whose gateway serves the endpoint. A failed commit disables
 * the remote (the store takes over) until the next connection generation
 * re-enables it. Baselines without the endpoint simply never commit through
 * it — one failed probe on the first toggle, then the store path.
 * @param ctx - client cordis context.
 * @returns the remote, or undefined when no channel surface exists.
 */
/** A remote commit that neither settles nor rejects within this window
 * degrades to the store path (the RPC channel is best-effort by contract). */
const REMOTE_COMMIT_TIMEOUT_MS = 4000

function buildPinRemote(ctx: Context): PinRemoteLike | undefined {
  // Boundary cast: the connection face is consumed through the narrow wire
  // channel below (the npm baseline's Context merge does not name the
  // upstream setPinned method, and may not pull the connection merge at all).
  const connection = (ctx as unknown as { connection?: SetPinnedChannel }).connection
  const typed = connection?.api?.session?.setPinned
  const generic = connection?.rpc?.call
  if (typeof typed !== 'function' && typeof generic !== 'function') return undefined
  let enabled = true
  const commit = async (id: string, pinned: boolean): Promise<{ ok: true } | { ok: false }> => {
    try {
      const call = typeof typed === 'function'
        ? typed({ sessionId: id, pinned })
        : generic!('/api', 'session.setPinned', { sessionId: id, pinned })
      const timeout = new Promise<{ ok: false }>(resolve => {
        setTimeout(() => resolve({ ok: false }), REMOTE_COMMIT_TIMEOUT_MS)
      })
      const result = await Promise.race([call, timeout])
      return result.ok ? { ok: true } : { ok: false }
    } catch {
      return { ok: false }
    }
  }
  return {
    setPinned: async (id, pinned) => {
      if (!enabled) return { ok: false }
      const result = await commit(id, pinned)
      if (!result.ok) enabled = false
      return result
    },
    reenable: () => {
      enabled = true
    },
  }
}

/** Narrow slot-registry face for the row-slot gate (subscribe + snapshot). */
interface RowSlotGateRegistry {
  snapshot(root: string): unknown[]
  subscribe(key: string, listener: () => void): () => void
}

/**
 * Mount the browser half: store, controller, overlay + row-slot controls,
 * slot contributions, locale copy, and the ordering re-assertion wiring.
 * @param ctx - client cordis context.
 */
export function apply(ctx: Context): void {
  const styleTag = injectStyles()
  const scope = ctx.settingsScope.bind<PinSection>({ namespace: NAMESPACE })
  const store = createPinStore(scope, guardedStorage(), window as unknown as StorageEventsLike)

  // Narrow the runtime sessions list into the framework-free face (the one
  // branded-id adaptation point). The snapshot is cached: slot components
  // feed it to useSyncExternalStore, which compares the return by reference —
  // a fresh object per read would force a re-render loop.
  let sessionsCache: ReturnType<SessionListFace['getSnapshot']> | undefined
  const sessionsFace: SessionListFace = {
    getSnapshot: () => {
      if (sessionsCache !== undefined) return sessionsCache
      const list = ctx.sessions.list.getSnapshot()
      const byId: Record<string, { displayTitle: string; blank: boolean }> = {}
      for (const [id, summary] of Object.entries(list.byId)) {
        byId[id] = { displayTitle: summary.displayTitle, blank: summary.blank }
      }
      return sessionsCache = { phase: list.phase, ids: list.ids.map(id => id as string), byId }
    },
    subscribe: listener => ctx.sessions.list.subscribe(() => {
      sessionsCache = undefined
      listener()
    }),
  }

  // Narrow the runtime workspaces list the same way (workspace pins, colors,
  // and the panel all read the label/id projection).
  let workspacesCache: ReturnType<WorkspaceListFace['getSnapshot']> | undefined
  const workspacesFace: WorkspaceListFace = {
    getSnapshot: () => {
      if (workspacesCache !== undefined) return workspacesCache
      const snapshot = ctx.workspaces.list.getSnapshot()
      return workspacesCache = {
        phase: snapshot.phase as string,
        items: snapshot.items.map(item => ({ workspaceId: item.workspaceId as string, title: item.title })),
      }
    },
    subscribe: listener => ctx.workspaces.list.subscribe(() => {
      workspacesCache = undefined
      listener()
    }),
  }

  const moveToTop = async (id: string): Promise<void> => {
    const sessionId = id as SessionId
    const snapshot = ctx.workspaces.list.getSnapshot()
    const workspace = snapshot.items.find(item => item.sessionIds.includes(sessionId))
    if (workspace === undefined) return // ungrouped: no host-side account to reorder
    const anchor = topAnchor(workspace.sessionIds as readonly string[], id)
    if (anchor === undefined) return
    try {
      await ctx.workspaces.insertSessionBefore(workspace.workspaceId, sessionId, anchor as SessionId)
    } catch (error: unknown) {
      ctx.logger.warn(`session-pin: reorder rejected: ${String(error)}`)
    }
  }

  const moveWorkspaceToTop = async (id: string): Promise<void> => {
    // Runtime probe: older baselines' workspaces service may predate the
    // workspace-level reorder RPC; the pin state still works without it.
    const insertBefore = ctx.workspaces.insertBefore as ((workspaceId: WorkspaceId, beforeWorkspaceId?: WorkspaceId) => Promise<void>) | undefined
    if (typeof insertBefore !== 'function') return
    const items = ctx.workspaces.list.getSnapshot().items
    const index = items.findIndex(item => item.workspaceId === id)
    if (index <= 0) return
    try {
      await insertBefore(id as WorkspaceId, items[0]!.workspaceId)
    } catch (error: unknown) {
      ctx.logger.warn(`session-pin: workspace reorder rejected: ${String(error)}`)
    }
  }

  const reorderer = {
    moveToTop,
    reapplyOrder: (pinned: readonly string[]): void => {
      const snapshot = ctx.workspaces.list.getSnapshot()
      for (const item of snapshot.items) {
        const moves = reorderMoves(item.sessionIds as readonly string[], pinned)
        for (const id of moves) void moveToTop(id)
      }
    },
    moveWorkspaceToTop,
    reapplyWorkspaceOrder: (pinned: readonly string[]): void => {
      const ids = ctx.workspaces.list.getSnapshot().items.map(item => item.workspaceId as string)
      const moves = reorderMoves(ids, pinned)
      for (const id of moves) void moveWorkspaceToTop(id)
    },
  }

  const remote = buildPinRemote(ctx)
  ctx.on('connection/reset', () => {
    remote?.reenable()
  })
  // The controller consumes the workspace list through a phase+ids face; the
  // UI faces keep the label projection.
  const workspacePinSource = {
    getSnapshot: () => {
      const snapshot = workspacesFace.getSnapshot()
      return { phase: snapshot.phase, ids: snapshot.items.map(item => item.workspaceId) }
    },
    subscribe: workspacesFace.subscribe,
  }
  const controller = new PinController(store, sessionsFace, workspacePinSource, reorderer, remote)
  const ui = createPinUiState()

  // Navigation organizer feeds: per-session health from the public session
  // snapshots (read-only, sanitized at render) and `/goto` candidates from
  // the listed sessions plus the plugin's own tags.
  const navSnapshot = store.read()
  const healthSource = {
    healthFor: (id: string): readonly HealthEventFace[] | undefined => {
      const binding = ctx.sessions.binding(id as SessionId)
      const nodes = binding?.session.getSnapshot().nodes as ReadonlyArray<{ kind?: string; time?: number }> | undefined
      if (nodes === undefined) return undefined
      return nodes.map((node) => ({
        type: node.kind === 'user' ? 'user/message' : node.kind === 'assistant' ? 'assistant/message' : node.kind ?? 'unknown',
        time: node.time ?? 0,
      }))
    },
  }
  const gotoSource = {
    entries: () => {
      const snapshot = sessionsFace.getSnapshot()
      const tags = controller.getTags()
      return snapshot.ids.map(id => ({ id, name: snapshot.byId[id]?.displayTitle ?? id, tags: tags[id] ?? [] }))
    },
  }

  // Optional locale service: bind the plugin namespace when the composition
  // ships one; the fallback keeps English without it. The holder indirection
  // keeps slot inject faces stable while the binding upgrades live.
  let translate: PinTranslate = fallbackTranslate
  ctx.inject(['locale'], (localeCtx) => {
    localeCtx.locale.register(LOCALE_NS, LOCALE_DICTS)
    const bound = localeCtx.locale.bind(LOCALE_NS)
    translate = key => bound(key)
  })

  // Row-slot gate: while the upstream `sessions.row.action` slot is declared,
  // the React badge owns session rows and the overlay skips them (the
  // duplicate-pin fix). Declaration can land after apply (boot order is
  // unconstrained), so the gate refreshes on slot-registry changes. Both
  // registry methods are runtime-probed: the npm baseline's slots service
  // predates them, and this plugin must keep degrading gracefully there.
  const slotsGate = ctx.slots as unknown as RowSlotGateRegistry
  let rowSlotActive = false
  const refreshRowSlotActive = (): void => {
    rowSlotActive = typeof slotsGate.snapshot === 'function' && slotsGate.snapshot(ROW_SLOT_KEY).length > 0
  }
  refreshRowSlotActive()
  const subscribeSlots = typeof slotsGate.subscribe === 'function'
    ? (listener: () => void): (() => void) => slotsGate.subscribe(ROW_SLOT_KEY, listener)
    : (): (() => void) => (): void => {}

  ctx.effect(() => {
    controller.start()
    const disposeRowSlot = mountRowSlot({
      slots: ctx.slots as unknown as RowSlotRegistryLike,
      pin: controller,
      t: key => translate(key),
    })
    const disposeGate = subscribeSlots(() => {
      refreshRowSlotActive()
    })
    const disposeOverlay = mountOverlay({
      sessions: sessionsFace,
      workspaces: workspacesFace,
      pin: controller,
      t: key => translate(key),
      warn: message => {
        ctx.logger.warn(message)
      },
      doc: document as unknown as OverlayDoc,
      sessionSlotActive: () => rowSlotActive,
      onSlotsChange: subscribeSlots,
    })
    const disposeSlots = registerSlots({
      ctx,
      pin: controller,
      ui,
      sessions: sessionsFace,
      workspaces: workspacesFace,
      t: key => translate(key),
      openSession: id => {
        ctx.sessions.open(id as SessionId)
      },
      openWorkspace: id => {
        // Runtime probe: baselines without the startSession helper degrade to
        // a no-op (the panel row simply closes without jumping).
        const startSession = ctx.workspaces.startSession as ((workspaceId?: WorkspaceId) => void) | undefined
        if (typeof startSession === 'function') startSession(id as WorkspaceId)
        else ctx.logger.warn('session-pin: workspace open unavailable on this baseline')
      },
    })
    const disposeWorkspaces = ctx.workspaces.list.subscribe(() => {
      controller.reapplyOrder()
    })
    const disposeNav = mountNavigator({
      pin: controller,
      options: {
        enableBoards: navSnapshot.enableBoards,
        enableTags: navSnapshot.enableTags,
        enableViews: navSnapshot.enableViews,
        enableHealth: navSnapshot.enableHealth,
        enableGoto: navSnapshot.enableGoto,
      },
      health: healthSource,
      goto: gotoSource,
      openSession: id => {
        ctx.sessions.open(id as SessionId)
      },
    })
    return () => {
      disposeNav()
      disposeWorkspaces()
      disposeSlots()
      disposeOverlay()
      disposeGate()
      disposeRowSlot()
      controller.stop()
      styleTag.remove()
    }
  }, 'session-pin: pin store, badges, slots, and navigation organizer')
}
