// SPDX-License-Identifier: Apache-2.0
/**
 * Browser half of the dual-face session-pin plugin. Renders a hover pin badge
 * on every session row (gray outline; amber fill while pinned), toggles pin
 * state on click, stores the pinned set through the `session-pin` settings
 * namespace (durable, Host-backed), and moves a newly pinned session to the
 * top of its workspace account through `workspace.insertSessionBefore`.
 *
 * Rows are matched by their title text — the only stable per-row signal the
 * core exposes today; no per-row slot exists for third-party plugins.
 * @module @dsh-external/dsh-session-pin/client
 */
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId, SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { normalizePins, togglePin, topAnchor } from './pin-core.ts'

export const name = 'session-pin'

// The settings-scope binder resolves `connection` and `remote` on the caller's
// context at bind time; this plugin names both so the bound scope's transport
// and invalidation subscription live on this fiber.
export const inject = ['sessions', 'workspaces', 'settingsScope', 'connection', 'remote']

/** Settings namespace registered by the host half. */
const NAMESPACE = 'session-pin'
/** Remote-browser fallback (settings RPCs are loopback-only). */
const STORAGE_KEY = 'dsh.session-pin.pinned'
/** Badge classes are plugin-owned; hashed core CSS never shares them. */
const BADGE_CLASS = '__dsh-session-pin-badge__'
const PINNED_CLASS = '__dsh-session-pin-pinned__'

/** Inline pushpin glyph — Lucide-style stroke icon (currentColor: gray default, amber pinned). */
const PIN_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>'

const STYLE_TEXT = [
  `button.${BADGE_CLASS}{`,
  'all:unset;display:inline-flex;align-items:center;justify-content:center;',
  'width:16px;height:16px;flex:none;margin-right:4px;cursor:pointer;',
  'border-radius:4px;color:#8b949e;opacity:0;',
  'transition:opacity 80ms ease,color 120ms ease,background-color 120ms ease;',
  '}',
  `[role="treeitem"][aria-selected]:hover button.${BADGE_CLASS},`,
  `button.${BADGE_CLASS}.${PINNED_CLASS}{opacity:1;}`,
  `button.${BADGE_CLASS}:hover{color:#57606a;background-color:rgba(140,149,159,.12);}`,
  `button.${BADGE_CLASS}.${PINNED_CLASS}{color:#eab308;}`,
  `button.${BADGE_CLASS}.${PINNED_CLASS}:hover{color:#fbbf24;background-color:rgba(234,179,8,.12);}`,
].join('')

/** Pin-section shape of the settings namespace. */
interface PinSection { pinned?: string[]; maxPins?: number }

/** Inject the plugin-owned stylesheet once per factory execution. */
function injectStyles(): void {
  const tag = document.createElement('style')
  tag.dataset.plugin = '@dsh-external/dsh-session-pin'
  tag.textContent = STYLE_TEXT
  document.head.appendChild(tag)
}

/** Read the pinned ids from browser-local storage (remote-browser fallback). */
function readLocalPins(): string[] {
  try {
    return normalizePins(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))
  } catch {
    return []
  }
}

/** Write the pinned ids to browser-local storage. */
function writeLocalPins(pinned: readonly string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pinned))
  } catch {
    /* private mode / disabled storage: pinning degrades to session-lifetime */
  }
}

/**
 * Mount the pin overlay: settings scope, row badge renderer, and the
 * document-level mutation observer that re-applies badges when React
 * re-renders the session tree.
 * @param ctx - client cordis context.
 */
export function apply(ctx: Context): void {
  const scope = ctx.settingsScope.bind<PinSection>({ namespace: NAMESPACE })
  injectStyles()

  let pinned = new Set<string>()
  let maxPins = 0
  let renderScheduled = false

  const localMode = (): boolean => {
    const snapshot = scope.getSnapshot()
    return snapshot.mode === 'memory' || snapshot.status === 'unavailable'
  }

  const refreshPinned = (): void => {
    const snapshot = scope.getSnapshot()
    pinned = new Set(localMode() ? readLocalPins() : normalizePins(snapshot.value?.pinned ?? []))
    // Remote browsers cannot read the host base layer; unlimited until the
    // settings transport is reachable again.
    maxPins = localMode() ? 0 : snapshot.value?.maxPins ?? 0
    scheduleRender()
  }

  const persistPinned = async (next: string[]): Promise<void> => {
    if (localMode()) {
      writeLocalPins(next)
      pinned = new Set(next)
      scheduleRender()
      return
    }
    // Host mode: the scope subscription republishes the snapshot after the
    // write settles; rendering follows the snapshot, never the write promise.
    await scope.set('pinned', next)
  }

  const moveToTop = async (id: string): Promise<void> => {
    const sessionId = id as SessionId
    const workspace = ctx.workspaces.list.getSnapshot().items.find(item => item.sessionIds.includes(sessionId))
    if (workspace === undefined) return // ungrouped: no host-side account to reorder
    const anchor = topAnchor(workspace.sessionIds as readonly string[], id)
    if (anchor === undefined) return
    try {
      await ctx.workspaces.insertSessionBefore(workspace.workspaceId, sessionId, anchor as SessionId)
    } catch (error: unknown) {
      ctx.logger.warn(`session-pin: reorder rejected: ${String(error)}`)
    }
  }

  const onToggle = (ids: readonly string[]): void => {
    const target = ids[0]
    if (target === undefined) return
    const next = togglePin([...pinned], target, maxPins)
    if (next === null) {
      ctx.logger.warn(`session-pin: pin limit (${maxPins}) reached; unpin another session first`)
      return
    }
    void persistPinned(next).then(() => {
      if (next.includes(target)) void moveToTop(target)
    })
  }

  const titleOf = (): Map<string, string[]> => {
    const list = ctx.sessions.list.getSnapshot()
    const byTitle = new Map<string, string[]>()
    for (const id of list.ids) {
      const summary = list.byId[id]
      if (summary === undefined || summary.blank) continue
      const existing = byTitle.get(summary.displayTitle)
      if (existing === undefined) byTitle.set(summary.displayTitle, [id as string])
      else existing.push(id as string)
    }
    return byTitle
  }

  const render = (): void => {
    renderScheduled = false
    const byTitle = titleOf()
    const rows = document.querySelectorAll<HTMLElement>('[role="treeitem"][aria-selected]')
    for (const row of rows) {
      const titleEl = [...row.querySelectorAll('span')].find(span =>
        span.textContent !== null && span.textContent !== '' && byTitle.has(span.textContent))
      if (titleEl === undefined) {
        row.querySelector(`:scope > button.${BADGE_CLASS}`)?.remove()
        continue
      }
      // Duplicate titles: one badge per row; the toggle acts on the first
      // matching id (documented cosmetic limitation).
      const ids = byTitle.get(titleEl.textContent ?? '') ?? []
      const isPinned = ids.some(id => pinned.has(id))
      let badge = row.querySelector<HTMLButtonElement>(`:scope > button.${BADGE_CLASS}`)
      if (badge === null) {
        badge = document.createElement('button')
        badge.type = 'button'
        badge.className = BADGE_CLASS
        badge.innerHTML = PIN_SVG
        badge.addEventListener('click', (event) => {
          event.stopPropagation()
          onToggle(ids)
        })
        row.insertBefore(badge, row.firstChild)
      }
      badge.classList.toggle(PINNED_CLASS, isPinned)
      badge.title = isPinned ? 'Unpin session' : 'Pin session'
      badge.setAttribute('aria-label', isPinned ? 'Unpin session' : 'Pin session')
    }
  }

  const scheduleRender = (): void => {
    if (renderScheduled) return
    renderScheduled = true
    const run = (): void => { render() }
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run)
    else setTimeout(run, 0)
  }

  ctx.effect(() => {
    const disposeScope = scope.subscribe(refreshPinned)
    const disposeSessions = ctx.sessions.list.subscribe(scheduleRender)
    const observer = new MutationObserver(() => { scheduleRender() })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    refreshPinned()
    return () => {
      observer.disconnect()
      disposeSessions()
      disposeScope()
      for (const badge of document.querySelectorAll(`button.${BADGE_CLASS}`)) badge.remove()
    }
  }, 'session-pin: row overlay')
}
