// SPDX-License-Identifier: Apache-2.0
/**
 * Row-overlay renderer: the DOM fallback that paints the [pin][swatch]
 * controls onto the core rows. Two row kinds:
 *
 * - session rows (`[role="treeitem"][aria-selected]`) — covered only on
 *   builds WITHOUT the upstream per-row slot (`sessions.row.action`). When
 *   the running build declares the slot, the session-row path turns itself
 *   off (the React badge is authoritative and id-keyed) and the overlay
 *   never paints a session row, so a row can never show two pin sets.
 * - workspace rows (`[role="treeitem"][aria-expanded]` without
 *   `aria-selected`) — the upstream slot does not render on workspace header
 *   rows, so the overlay is their only zero-core-change surface. Rows are
 *   matched by workspace label (host-enforced unique).
 *
 * The MutationObserver watches the document body — the workspace browser
 * renders several `role="tree"` containers (grouped, flat, search), so
 * observing the first tree would silently miss row mutations and strand
 * stale or duplicate controls. A slot-registry subscription re-renders on
 * slot declaration so the session-row gate reacts without waiting for a DOM
 * mutation.
 * @module dsh-session-pin/overlay
 */
import type { PinReadFace, PinTranslate, SessionListFace, WorkspaceListFace } from './faces.ts'
import { colorClassIndex } from './pin-core.ts'
import { BADGE_CLASS, PINNED_CLASS, PIN_SVG, ROW_CONTROLS_CLASS, SWATCH_CLASS } from './pin-ui-shared.ts'

/** Documents the overlay mutates (narrow Document face for jsdom tests). */
export interface OverlayDoc {
  body: {
    querySelectorAll(selector: string): NodeListOf<Element>
    querySelector(selector: string): Element | null
  }
  createElement(tag: string): HTMLElement
  querySelectorAll(selector: string): NodeListOf<Element>
  querySelector(selector: string): Element | null
}

/** Marker the overlay stamps on controls it created (row-slot controls stay untouched). */
const OVERLAY_OWNED = '1'

/** Dependencies injected by the browser glue. */
export interface OverlayDeps {
  sessions: SessionListFace
  workspaces: WorkspaceListFace
  pin: PinReadFace
  t: PinTranslate
  warn: (message: string) => void
  doc: OverlayDoc
  /** Whether the upstream `sessions.row.action` slot is declared (turns the session-row path off). */
  sessionSlotActive: () => boolean
  /** Subscribe to row-slot registry changes (re-renders the session-row gate). */
  onSlotsChange: (listener: () => void) => () => void
  /** Render scheduler; defaults to rAF with a setTimeout fallback. */
  raf?: (callback: () => void) => void
}

/** Duration of the limit-feedback flash on a rejected pin. */
const LIMIT_FLASH_MS = 1800

/**
 * Mount the row overlay: [pin][swatch] rendering for workspace rows (always)
 * and session rows (only while the row slot is undeclared), click handling,
 * limit feedback, and the body-scoped mutation observer.
 * @param deps - sessions/workspaces/pin/translate/document faces.
 * @returns the disposer removing every control and subscription.
 */
export function mountOverlay(deps: OverlayDeps): () => void {
  const { sessions, workspaces, pin, t, doc } = deps

  let renderScheduled = false
  const flashes = new Map<string, number>()

  const titleOf = (): Map<string, string[]> => {
    const list = sessions.getSnapshot()
    const byTitle = new Map<string, string[]>()
    for (const id of list.ids) {
      const summary = list.byId[id]
      if (summary === undefined || summary.blank) continue
      const existing = byTitle.get(summary.displayTitle)
      if (existing === undefined) byTitle.set(summary.displayTitle, [id])
      else existing.push(id)
    }
    return byTitle
  }

  const workspaceTitleOf = (): Map<string, string> => {
    const byTitle = new Map<string, string>()
    for (const item of workspaces.getSnapshot().items) {
      if (item.title !== '') byTitle.set(item.title, item.workspaceId)
    }
    return byTitle
  }

  /** The row's title span text when it matches a known session title. */
  const sessionIdsFor = (row: HTMLElement): { title: string; ids: string[] } | undefined => {
    const byTitle = titleOf()
    const span = [...row.querySelectorAll('span')].find(span =>
      span.textContent !== null && span.textContent !== '' && byTitle.has(span.textContent))
    if (span === undefined) return undefined
    return { title: span.textContent ?? '', ids: byTitle.get(span.textContent ?? '') ?? [] }
  }

  /** The row's workspace id when its label matches a known workspace. */
  const workspaceIdFor = (row: HTMLElement): string | undefined => {
    const byTitle = workspaceTitleOf()
    const span = [...row.querySelectorAll('span')].find(span =>
      span.textContent !== null && span.textContent !== '' && byTitle.has(span.textContent))
    if (span === undefined) return undefined
    return byTitle.get(span.textContent ?? '')
  }

  /** Whether the row contains a badge the overlay does not own (the row-slot's React badge). */
  const hasForeignBadge = (row: HTMLElement): boolean => {
    for (const badge of row.querySelectorAll<HTMLElement>(`button.${BADGE_CLASS}`)) {
      if (badge.dataset.overlayOwned !== OVERLAY_OWNED) return true
    }
    return false
  }

  /** Create the shared [pin][swatch] pair for one row.
   * @param row - the addressed treeitem.
   * @param kind - the row kind the handlers act on (session vs workspace), so
   * a session row whose title collides with a workspace label can never
   * toggle a workspace pin (and vice versa).
   */
  const createControls = (row: HTMLElement, kind: 'session' | 'workspace'): { badge: HTMLButtonElement; swatch: HTMLButtonElement } => {
    const badge = doc.createElement('button') as HTMLButtonElement
    badge.type = 'button'
    badge.className = BADGE_CLASS
    badge.dataset.overlayOwned = OVERLAY_OWNED
    badge.innerHTML = PIN_SVG
    const swatch = doc.createElement('button') as HTMLButtonElement
    swatch.type = 'button'
    swatch.className = SWATCH_CLASS
    swatch.dataset.overlayOwned = OVERLAY_OWNED
    const wrapper = doc.createElement('span') as HTMLSpanElement
    wrapper.className = ROW_CONTROLS_CLASS
    wrapper.dataset.overlayOwned = OVERLAY_OWNED
    wrapper.append(badge, swatch)
    row.insertBefore(wrapper, row.firstChild)

    const flash = (key: string, limitLabel: string, onRejected: (label: string) => void): void => {
      const started = Date.now()
      flashes.set(key, started)
      onRejected(limitLabel)
      setTimeout(() => {
        if (flashes.get(key) !== started) return
        flashes.delete(key)
        scheduleRender()
      }, LIMIT_FLASH_MS)
    }

    badge.addEventListener('click', (event) => {
      event.stopPropagation()
      if (kind === 'session' && !deps.sessionSlotActive()) {
        const target = sessionIdsFor(row)?.ids[0]
        if (target === undefined) return
        const key = `s:${target}`
        void pin.toggle(target).then((result) => {
          if (result !== 'limit') return
          deps.warn(`session-pin: pin limit (${String(pin.getMaxPins())}) reached; unpin another session first`)
          flash(key, t('limit'), label => { badge.title = label; badge.setAttribute('aria-label', label) })
        })
        return
      }
      if (kind === 'workspace') {
        const workspace = workspaceIdFor(row)
        if (workspace === undefined) return
        const key = `w:${workspace}`
        void pin.toggleWorkspace(workspace).then((result) => {
          if (result !== 'limit') return
          deps.warn(`session-pin: workspace pin limit (${String(pin.getMaxPins())}) reached; unpin another workspace first`)
          flash(key, t('limitWorkspace'), label => { badge.title = label; badge.setAttribute('aria-label', label) })
        })
      }
    })

    swatch.addEventListener('click', (event) => {
      event.stopPropagation()
      if (kind === 'session' && !deps.sessionSlotActive()) {
        const target = sessionIdsFor(row)?.ids[0]
        if (target === undefined) return
        if (event.shiftKey) void pin.clearColor(target)
        else void pin.cycleColor(target)
        return
      }
      if (kind === 'workspace') {
        const workspace = workspaceIdFor(row)
        if (workspace === undefined) return
        if (event.shiftKey) void pin.clearWorkspaceColor(workspace)
        else void pin.cycleWorkspaceColor(workspace)
      }
    })

    return { badge, swatch }
  }

  /** Paint (or retire) one session row's overlay controls. */
  const renderSessionRow = (row: HTMLElement): void => {
    if (deps.sessionSlotActive()) {
      for (const wrapper of row.querySelectorAll(`span.${ROW_CONTROLS_CLASS}[data-overlay-owned="${OVERLAY_OWNED}"]`)) wrapper.remove()
      return
    }
    if (hasForeignBadge(row)) {
      // The row slot renders its badge anywhere inside the row (its render
      // site may wrap it); retire the overlay's own controls and leave the
      // slot's alone — a row never shows two pin sets.
      for (const wrapper of row.querySelectorAll(`span.${ROW_CONTROLS_CLASS}[data-overlay-owned="${OVERLAY_OWNED}"]`)) wrapper.remove()
      return
    }
    const match = sessionIdsFor(row)
    let wrapper = row.querySelector<HTMLElement>(`:scope > span.${ROW_CONTROLS_CLASS}[data-overlay-owned="${OVERLAY_OWNED}"]`)
    if (match === undefined || match.ids.length === 0) {
      wrapper?.remove()
      return
    }
    if (wrapper === null) wrapper = createControls(row, 'session').badge.parentElement as HTMLElement
    const { badge, swatch } = readControls(wrapper)
    if (badge === undefined || swatch === undefined) return
    const ids = match.ids
    const target = ids[0]!
    const isPinned = ids.some(id => pin.isPinned(id))
    badge.classList.toggle(PINNED_CLASS, isPinned)
    badge.setAttribute('aria-pressed', String(isPinned))
    const color = pin.getColor(target)
    paintSwatch(swatch, color)
    const flashing = flashes.has(`s:${target}`)
    if (!flashing) {
      const label = t(ids.some(id => pin.isPinned(id)) ? 'unpin' : 'pin')
      badge.title = label
      badge.setAttribute('aria-label', label)
    }
  }

  /** Paint (or retire) one workspace row's overlay controls. */
  const renderWorkspaceRow = (row: HTMLElement): void => {
    const id = workspaceIdFor(row)
    let wrapper = row.querySelector<HTMLElement>(`:scope > span.${ROW_CONTROLS_CLASS}[data-overlay-owned="${OVERLAY_OWNED}"]`)
    if (id === undefined) {
      wrapper?.remove()
      return
    }
    if (wrapper === null) wrapper = createControls(row, 'workspace').badge.parentElement as HTMLElement
    const { badge, swatch } = readControls(wrapper)
    if (badge === undefined || swatch === undefined) return
    const isPinned = pin.isWorkspacePinned(id)
    badge.classList.toggle(PINNED_CLASS, isPinned)
    badge.setAttribute('aria-pressed', String(isPinned))
    paintSwatch(swatch, pin.getWorkspaceColor(id))
    const flashing = flashes.has(`w:${id}`)
    if (!flashing) {
      const label = t(isPinned ? 'unpinWorkspace' : 'pinWorkspace')
      badge.title = label
      badge.setAttribute('aria-label', label)
    }
  }

  const readControls = (wrapper: HTMLElement): { badge: HTMLButtonElement | undefined; swatch: HTMLButtonElement | undefined } => ({
    badge: wrapper.querySelector<HTMLButtonElement>(`button.${BADGE_CLASS}`) ?? undefined,
    swatch: wrapper.querySelector<HTMLButtonElement>(`button.${SWATCH_CLASS}`) ?? undefined,
  })

  const paintSwatch = (swatch: HTMLButtonElement, color: string | undefined): void => {
    const index = colorClassIndex(color)
    const label = t('colorChange')
    swatch.title = label
    swatch.setAttribute('aria-label', label)
    if (index === undefined) swatch.removeAttribute('data-color')
    else swatch.setAttribute('data-color', `c${index}`)
  }

  const render = (): void => {
    renderScheduled = false
    for (const row of doc.querySelectorAll('[role="treeitem"][aria-selected]')) {
      if (!(row instanceof HTMLElement)) continue
      renderSessionRow(row)
    }
    for (const row of doc.querySelectorAll('[role="treeitem"][aria-expanded]')) {
      if (!(row instanceof HTMLElement)) continue
      if (row.hasAttribute('aria-selected')) continue
      renderWorkspaceRow(row)
    }
  }

  const scheduleRender = (): void => {
    if (renderScheduled) return
    renderScheduled = true
    const run = (): void => { render() }
    const raf = deps.raf
    if (raf !== undefined) raf(run)
    else if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run)
    else setTimeout(run, 0)
  }

  // Observe the whole body: the workspace browser renders several
  // `role="tree"` containers (grouped, flat, search) plus other surfaces
  // render their own trees, so observing only the first tree would miss the
  // mutations that retire or repaint row controls.
  const observer = new MutationObserver(() => { scheduleRender() })
  observer.observe(doc.body as unknown as Node, { childList: true, subtree: true, characterData: true })

  const disposePin = pin.subscribe(scheduleRender)
  const disposeSessions = sessions.subscribe(scheduleRender)
  const disposeWorkspaces = workspaces.subscribe(scheduleRender)
  const disposeSlots = deps.onSlotsChange(scheduleRender)
  scheduleRender()

  return () => {
    disposeSlots()
    disposeWorkspaces()
    disposeSessions()
    disposePin()
    observer.disconnect()
    for (const wrapper of doc.querySelectorAll(`span.${ROW_CONTROLS_CLASS}[data-overlay-owned="${OVERLAY_OWNED}"]`)) wrapper.remove()
    flashes.clear()
  }
}
