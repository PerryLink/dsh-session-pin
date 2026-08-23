// @vitest-environment jsdom
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountOverlay, type OverlayDeps, type OverlayDoc } from '../src/overlay.ts'
import type { PinReadFace, PinTranslate, SessionListFace, WorkspaceListFace } from '../src/faces.ts'
import { BADGE_CLASS, PINNED_CLASS, ROW_CONTROLS_CLASS, SWATCH_CLASS } from '../src/pin-ui-shared.ts'
import { PIN_COLOR_PALETTE } from '../src/pin-core.ts'

const T: PinTranslate = key => ({
  pin: 'Pin session',
  unpin: 'Unpin session',
  limit: 'LIMIT',
  pinWorkspace: 'Pin workspace',
  unpinWorkspace: 'Unpin workspace',
  limitWorkspace: 'LIMIT-WORKSPACE',
  colorChange: 'Change row color',
  panelTitle: 'Pinned sessions',
  panelEmpty: 'Nothing pinned yet',
  panelSessions: 'Sessions',
  panelWorkspaces: 'Workspaces',
  footerTitle: 'Pinned sessions',
  ungrouped: 'Ungrouped',
  manageRow: 'Manage',
  boardLabel: 'Board',
  tagsLabel: 'Tags',
  save: 'Save',
  close: 'Close',
}[key])

/** Flush the overlay's setTimeout-based render pass. */
const flush = async (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0))

function pinFace(initial: {
  pinned?: string[]
  workspacePinned?: string[]
  colors?: Record<string, string>
  workspaceColors?: Record<string, string>
} = {}, behavior: 'ok' | 'limit' = 'ok'): {
  face: PinReadFace
  calls: string[]
  set(next: Partial<{ pinned: string[]; workspacePinned: string[]; colors: Record<string, string>; workspaceColors: Record<string, string> }>): void
} {
  const listeners = new Set<() => void>()
  const calls: string[] = []
  let state = {
    pinned: initial.pinned ?? [],
    workspacePinned: initial.workspacePinned ?? [],
    colors: initial.colors ?? {},
    workspaceColors: initial.workspaceColors ?? {},
  }
  const notify = (): void => {
    for (const listener of [...listeners]) listener()
  }
  const toggleOf = (list: string[], id: string): string[] =>
    list.includes(id) ? list.filter(item => item !== id) : [id, ...list]
  return {
    calls,
    set(next) {
      state = { ...state, ...next }
      notify()
    },
    face: {
      getPinned: () => state.pinned,
      isPinned: id => state.pinned.includes(id),
      getWorkspacePinned: () => state.workspacePinned,
      isWorkspacePinned: id => state.workspacePinned.includes(id),
      getMaxPins: () => 2,
      toggle: async (id) => {
        calls.push(`toggle:${id}`)
        if (behavior === 'limit') return 'limit'
        state = { ...state, pinned: toggleOf(state.pinned, id) }
        notify()
        return state.pinned.includes(id) ? 'pinned' : 'unpinned'
      },
      setPinned: async (id, next) => {
        calls.push(`set:${id}:${String(next)}`)
        if (behavior === 'limit') return 'limit'
        state = { ...state, pinned: next ? [id, ...state.pinned.filter(item => item !== id)] : state.pinned.filter(item => item !== id) }
        notify()
        return next ? 'pinned' : 'unpinned'
      },
      toggleWorkspace: async (id) => {
        calls.push(`toggleWs:${id}`)
        if (behavior === 'limit') return 'limit'
        state = { ...state, workspacePinned: toggleOf(state.workspacePinned, id) }
        notify()
        return state.workspacePinned.includes(id) ? 'pinned' : 'unpinned'
      },
      setWorkspacePinned: async (id, next) => {
        state = { ...state, workspacePinned: next ? [id, ...state.workspacePinned.filter(item => item !== id)] : state.workspacePinned.filter(item => item !== id) }
        notify()
        return next ? 'pinned' : 'unpinned'
      },
      getColor: id => state.colors[id],
      getWorkspaceColor: id => state.workspaceColors[id],
      cycleColor: async (id) => {
        calls.push(`cycle:${id}`)
        const index = state.colors[id] === undefined ? -1 : (PIN_COLOR_PALETTE as readonly string[]).indexOf(state.colors[id]!)
        const next = index + 1 < PIN_COLOR_PALETTE.length ? PIN_COLOR_PALETTE[index + 1]! : undefined
        state = { ...state, colors: next === undefined ? Object.fromEntries(Object.entries(state.colors).filter(([key]) => key !== id)) : { ...state.colors, [id]: next } }
        notify()
      },
      cycleWorkspaceColor: async (id) => {
        calls.push(`cycleWs:${id}`)
        const index = state.workspaceColors[id] === undefined ? -1 : (PIN_COLOR_PALETTE as readonly string[]).indexOf(state.workspaceColors[id]!)
        const next = index + 1 < PIN_COLOR_PALETTE.length ? PIN_COLOR_PALETTE[index + 1]! : undefined
        state = { ...state, workspaceColors: next === undefined ? Object.fromEntries(Object.entries(state.workspaceColors).filter(([key]) => key !== id)) : { ...state.workspaceColors, [id]: next } }
        notify()
      },
      clearColor: async (id) => {
        calls.push(`clear:${id}`)
        state = { ...state, colors: Object.fromEntries(Object.entries(state.colors).filter(([key]) => key !== id)) }
        notify()
      },
      clearWorkspaceColor: async (id) => {
        calls.push(`clearWs:${id}`)
        state = { ...state, workspaceColors: Object.fromEntries(Object.entries(state.workspaceColors).filter(([key]) => key !== id)) }
        notify()
      },
      getBoards: () => ({ byId: {}, membership: {} }),
      getTags: () => ({}),
      getViews: () => [],
      subscribe: (listener) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    },
  }
}

function sessionsFace(entries: Array<{ id: string; displayTitle: string; blank?: boolean }>): SessionListFace {
  const listeners = new Set<() => void>()
  const byId: Record<string, { displayTitle: string; blank: boolean }> = {}
  for (const entry of entries) byId[entry.id] = { displayTitle: entry.displayTitle, blank: entry.blank ?? false }
  return {
    getSnapshot: () => ({ phase: 'ready', ids: entries.map(entry => entry.id), byId }),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

function workspacesFace(entries: Array<{ workspaceId: string; title: string }>): WorkspaceListFace {
  return {
    getSnapshot: () => ({ phase: 'ready', items: entries }),
    subscribe: () => (): void => {},
  }
}

function seedDom(): void {
  document.body.innerHTML = ''
  const tree = document.createElement('div')
  tree.setAttribute('role', 'tree')
  // Two workspace header rows (aria-expanded, no aria-selected).
  for (const title of ['Workbench', 'Archive']) {
    const row = document.createElement('div')
    row.setAttribute('role', 'treeitem')
    row.setAttribute('aria-expanded', 'true')
    const span = document.createElement('span')
    span.textContent = title
    row.appendChild(span)
    tree.appendChild(row)
  }
  // Three session rows (aria-selected).
  for (const title of ['Alpha', 'Beta', 'Alpha']) {
    const row = document.createElement('div')
    row.setAttribute('role', 'treeitem')
    row.setAttribute('aria-selected', 'true')
    const span = document.createElement('span')
    span.textContent = title
    row.appendChild(span)
    tree.appendChild(row)
  }
  document.body.appendChild(tree)
}

let disposes: Array<() => void> = []
let slotActive: boolean
let slotsListeners: Set<() => void>

function depsFor(pin: ReturnType<typeof pinFace>, warn: ReturnType<typeof vi.fn> = vi.fn()): OverlayDeps {
  return {
    sessions: sessionsFace([
      { id: 'a', displayTitle: 'Alpha' },
      { id: 'b', displayTitle: 'Beta' },
    ]),
    workspaces: workspacesFace([
      { workspaceId: 'w1', title: 'Workbench' },
      { workspaceId: 'w2', title: 'Archive' },
    ]),
    pin: pin.face,
    t: T,
    warn,
    doc: document as unknown as OverlayDoc,
    sessionSlotActive: () => slotActive,
    onSlotsChange: (listener) => {
      slotsListeners.add(listener)
      return () => {
        slotsListeners.delete(listener)
      }
    },
    raf: cb => setTimeout(cb, 0),
  }
}

function rows(): HTMLElement[] {
  return [...document.querySelectorAll('[role="treeitem"]')] as HTMLElement[]
}

beforeEach(() => {
  vi.useRealTimers()
  disposes = []
  slotActive = false
  slotsListeners = new Set()
  seedDom()
})
afterEach(() => {
  for (const dispose of disposes) dispose()
  document.body.innerHTML = ''
})

describe('mountOverlay — session rows (slot inactive)', () => {
  it('paints one [pin][swatch] set per titled row and none on rows without a match', async () => {
    const pin = pinFace()
    disposes.push(mountOverlay(depsFor(pin)))
    await flush()
    const sessionRows = rows().filter(row => row.hasAttribute('aria-selected'))
    expect(sessionRows).toHaveLength(3)
    // Three session rows, two distinct titles: every matching row gets controls.
    for (const row of sessionRows) {
      expect(row.querySelectorAll(`span.${ROW_CONTROLS_CLASS} button.${BADGE_CLASS}`)).toHaveLength(1)
      expect(row.querySelectorAll(`span.${ROW_CONTROLS_CLASS} button.${SWATCH_CLASS}`)).toHaveLength(1)
      expect(row.querySelectorAll(`button.${BADGE_CLASS}`)).toHaveLength(1)
    }
  })

  it('marks pinned rows amber and updates on pin-state changes', async () => {
    const pin = pinFace({ pinned: ['a'] })
    disposes.push(mountOverlay(depsFor(pin)))
    await flush()
    const sessionRows = rows().filter(row => row.hasAttribute('aria-selected'))
    const alphaBadges = [...sessionRows].map(row => row.querySelector(`button.${BADGE_CLASS}`)!)
    expect(alphaBadges.filter(badge => badge.classList.contains(PINNED_CLASS))).toHaveLength(2)
    pin.set({ pinned: [] })
    await flush()
    for (const badge of [...sessionRows].map(row => row.querySelector(`button.${BADGE_CLASS}`)!)) {
      expect(badge.classList.contains(PINNED_CLASS)).toBe(false)
    }
  })

  it('toggles the first matching id on badge click (duplicate-title limitation)', async () => {
    const pin = pinFace()
    disposes.push(mountOverlay(depsFor(pin)))
    await flush()
    const sessionRow = rows().find(row => row.hasAttribute('aria-selected'))!
    const firstBadge = sessionRow.querySelector(`button.${BADGE_CLASS}`) as HTMLButtonElement
    firstBadge.click()
    await flush()
    expect(pin.calls).toEqual(['toggle:a'])
  })

  it('flashes the limit copy on a rejected pin and restores it afterwards', async () => {
    vi.useFakeTimers()
    const pin = pinFace({}, 'limit')
    disposes.push(mountOverlay(depsFor(pin)))
    await vi.advanceTimersByTimeAsync(0)
    const sessionRow = rows().find(row => row.hasAttribute('aria-selected'))!
    const badge = sessionRow.querySelector(`button.${BADGE_CLASS}`) as HTMLButtonElement
    badge.click()
    await vi.advanceTimersByTimeAsync(0)
    expect(badge.title).toBe('LIMIT')
    await vi.advanceTimersByTimeAsync(1800)
    // +1ms: the restore render is scheduled from inside the flash timeout, so
    // it lands one fake-timer tick after the flash expiry.
    await vi.advanceTimersByTimeAsync(1)
    expect(badge.title).toBe('Pin session')
  })

  it('cycles the row color from the swatch and clears on Shift+click', async () => {
    const pin = pinFace()
    disposes.push(mountOverlay(depsFor(pin)))
    await flush()
    const sessionRow = rows().find(row => row.hasAttribute('aria-selected'))!
    const swatch = sessionRow.querySelector(`button.${SWATCH_CLASS}`) as HTMLButtonElement
    expect(swatch.hasAttribute('data-color')).toBe(false)
    swatch.click()
    await flush()
    expect(pin.calls).toEqual(['cycle:a'])
    pin.set({ colors: { a: PIN_COLOR_PALETTE[0] } })
    await flush()
    expect(sessionRow.querySelector(`button.${SWATCH_CLASS}`)?.getAttribute('data-color')).toBe('c0')
    const event = new MouseEvent('click', { shiftKey: true, bubbles: true })
    swatch.dispatchEvent(event)
    await flush()
    expect(pin.calls).toEqual(['cycle:a', 'clear:a'])
  })

  it('leaves a foreign (row-slot) badge untouched and removes only its own on dispose', async () => {
    const pin = pinFace()
    const row = rows().find(candidate => candidate.hasAttribute('aria-selected'))!
    // The row slot renders its badge before the overlay's first pass.
    const foreign = document.createElement('button')
    foreign.className = BADGE_CLASS
    row.insertBefore(foreign, row.firstChild)
    disposes.push(mountOverlay(depsFor(pin)))
    await flush()
    const badges = [...row.querySelectorAll(`button.${BADGE_CLASS}`)]
    // The overlay never adopts the foreign badge and never duplicates it.
    expect(badges).toHaveLength(1)
    expect(badges[0]).toBe(foreign)
    for (const dispose of disposes.splice(0)) dispose()
    expect(row.querySelectorAll(`button.${BADGE_CLASS}`)).toHaveLength(1)
  })

  it('retires its own controls when a row-slot badge takes the row over later', async () => {
    const pin = pinFace()
    const row = rows().find(candidate => candidate.hasAttribute('aria-selected'))!
    disposes.push(mountOverlay(depsFor(pin)))
    await flush()
    expect(row.querySelectorAll(`span.${ROW_CONTROLS_CLASS}`)).toHaveLength(1)
    // The row slot mounts its badge after the overlay already painted.
    const foreign = document.createElement('button')
    foreign.className = BADGE_CLASS
    row.insertBefore(foreign, row.firstChild)
    // The observer's render lands one macrotask after the mutation.
    await flush()
    await flush()
    expect(row.querySelectorAll(`span.${ROW_CONTROLS_CLASS}`)).toHaveLength(0)
    expect(row.querySelectorAll(`button.${BADGE_CLASS}`)).toHaveLength(1)
    expect(row.querySelector(`button.${BADGE_CLASS}`)).toBe(foreign)
  })

  it('skips blank sessions entirely', async () => {
    const pin = pinFace()
    disposes.push(mountOverlay({
      ...depsFor(pin),
      sessions: sessionsFace([{ id: 'a', displayTitle: 'Alpha', blank: true }]),
    }))
    await flush()
    const sessionRows = rows().filter(row => row.hasAttribute('aria-selected'))
    expect(sessionRows.map(row => row.querySelector(`span.${ROW_CONTROLS_CLASS}`)).every(el => el === null)).toBe(true)
  })
})

describe('mountOverlay — slot-active gate (the duplicate-pin fix)', () => {
  it('never paints session rows while the row slot is declared', async () => {
    slotActive = true
    const pin = pinFace()
    disposes.push(mountOverlay(depsFor(pin)))
    await flush()
    const sessionRows = rows().filter(row => row.hasAttribute('aria-selected'))
    for (const row of sessionRows) {
      expect(row.querySelectorAll(`span.${ROW_CONTROLS_CLASS}`)).toHaveLength(0)
    }
  })

  it('retires already-painted session controls when the slot declares later', async () => {
    const pin = pinFace()
    disposes.push(mountOverlay(depsFor(pin)))
    await flush()
    const sessionRows = rows().filter(row => row.hasAttribute('aria-selected'))
    expect(sessionRows[0]!.querySelectorAll(`span.${ROW_CONTROLS_CLASS}`)).toHaveLength(1)
    slotActive = true
    for (const listener of [...slotsListeners]) listener()
    await flush()
    for (const row of sessionRows) {
      expect(row.querySelectorAll(`span.${ROW_CONTROLS_CLASS}`)).toHaveLength(0)
    }
    // Workspace rows are unaffected by the gate.
    const workspaceRow = rows().find(row => row.hasAttribute('aria-expanded'))!
    expect(workspaceRow.querySelectorAll(`span.${ROW_CONTROLS_CLASS}`)).toHaveLength(1)
  })
})

describe('mountOverlay — workspace rows', () => {
  it('paints [pin][swatch] on workspace header rows matched by label', async () => {
    const pin = pinFace()
    disposes.push(mountOverlay(depsFor(pin)))
    await flush()
    const workspaceRows = rows().filter(row => row.hasAttribute('aria-expanded') && !row.hasAttribute('aria-selected'))
    expect(workspaceRows).toHaveLength(2)
    for (const row of workspaceRows) {
      expect(row.querySelectorAll(`button.${BADGE_CLASS}`)).toHaveLength(1)
      expect(row.querySelectorAll(`button.${SWATCH_CLASS}`)).toHaveLength(1)
    }
  })

  it('toggles the workspace pin (id-keyed) and marks it amber', async () => {
    const pin = pinFace({ workspacePinned: ['w1'] })
    disposes.push(mountOverlay(depsFor(pin)))
    await flush()
    const workbench = rows().find(row => row.textContent === 'Workbench')!
    const badge = workbench.querySelector(`button.${BADGE_CLASS}`) as HTMLButtonElement
    expect(badge.classList.contains(PINNED_CLASS)).toBe(true)
    badge.click()
    await flush()
    expect(pin.calls).toEqual(['toggleWs:w1'])
  })

  it('cycles the workspace color and clears on Shift+click', async () => {
    const pin = pinFace()
    disposes.push(mountOverlay(depsFor(pin)))
    await flush()
    const workbench = rows().find(row => row.textContent === 'Workbench')!
    const swatch = workbench.querySelector(`button.${SWATCH_CLASS}`) as HTMLButtonElement
    swatch.click()
    await flush()
    expect(pin.calls).toEqual(['cycleWs:w1'])
    pin.set({ workspaceColors: { w1: PIN_COLOR_PALETTE[1] } })
    await flush()
    expect(workbench.querySelector(`button.${SWATCH_CLASS}`)?.getAttribute('data-color')).toBe('c1')
    const event = new MouseEvent('click', { shiftKey: true, bubbles: true })
    swatch.dispatchEvent(event)
    await flush()
    expect(pin.calls).toEqual(['cycleWs:w1', 'clearWs:w1'])
  })

  it('leaves workspace rows without a label match alone', async () => {
    const pin = pinFace()
    const row = document.createElement('div')
    row.setAttribute('role', 'treeitem')
    row.setAttribute('aria-expanded', 'true')
    row.textContent = 'Unknown group'
    document.querySelector('[role="tree"]')!.appendChild(row)
    disposes.push(mountOverlay(depsFor(pin)))
    await flush()
    expect(row.querySelectorAll(`span.${ROW_CONTROLS_CLASS}`)).toHaveLength(0)
  })
})
