// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest'
import { createPinStore, STORAGE_KEY, type PinScope, type PinSection, type StorageEventsLike, type StorageLike } from '../src/pin-store.ts'
import { emptyStoredPins, PIN_COLOR_PALETTE } from '../src/pin-core.ts'

/** One settings-scope snapshot. */
type ScopeSnapshot = {
  mode: 'host' | 'memory'
  status: 'loading' | 'ready' | 'unavailable'
  value?: PinSection
}

/** In-memory storage double with event plumbing. */
function storageDouble(initial: Record<string, string> = {}): {
  storage: StorageLike
  events: StorageEventsLike
  emit(key: string | null): void
  map: Map<string, string>
} {
  const map = new Map(Object.entries(initial))
  const listeners = new Set<(event: { key: string | null }) => void>()
  return {
    map,
    storage: {
      getItem: key => map.get(key) ?? null,
      setItem: (key, value) => {
        map.set(key, value)
      },
    },
    events: {
      addEventListener: (_type, listener) => {
        listeners.add(listener)
      },
      removeEventListener: (_type, listener) => {
        listeners.delete(listener)
      },
    },
    emit: key => {
      for (const listener of [...listeners]) listener({ key })
    },
  }
}

function scopeDouble(initial: Partial<ScopeSnapshot> = {}): {
  scope: PinScope
  set(value: Partial<ScopeSnapshot>): void
  setters: Array<{ field: string; value: unknown }>
} {
  const listeners = new Set<() => void>()
  const setters: Array<{ field: string; value: unknown }> = []
  let snapshot: ScopeSnapshot = {
    mode: 'host',
    status: 'ready',
    ...initial,
  }
  return {
    setters,
    scope: {
      getSnapshot: () => snapshot,
      subscribe: (listener) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
      set: async (field, value) => {
        setters.push({ field, value })
        snapshot = {
          ...snapshot,
          value: { ...(snapshot.value ?? {}), [field]: value },
        }
        for (const listener of [...listeners]) listener()
      },
    },
    set(value) {
      snapshot = { ...snapshot, ...value }
      for (const listener of [...listeners]) listener()
    },
  }
}

describe('createPinStore', () => {
  it('reads both pin levels, colors, and policy from the host settings snapshot', () => {
    const { scope } = scopeDouble({
      value: {
        pinned: ['a', 'b'],
        workspacePinned: ['w1'],
        colors: { a: PIN_COLOR_PALETTE[0] },
        workspaceColors: { w1: PIN_COLOR_PALETTE[3] },
        maxPins: 3,
        reorderOnLoad: false,
        pruneStale: false,
      },
    })
    const { storage, events } = storageDouble()
    const store = createPinStore(scope, storage, events)
    expect(store.read()).toEqual({
      pinned: ['a', 'b'],
      workspacePinned: ['w1'],
      colors: { a: PIN_COLOR_PALETTE[0] },
      workspaceColors: { w1: PIN_COLOR_PALETTE[3] },
      local: false, maxPins: 3, reorderOnLoad: false, pruneStale: false,
    })
  })

  it('applies host-mode defaults for absent policy fields', () => {
    const { scope } = scopeDouble({ value: { pinned: ['a'] } })
    const { storage, events } = storageDouble()
    const store = createPinStore(scope, storage, events)
    expect(store.read()).toEqual({
      pinned: ['a'], workspacePinned: [], colors: {}, workspaceColors: {},
      local: false, maxPins: 0, reorderOnLoad: true, pruneStale: true,
    })
  })

  it('degrades to browser-local storage in memory mode with unlimited policy', () => {
    const { scope } = scopeDouble({ mode: 'memory', status: 'unavailable', value: undefined })
    const { storage, events } = storageDouble({
      [STORAGE_KEY]: JSON.stringify({ v: 2, ...emptyStoredPins(), pinned: ['x'] }),
    })
    const store = createPinStore(scope, storage, events)
    expect(store.read()).toEqual({
      ...emptyStoredPins(), pinned: ['x'], local: true, maxPins: 0, reorderOnLoad: true, pruneStale: true,
    })
  })

  it('reads the legacy bare-array document from browser-local storage', () => {
    const { scope } = scopeDouble({ status: 'unavailable' })
    const { storage, events } = storageDouble({ [STORAGE_KEY]: JSON.stringify(['legacy']) })
    const store = createPinStore(scope, storage, events)
    expect(store.read().pinned).toEqual(['legacy'])
    expect(store.read().workspacePinned).toEqual([])
    expect(store.read().colors).toEqual({})
  })

  it('writes the v2 envelope in local mode and merges partial writes', () => {
    const { scope } = scopeDouble({ status: 'unavailable' })
    const { storage, events } = storageDouble({
      [STORAGE_KEY]: JSON.stringify({ v: 2, ...emptyStoredPins(), pinned: ['a'], colors: { a: PIN_COLOR_PALETTE[0] } }),
    })
    const store = createPinStore(scope, storage, events)
    void store.write({ workspacePinned: ['w'], colors: { a: PIN_COLOR_PALETTE[5] } })
    const doc = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as unknown
    expect(doc).toEqual({
      v: 2,
      pinned: ['a'],
      workspacePinned: ['w'],
      colors: { a: PIN_COLOR_PALETTE[5] },
      workspaceColors: {},
    })
  })

  it('writes through the settings scope per field in host mode', async () => {
    const { scope, setters } = scopeDouble({ value: { pinned: [] } })
    const { storage, events } = storageDouble()
    const store = createPinStore(scope, storage, events)
    await store.write({ pinned: ['a'], colors: { a: PIN_COLOR_PALETTE[1] } })
    expect(setters).toEqual([
      { field: 'pinned', value: ['a'] },
      { field: 'colors', value: { a: PIN_COLOR_PALETTE[1] } },
    ])
  })

  it('republishes on scope changes and same-key storage events only', () => {
    const { scope } = scopeDouble({ status: 'unavailable' })
    const { storage, events, emit } = storageDouble()
    const store = createPinStore(scope, storage, events)
    const listener = vi.fn()
    const dispose = store.subscribe(listener)
    emit('other-key')
    expect(listener).not.toHaveBeenCalled()
    emit(STORAGE_KEY)
    expect(listener).toHaveBeenCalledTimes(1)
    emit(null)
    expect(listener).toHaveBeenCalledTimes(2)
    dispose()
    emit(STORAGE_KEY)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('switches to the host store live when the transport becomes ready', () => {
    const { scope, set } = scopeDouble({ status: 'unavailable' })
    const { storage, events } = storageDouble({
      [STORAGE_KEY]: JSON.stringify({ v: 2, ...emptyStoredPins(), pinned: ['local'] }),
    })
    const store = createPinStore(scope, storage, events)
    expect(store.read().local).toBe(true)
    set({ mode: 'host', status: 'ready', value: { pinned: ['host'], maxPins: 2 } })
    expect(store.read()).toEqual({
      ...emptyStoredPins(), pinned: ['host'], local: false, maxPins: 2, reorderOnLoad: true, pruneStale: true,
    })
  })
})
