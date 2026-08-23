// @vitest-environment jsdom
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mountNavigator } from '../src/nav-ui.ts'
import { PANEL_CLASS, PANEL_ROW_CLASS } from '../src/pin-ui-shared.ts'
import type { PinController } from '../src/pin-controller.ts'

const BAR_SELECTOR = 'div.__dsh-session-pin-nav__'

/** A PinController-shaped double recording every organizer write. */
function fakePin() {
  const listeners = new Set<() => void>()
  const boards: {
    byId: Record<string, { name: string; order: number }>
    membership: Record<string, string>
  } = {
    byId: {
      work: { name: 'Work', order: 0 },
      study: { name: 'Study', order: 1 },
    },
    membership: {},
  }
  const calls: string[] = []
  const notify = (): void => {
    for (const listener of [...listeners]) listener()
  }
  return {
    calls,
    getBoards: () => boards,
    getTags: () => ({} as Record<string, string[]>),
    getViews: () => [],
    getPinned: () => [],
    getWorkspacePinned: () => [],
    createBoard: async (id: string, name: string): Promise<void> => {
      calls.push(`create:${id}:${name}`)
      boards.byId[id] = { name, order: Object.keys(boards.byId).length }
      notify()
    },
    renameBoard: async (id: string, name: string): Promise<void> => {
      calls.push(`rename:${id}:${name}`)
      boards.byId[id] = { name, order: boards.byId[id]!.order }
      notify()
    },
    removeBoard: async (id: string): Promise<void> => {
      calls.push(`remove:${id}`)
      delete boards.byId[id]
      notify()
    },
    reorderBoards: async (ids: readonly string[]): Promise<void> => {
      calls.push(`reorder:${ids.join(',')}`)
      notify()
    },
    saveView: async (): Promise<void> => {
      notify()
    },
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/** A panel root with one row so the navigator bar renders beside it. */
function setupPanel(): void {
  const panel = document.createElement('div')
  panel.className = PANEL_CLASS
  const row = document.createElement('div')
  row.className = PANEL_ROW_CLASS
  row.dataset.id = 's1'
  row.dataset.title = 'Session 1'
  row.dataset.tags = ''
  panel.appendChild(row)
  document.body.appendChild(panel)
}

function buttonByText(root: Element, text: string): HTMLButtonElement {
  const button = [...root.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent === text)
  if (button === undefined) throw new Error(`button "${text}" not found`)
  return button
}

/** Settle the microtask chain after a controller write (`void promise.then(renderBar)`). */
const settle = async (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0))

/** Mount the navigator over one fake pin; the cast crosses the face boundary once. */
function mount(pin: ReturnType<typeof fakePin>): () => void {
  return mountNavigator({
    pin: pin as unknown as PinController,
    options: { enableBoards: true, enableTags: true, enableViews: true, enableHealth: false, enableGoto: true },
    health: { healthFor: () => undefined },
    goto: { entries: () => [] },
    openSession: () => {},
  })
}

describe('mountNavigator board management', () => {
  let dispose: (() => void) | undefined

  beforeEach(() => {
    setupPanel()
    ;(window as unknown as { prompt: () => string | null }).prompt = () => 'Release Week'
    ;(window as unknown as { confirm: () => boolean }).confirm = () => true
  })

  afterEach(() => {
    dispose?.()
    dispose = undefined
    document.body.innerHTML = ''
  })

  it('renders board chips with create/rename/delete affordances', () => {
    const pin = fakePin()
    dispose = mount(pin)
    const bar = document.querySelector(BAR_SELECTOR)
    expect(bar).not.toBeNull()
    expect(buttonByText(bar!, 'All')).toBeDefined()
    expect(buttonByText(bar!, 'Work')).toBeDefined()
    expect(buttonByText(bar!, 'Study')).toBeDefined()
    expect(buttonByText(bar!, '+ board')).toBeDefined()
    expect(buttonByText(bar!, '✎')).toBeDefined()
    expect(buttonByText(bar!, '✕')).toBeDefined()
  })

  it('creates a board from the + board chip with a suggested kebab id', async () => {
    const pin = fakePin()
    dispose = mount(pin)
    buttonByText(document.querySelector(BAR_SELECTOR)!, '+ board').click()
    await settle()
    expect(pin.calls).toContain('create:release-week:Release Week')
  })

  it('renames and deletes a board from the chip affordances', async () => {
    const pin = fakePin()
    dispose = mount(pin)
    const bar = document.querySelector(BAR_SELECTOR)!
    // The rename/delete buttons render after each board chip; grab all of them.
    const affordances = [...bar.querySelectorAll<HTMLButtonElement>('button')].filter(item => item.textContent === '✎' || item.textContent === '✕')
    expect(affordances).toHaveLength(4) // 2 boards × (rename + delete)
    affordances[0]!.click() // ✎ on Work
    await settle()
    expect(pin.calls).toContain('rename:work:Release Week')
    affordances[3]!.click() // ✕ on Study
    await settle()
    expect(pin.calls).toContain('remove:study')
  })

  it('drag-reorders boards by dropping one chip onto another', async () => {
    const pin = fakePin()
    dispose = mount(pin)
    const bar = document.querySelector(BAR_SELECTOR)!
    const study = buttonByText(bar, 'Study')
    const work = buttonByText(bar, 'Work')
    study.dispatchEvent(new Event('dragstart', { bubbles: true }))
    work.dispatchEvent(new Event('drop', { bubbles: true }))
    await settle()
    expect(pin.calls).toContain('reorder:study,work')
  })
})
