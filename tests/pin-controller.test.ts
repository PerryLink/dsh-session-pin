// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest'
import { PinController, type PinListSource, type PinReorderer, type PinWorkspaceSource } from '../src/pin-controller.ts'
import type { PinRemoteLike } from '../src/faces.ts'
import type { PinStore } from '../src/pin-store.ts'
import { emptyStoredPins, PIN_COLOR_PALETTE } from '../src/pin-core.ts'

interface Harness {
  controller: PinController
  store: PinStore
  storeListeners: Set<() => void>
  listListeners: Set<() => void>
  workspaceListeners: Set<() => void>
  setPins(pinned: string[]): void
  setList(phase: string, ids: readonly string[]): void
  setWorkspaceList(phase: string, ids: readonly string[]): void
  moves: string[][]
  workspaceMoves: string[][]
  writeCalls: Array<Record<string, unknown>>
}

function harness(initial: {
  pinned?: string[]
  workspacePinned?: string[]
  colors?: Record<string, string>
  workspaceColors?: Record<string, string>
  maxPins?: number
  reorderOnLoad?: boolean
  pruneStale?: boolean
  boards?: { byId: Record<string, { name: string; order: number }>; membership: Record<string, string> }
  tags?: Record<string, string[]>
  views?: Array<{ id: string; name: string; text: string; tags: string[]; board?: string }>
} = {}, remote?: {
  remote: PinRemoteLike
  calls: Array<{ id: string; pinned: boolean }>
}): Harness {
  const storeListeners = new Set<() => void>()
  const listListeners = new Set<() => void>()
  const workspaceListeners = new Set<() => void>()
  const writeCalls: Array<Record<string, unknown>> = []
  let state = {
    pinned: initial.pinned ?? [],
    workspacePinned: initial.workspacePinned ?? [],
    colors: initial.colors ?? {},
    workspaceColors: initial.workspaceColors ?? {},
    boards: initial.boards ?? { byId: {}, membership: {} },
    tags: initial.tags ?? {},
    views: initial.views ?? [],
  }
  let listPhase = 'pending'
  let listIds: readonly string[] = []
  let workspacePhase = 'pending'
  let workspaceIds: readonly string[] = []
  const store: PinStore = {
    read: () => ({
      ...state,
      local: false,
      maxPins: initial.maxPins ?? 0,
      reorderOnLoad: initial.reorderOnLoad ?? true,
      pruneStale: initial.pruneStale ?? true,
      enableBoards: true,
      enableTags: true,
      enableViews: true,
      enableHealth: true,
      enableGoto: true,
    }),
    write: async (section) => {
      writeCalls.push({ ...section })
      for (const [field, value] of Object.entries(section)) {
        ;(state as Record<string, unknown>)[field] = value
      }
    },
    subscribe: (listener) => {
      storeListeners.add(listener)
      return () => {
        storeListeners.delete(listener)
      }
    },
  }
  const list: PinListSource = {
    getSnapshot: () => ({ phase: listPhase, ids: listIds }),
    subscribe: (listener) => {
      listListeners.add(listener)
      return () => {
        listListeners.delete(listener)
      }
    },
  }
  const workspaceList: PinWorkspaceSource = {
    getSnapshot: () => ({ phase: workspacePhase, ids: workspaceIds }),
    subscribe: (listener) => {
      workspaceListeners.add(listener)
      return () => {
        workspaceListeners.delete(listener)
      }
    },
  }
  const moves: string[][] = []
  const workspaceMoves: string[][] = []
  const reorderer: PinReorderer = {
    moveToTop: async (id) => {
      moves.push([id])
    },
    reapplyOrder: (pinned) => {
      moves.push([...pinned])
    },
    moveWorkspaceToTop: async (id) => {
      workspaceMoves.push([id])
    },
    reapplyWorkspaceOrder: (pinned) => {
      workspaceMoves.push([...pinned])
    },
  }
  const controller = new PinController(store, list, workspaceList, reorderer, remote?.remote)
  return {
    controller,
    store,
    storeListeners,
    listListeners,
    workspaceListeners,
    moves,
    workspaceMoves,
    writeCalls,
    setPins: (next) => {
      state = { ...state, pinned: [...next] }
      for (const listener of [...storeListeners]) listener()
    },
    setList: (phase, ids) => {
      listPhase = phase
      listIds = ids
      for (const listener of [...listListeners]) listener()
    },
    setWorkspaceList: (phase, ids) => {
      workspacePhase = phase
      workspaceIds = ids
      for (const listener of [...workspaceListeners]) listener()
    },
  }
}

/** Remote double: commit behavior configurable per call. */
function remoteDouble(ok: boolean): { remote: PinRemoteLike; calls: Array<{ id: string; pinned: boolean }> } {
  const calls: Array<{ id: string; pinned: boolean }> = []
  return {
    calls,
    remote: {
      setPinned: async (id, pinned) => {
        calls.push({ id, pinned })
        return ok ? { ok: true } : { ok: false }
      },
      reenable: vi.fn(),
    },
  }
}

describe('PinController', () => {
  it('toggles a session pin on (with move-to-top) and off', async () => {
    const h = harness({ pinned: [] })
    h.controller.start()
    h.moves.length = 0
    await expect(h.controller.toggle('a')).resolves.toBe('pinned')
    expect(h.controller.getPinned()).toEqual(['a'])
    expect(h.moves).toEqual([['a']])
    await expect(h.controller.toggle('a')).resolves.toBe('unpinned')
    expect(h.controller.getPinned()).toEqual([])
    expect(h.moves).toEqual([['a']])
  })

  it('rejects pinning beyond the limit without blocking unpin', async () => {
    const h = harness({ pinned: ['a', 'b'], maxPins: 2 })
    h.controller.start()
    await expect(h.controller.toggle('c')).resolves.toBe('limit')
    expect(h.controller.getPinned()).toEqual(['a', 'b'])
    expect(h.writeCalls).toEqual([])
    await expect(h.controller.toggle('b')).resolves.toBe('unpinned')
  })

  it('adopts store changes republished through the subscription', () => {
    const h = harness({ pinned: ['a'] })
    h.controller.start()
    h.setPins(['c', 'a'])
    expect(h.controller.getPinned()).toEqual(['c', 'a'])
    expect(h.controller.isPinned('c')).toBe(true)
  })

  it('prunes stale session ids once the list reaches the ready phase', () => {
    const h = harness({ pinned: ['a', 'b', 'c'] })
    h.controller.start()
    h.setList('pending', [])
    expect(h.controller.getPinned()).toEqual(['a', 'b', 'c'])
    h.setList('ready', ['a', 'c'])
    expect(h.controller.getPinned()).toEqual(['a', 'c'])
    expect(h.writeCalls).toEqual([{ pinned: ['a', 'c'], colors: {} }])
  })

  it('keeps stale ids when pruning is disabled', () => {
    const h = harness({ pinned: ['a', 'b'], pruneStale: false })
    h.controller.start()
    h.setList('ready', ['a'])
    expect(h.controller.getPinned()).toEqual(['a', 'b'])
    expect(h.writeCalls).toEqual([])
  })

  it('re-asserts order on every ready-phase list change (idempotence lives in the reorderer), never on store changes', () => {
    const h = harness({ pinned: ['b', 'a'], reorderOnLoad: true })
    h.controller.start()
    h.moves.length = 0
    h.setList('ready', ['x', 'a', 'b'])
    expect(h.moves).toEqual([['b', 'a']])
    h.setList('ready', ['x', 'a', 'b'])
    expect(h.moves).toEqual([['b', 'a'], ['b', 'a']])
    h.setPins(['b', 'a'])
    expect(h.moves).toEqual([['b', 'a'], ['b', 'a']])
  })

  it('skips the initial reorder when disabled', () => {
    const h = harness({ pinned: ['a'], reorderOnLoad: false })
    h.controller.start()
    h.moves.length = 0
    h.setList('ready', ['x', 'a'])
    expect(h.moves).toEqual([])
    expect(() => h.controller.reapplyOrder()).not.toThrow()
    expect(h.moves).toEqual([])
  })

  it('reapplyOrder() forwards the current pin sets (idempotence lives in the reorderer)', () => {
    const h = harness({ pinned: ['a'], workspacePinned: ['w'] })
    h.controller.start()
    h.moves.length = 0
    h.workspaceMoves.length = 0
    h.controller.reapplyOrder()
    expect(h.moves).toEqual([['a']])
    expect(h.workspaceMoves).toEqual([['w']])
  })

  it('notifies subscribers on adopted and refreshed sets, and stop() silences them', () => {
    const h = harness({ pinned: ['a'] })
    h.controller.start()
    const listener = vi.fn()
    const dispose = h.controller.subscribe(listener)
    h.setPins(['a', 'b'])
    expect(listener).toHaveBeenCalledTimes(1)
    dispose()
    h.setPins(['a'])
    expect(listener).toHaveBeenCalledTimes(1)
    h.controller.stop()
    h.setPins(['z'])
    expect(h.controller.getPinned()).toEqual(['a'])
  })

  it('start() is idempotent', () => {
    const h = harness({ pinned: ['a'] })
    h.controller.start()
    h.controller.start()
    h.setPins(['a', 'b'])
    expect(h.controller.getPinned()).toEqual(['a', 'b'])
  })

  it('setPinned commits an explicit state and no-ops on the same state', async () => {
    const h = harness({ pinned: [] })
    h.controller.start()
    h.moves.length = 0
    await expect(h.controller.setPinned('a', true)).resolves.toBe('pinned')
    expect(h.controller.getPinned()).toEqual(['a'])
    expect(h.moves).toEqual([['a']])
    h.writeCalls.length = 0
    await expect(h.controller.setPinned('a', true)).resolves.toBe('pinned')
    expect(h.writeCalls).toEqual([])
    await expect(h.controller.setPinned('a', false)).resolves.toBe('unpinned')
    expect(h.controller.getPinned()).toEqual([])
  })

  it('gates an explicit pin on the limit', async () => {
    const h = harness({ pinned: ['a', 'b'], maxPins: 2 })
    h.controller.start()
    await expect(h.controller.setPinned('c', true)).resolves.toBe('limit')
    expect(h.controller.getPinned()).toEqual(['a', 'b'])
  })

  it('commits through the remote and mirrors into the store', async () => {
    const remote = remoteDouble(true)
    const h = harness({ pinned: [] }, remote)
    h.controller.start()
    h.moves.length = 0
    await expect(h.controller.setPinned('a', true)).resolves.toBe('pinned')
    expect(remote.calls).toEqual([{ id: 'a', pinned: true }])
    expect(h.writeCalls).toEqual([{ pinned: ['a'] }])
    expect(h.moves).toEqual([['a']])
    await expect(h.controller.setPinned('a', false)).resolves.toBe('unpinned')
    expect(remote.calls).toEqual([{ id: 'a', pinned: true }, { id: 'a', pinned: false }])
  })

  it('falls back to the store when the remote fails', async () => {
    const remote = remoteDouble(false)
    const h = harness({ pinned: [] }, remote)
    h.controller.start()
    await expect(h.controller.setPinned('a', true)).resolves.toBe('pinned')
    expect(remote.calls).toEqual([{ id: 'a', pinned: true }])
    expect(h.writeCalls).toEqual([{ pinned: ['a'] }])
    expect(h.controller.getPinned()).toEqual(['a'])
  })
})

describe('PinController workspace level', () => {
  it('toggles a workspace pin on (with move-to-top) and off, store-only', async () => {
    const remote = remoteDouble(true)
    const h = harness({ workspacePinned: [] }, remote)
    h.controller.start()
    h.workspaceMoves.length = 0
    await expect(h.controller.toggleWorkspace('w1')).resolves.toBe('pinned')
    expect(h.controller.getWorkspacePinned()).toEqual(['w1'])
    expect(h.workspaceMoves).toEqual([['w1']])
    expect(remote.calls).toEqual([]) // never rides the session log channel
    await expect(h.controller.toggleWorkspace('w1')).resolves.toBe('unpinned')
    expect(h.controller.getWorkspacePinned()).toEqual([])
  })

  it('gates workspace pins on the same per-level limit', async () => {
    const h = harness({ workspacePinned: ['w1', 'w2'], maxPins: 2 })
    h.controller.start()
    await expect(h.controller.setWorkspacePinned('w3', true)).resolves.toBe('limit')
    expect(h.writeCalls).toEqual([])
  })

  it('prunes stale workspace pins and colors once the workspace list is ready', () => {
    const h = harness({
      workspacePinned: ['w1', 'w2'],
      workspaceColors: { w1: PIN_COLOR_PALETTE[0], ghost: PIN_COLOR_PALETTE[1] },
    })
    h.controller.start()
    h.setWorkspaceList('ready', ['w1'])
    expect(h.controller.getWorkspacePinned()).toEqual(['w1'])
    expect(h.controller.getWorkspaceColor('ghost')).toBeUndefined()
    expect(h.writeCalls).toEqual([{ workspacePinned: ['w1'], workspaceColors: { w1: PIN_COLOR_PALETTE[0] } }])
  })
})

describe('PinController row colors', () => {
  it('cycles session colors through the palette and wraps to none', async () => {
    const h = harness({ colors: {} })
    h.controller.start()
    h.writeCalls.length = 0
    await h.controller.cycleColor('a')
    expect(h.controller.getColor('a')).toBe(PIN_COLOR_PALETTE[0])
    await h.controller.cycleColor('a')
    expect(h.controller.getColor('a')).toBe(PIN_COLOR_PALETTE[1])
    await h.controller.clearColor('a')
    expect(h.controller.getColor('a')).toBeUndefined()
    expect(h.writeCalls.length).toBe(3)
  })

  it('cycles the last palette color back to none', async () => {
    const h = harness({ colors: { a: PIN_COLOR_PALETTE[PIN_COLOR_PALETTE.length - 1] } })
    h.controller.start()
    await h.controller.cycleColor('a')
    expect(h.controller.getColor('a')).toBeUndefined()
  })

  it('cycles workspace colors independently', async () => {
    const h = harness({ workspaceColors: {} })
    h.controller.start()
    await h.controller.cycleWorkspaceColor('w')
    expect(h.controller.getWorkspaceColor('w')).toBe(PIN_COLOR_PALETTE[0])
    await h.controller.clearWorkspaceColor('w')
    expect(h.controller.getWorkspaceColor('w')).toBeUndefined()
  })

  it('prunes session colors with the session list', () => {
    const h = harness({ pinned: ['a'], colors: { a: PIN_COLOR_PALETTE[0], ghost: PIN_COLOR_PALETTE[1] } })
    h.controller.start()
    h.setList('ready', ['a'])
    expect(h.controller.getColor('ghost')).toBeUndefined()
    expect(h.controller.getColor('a')).toBe(PIN_COLOR_PALETTE[0])
  })
})

describe('subscribe survives an unbound call (useSyncExternalStore)', () => {
  it('keeps working when the method reference is passed bare', () => {
    const h = harness({})
    const bare = h.controller.subscribe
    const listener = vi.fn()
    const dispose = bare(listener)
    h.controller.start()
    h.setPins(['a'])
    expect(listener).toHaveBeenCalled()
    dispose()
    const callsAfterDispose = listener.mock.calls.length
    h.setPins(['b'])
    expect(listener).toHaveBeenCalledTimes(callsAfterDispose)
  })
})

describe('PinController boards & tags', () => {
  it('creates, renames, removes boards, assigns pins, and tags entities through the store', async () => {
    const h = harness({})
    h.controller.start()
    await h.controller.createBoard('release', 'Release')
    expect(h.controller.getBoards().byId['release']?.name).toBe('Release')
    await h.controller.renameBoard('release', 'This Week')
    expect(h.controller.getBoards().byId['release']?.name).toBe('This Week')
    await h.controller.assignBoard('s1', 'release')
    expect(h.controller.getBoards().membership['s1']).toBe('release')
    await h.controller.setTags('s1', ['release', '  research '])
    expect(h.controller.getTags()['s1']).toEqual(['release', 'research'])
    await h.controller.removeBoard('release')
    expect(h.controller.getBoards().byId['release']).toBeUndefined()
    expect(h.controller.getBoards().membership['s1']).toBeUndefined()
    expect(h.writeCalls.some(call => 'boards' in call)).toBe(true)
    expect(h.writeCalls.some(call => 'tags' in call)).toBe(true)
  })

  it('persists a drag-reordered board sequence', async () => {
    const h = harness({})
    h.controller.start()
    await h.controller.createBoard('a', 'A')
    await h.controller.createBoard('b', 'B')
    await h.controller.createBoard('c', 'C')
    await h.controller.reorderBoards(['c', 'a'])
    const ordered = Object.entries(h.controller.getBoards().byId)
      .sort((x, y) => x[1].order - y[1].order)
      .map(([id]) => id)
    expect(ordered).toEqual(['c', 'a', 'b'])
  })
})
