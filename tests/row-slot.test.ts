// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest'
import { mountRowSlot, ROW_SLOT_KEY, rowSlotDeclared, type RowSlotRegistryLike } from '../src/row-slot.ts'
import type { PinReadFace } from '../src/faces.ts'

/** Minimal pin read face: the badge is never rendered in these tests, so only the shape matters. */
function fakePin(): PinReadFace {
  return {
    getPinned: () => [],
    isPinned: () => false,
    getWorkspacePinned: () => [],
    isWorkspacePinned: () => false,
    getMaxPins: () => 0,
    toggle: async () => 'unpinned' as const,
    setPinned: async () => 'unpinned' as const,
    toggleWorkspace: async () => 'unpinned' as const,
    setWorkspacePinned: async () => 'unpinned' as const,
    getColor: () => undefined,
    getWorkspaceColor: () => undefined,
    cycleColor: async (): Promise<void> => {},
    cycleWorkspaceColor: async (): Promise<void> => {},
    clearColor: async (): Promise<void> => {},
    clearWorkspaceColor: async (): Promise<void> => {},
    getBoards: () => ({ byId: {}, membership: {} }),
    getTags: () => ({}),
    getViews: () => [],
    subscribe: () => (): void => {},
  }
}

describe('row-slot degrade (0.1.2-alpha.1 hosts declare no sessions.row.action)', () => {
  it('rowSlotDeclared reports false when the registry carries no entry for the key', () => {
    expect(rowSlotDeclared({ snapshot: () => [] } as unknown as RowSlotRegistryLike)).toBe(false)
    expect(rowSlotDeclared({ snapshot: () => [{ name: ROW_SLOT_KEY, id: 'owner' }] } as unknown as RowSlotRegistryLike)).toBe(true)
  })

  it('mountRowSlot defers registration through inject and never registers while the slot is undeclared', () => {
    const register = vi.fn(() => (): void => {})
    let pending: (() => () => void) | undefined
    const inject = vi.fn((_key: string, callback: () => () => void) => {
      pending = callback // the registry would call this only on slot declaration
      return (): void => {
        pending = undefined
      }
    })
    const slots = { inject, register, snapshot: () => [] } as unknown as RowSlotRegistryLike
    const dispose = mountRowSlot({ slots, pin: fakePin(), t: key => key })
    expect(inject).toHaveBeenCalledWith(ROW_SLOT_KEY, expect.any(Function))
    expect(register).not.toHaveBeenCalled()
    // Disposing cancels the pending wait without ever touching register.
    dispose()
    expect(pending).toBeUndefined()
  })

  it('registers the badge once the slot declares (deferred activation)', () => {
    const register = vi.fn(() => (): void => {})
    let pending: (() => () => void) | undefined
    const inject = vi.fn((_key: string, callback: () => () => void) => {
      pending = callback
      return (): void => {}
    })
    const slots = { inject, register, snapshot: () => [{ name: ROW_SLOT_KEY, id: 'owner' }] } as unknown as RowSlotRegistryLike
    const dispose = mountRowSlot({ slots, pin: fakePin(), t: key => key })
    expect(register).not.toHaveBeenCalled()
    pending!()
    expect(register).toHaveBeenCalledTimes(1)
    dispose()
  })
})
