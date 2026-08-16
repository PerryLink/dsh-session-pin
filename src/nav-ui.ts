// SPDX-License-Identifier: Apache-2.0
/**
 * The navigator surface: boards, tags, saved views, per-session health, and
 * the `/goto` composer command. All state stays browser-local (it rides the
 * existing pin store); the health summary reads only public session
 * snapshots and sanitizes everything it shows. The surface is one injected
 * stylesheet plus a small floating bar that appears beside the pinned panel —
 * it never enters React's tree, so hot renders cannot tear it down. Filtering
 * walks the panel rows directly (attribute-driven) and re-applies on DOM
 * churn, so React re-renders cannot permanently break it.
 * @module dsh-session-pin/nav-ui
 */

import type { PinController } from './pin-controller.ts'
import {
  filterEntries, gotoMatches, summarizeHealth, sanitizeLabel,
  type HealthEventFace, type NavEntry, type NavFilter,
} from './navigator.ts'
import { PANEL_CLASS, PANEL_ROW_CLASS } from './pin-ui-shared.ts'

/** Health feed one entity id resolves through (session snapshots only). */
export interface HealthSource {
  healthFor(id: string): readonly HealthEventFace[] | undefined
}

/** Title feed for `/goto` (session list entries with tags). */
export interface GotoSource {
  entries(): readonly NavEntry[]
}

/** Config switches the navigator honors. */
export interface NavOptions {
  readonly enableBoards: boolean
  readonly enableTags: boolean
  readonly enableViews: boolean
  readonly enableHealth: boolean
  readonly enableGoto: boolean
}

const BAR_CLASS = '__dsh-session-pin-nav__'
const CHIP_CLASS = '__dsh-session-pin-nav-chip__'
const CHIP_ACTIVE_CLASS = '__dsh-session-pin-nav-chip-active__'
const BAR_STYLE_ID = '__dsh-session-pin-nav-bar-style__'

/** The bar + health-line stylesheet, injected once. */
function ensureBarStyle(): void {
  if (document.getElementById(BAR_STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = BAR_STYLE_ID
  style.textContent = [
    `div.${BAR_CLASS}{`,
    'position:fixed;top:48px;right:300px;width:280px;',
    'background:#1f2428;border:1px solid #30363d;border-radius:8px;',
    'box-shadow:0 8px 24px rgba(0,0,0,.4);padding:6px;pointer-events:auto;',
    'color:#e6edf3;font-size:12px;z-index:1001;display:flex;flex-direction:column;gap:6px;',
    '}',
    `button.${CHIP_CLASS}{`,
    'all:unset;cursor:pointer;padding:2px 8px;border-radius:12px;font-size:11px;',
    'border:1px solid #30363d;color:#8b949e;',
    '}',
    `button.${CHIP_CLASS}.${CHIP_ACTIVE_CLASS}{border-color:#eab308;color:#eab308;}`,
    `input.${BAR_CLASS}input{`,
    'all:unset;box-sizing:border-box;width:100%;padding:3px 6px;border-radius:6px;',
    'background:#10151b;border:1px solid #3d444d;color:#e6edf3;font-size:12px;',
    '}',
    `div.${BAR_CLASS}chips{display:flex;flex-wrap:wrap;gap:4px;}`,
    `div.${PANEL_ROW_CLASS} span.${BAR_CLASS}health{display:block;margin-left:auto;font-size:10px;color:#8b949e;white-space:nowrap;}`,
  ].join('\n')
  document.head.appendChild(style)
}

/**
 * Mount the navigator surface: filter bar + health labels + `/goto`.
 * Returns the disposer for every listener it registered.
 */
export function mountNavigator(args: {
  pin: PinController
  options: NavOptions
  health: HealthSource
  goto: GotoSource
  openSession(id: string): void
}): () => void {
  const { pin, options, health, goto, openSession } = args
  ensureBarStyle()

  let bar: HTMLDivElement | undefined
  let disposed = false
  let filter: NavFilter = { text: '', tags: [], board: undefined }
  let boardNames: Record<string, string> = {}

  const panelRoot = (): HTMLElement | null => document.querySelector(`div.${PANEL_CLASS}`)

  /** Re-apply the active filter to the panel rows (attribute-driven, DOM-safe). */
  const applyFilter = (): void => {
    const root = panelRoot()
    if (root === null) return
    const rows = [...root.querySelectorAll<HTMLElement>(`div.${PANEL_ROW_CLASS}`)]
    const entries: NavEntry[] = rows.map((row) => ({
      id: row.dataset['id'] ?? '',
      name: row.dataset['title'] ?? '',
      tags: (row.dataset['tags'] ?? '').split(' ').filter(tag => tag !== ''),
      ...row.dataset['board'] === undefined ? {} : { boardId: row.dataset['board'] },
    }))
    const visible = new Set(filterEntries(entries, filter).map(entry => entry.id))
    for (const row of rows) {
      row.style.display = visible.has(row.dataset['id'] ?? '') ? '' : 'none'
    }
  }

  /** Refresh the health line of every pinned session row. */
  const refreshHealth = (): void => {
    if (!options.enableHealth) return
    const root = panelRoot()
    if (root === null) return
    for (const row of root.querySelectorAll<HTMLElement>(`div.${PANEL_ROW_CLASS}[data-session-id]`)) {
      const id = row.dataset['sessionId']
      if (id === undefined) continue
      let label = row.querySelector<HTMLElement>(`span.${BAR_CLASS}health`)
      const events = health.healthFor(id)
      const summary = events === undefined ? null : summarizeHealth(events)
      const text = summary === null || summary.messages === 0
        ? ''
        : `${summary.messages} msgs · ${summary.lastDirection === 'user' ? 'you' : 'ai'} · ${relative(summary.lastActivity)}`
      if (label === null) {
        label = document.createElement('span')
        label.className = `${BAR_CLASS}health`
        row.appendChild(label)
      }
      label.textContent = sanitizeLabel(text)
    }
  }

  const renderBar = (): void => {
    if (bar === undefined || disposed) return
    bar.textContent = ''
    const chips = document.createElement('div')
    chips.className = `${BAR_CLASS}chips`
    const boardChip = (label: string, boardId: string | undefined): void => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = boardId === filter.board ? `${CHIP_CLASS} ${CHIP_ACTIVE_CLASS}` : CHIP_CLASS
      button.textContent = label
      button.addEventListener('click', () => {
        filter = { ...filter, board: boardId }
        applyFilter()
        renderBar()
      })
      chips.appendChild(button)
    }
    if (options.enableBoards) {
      boardChip('All', undefined)
      const byOrder = Object.entries(pin.getBoards().byId).sort((a, b) => a[1].order - b[1].order)
      for (const [id, board] of byOrder) {
        boardNames[id] = board.name
        boardChip(board.name, id)
      }
    }
    bar.appendChild(chips)
    if (options.enableTags) {
      const tagInput = document.createElement('input')
      tagInput.className = `${BAR_CLASS}input`
      tagInput.placeholder = 'filter: text, #tag'
      tagInput.value = filter.text
      tagInput.addEventListener('input', () => {
        filter = { ...filter, text: tagInput.value }
        applyFilter()
      })
      tagInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return
        const value = tagInput.value.trim()
        if (value.startsWith('#')) {
          filter = { ...filter, tags: value.slice(1).split(',').map(tag => tag.trim()).filter(tag => tag !== '') }
          tagInput.value = ''
        }
        applyFilter()
        renderBar()
      })
      bar.appendChild(tagInput)
    }
    if (options.enableViews) {
      const viewRow = document.createElement('div')
      viewRow.className = `${BAR_CLASS}chips`
      const save = document.createElement('button')
      save.type = 'button'
      save.className = CHIP_CLASS
      save.textContent = '+ view'
      save.addEventListener('click', () => {
        void pin.saveView({
          id: `view-${Date.now()}`,
          name: filter.board !== undefined ? (boardNames[filter.board] ?? 'board') : (filter.tags[0] ?? filter.text) || `view-${pin.getViews().length + 1}`,
          text: filter.text,
          tags: filter.tags,
          ...filter.board === undefined ? {} : { board: filter.board },
        })
        renderBar()
      })
      viewRow.appendChild(save)
      for (const view of pin.getViews()) {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = CHIP_CLASS
        button.textContent = view.name
        button.addEventListener('click', () => {
          filter = { text: view.text, tags: view.tags, board: view.board }
          applyFilter()
          renderBar()
        })
        viewRow.appendChild(button)
      }
      bar.appendChild(viewRow)
    }
  }

  const sync = (): void => {
    if (disposed) return
    const root = panelRoot()
    if (root === null) {
      if (bar !== undefined) bar.style.display = 'none'
      return
    }
    if (bar === undefined) {
      bar = document.createElement('div')
      bar.className = BAR_CLASS
      document.body.appendChild(bar)
    }
    bar.style.display = 'flex'
    renderBar()
    applyFilter()
    refreshHealth()
  }

  let syncTimer: ReturnType<typeof setTimeout> | undefined
  const scheduleSync = (): void => {
    if (syncTimer !== undefined) clearTimeout(syncTimer)
    syncTimer = setTimeout(sync, 60)
  }
  const observer = new MutationObserver(scheduleSync)
  observer.observe(document.body, { childList: true, subtree: true, attributes: true })
  sync()

  // /goto: Enter on a composer draft starting with `/goto <keyword>` jumps to
  // the matching session (unique hit opens; multiple hits list; none notices).
  const onKeydown = (event: KeyboardEvent): void => {
    if (!options.enableGoto || event.key !== 'Enter' || event.isComposing) return
    const composer = event.target instanceof HTMLTextAreaElement && event.target.closest('[data-input-scroll]') !== null
      ? event.target
      : undefined
    if (composer === undefined) return
    const match = /^\/goto\s+(\S.*)$/.exec(composer.value.trim())
    if (match === null) return
    event.preventDefault()
    event.stopPropagation()
    const keyword = match[1]!
    const hits = gotoMatches(goto.entries(), keyword)
    if (hits.length === 1) {
      openSession(hits[0]!.id)
      composer.value = ''
    } else if (hits.length > 1) {
      const names = hits.map(entry => `- ${sanitizeLabel(entry.name)}`).join('\n')
      window.alert(`goto "${keyword}" matches ${hits.length} sessions:\n${names}`)
    } else {
      window.alert(`goto "${keyword}": no session title or tag matches`)
    }
  }
  window.addEventListener('keydown', onKeydown, true)

  const disposePin = pin.subscribe(scheduleSync)

  return () => {
    disposed = true
    window.removeEventListener('keydown', onKeydown, true)
    observer.disconnect()
    disposePin()
    if (syncTimer !== undefined) clearTimeout(syncTimer)
    bar?.remove()
    bar = undefined
  }
}

/** Compact relative time for the health line. */
function relative(time: number | null): string {
  if (time === null) return '—'
  const delta = Date.now() - time
  if (delta < 60_000) return 'now'
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`
  return `${Math.floor(delta / 86_400_000)}d ago`
}
