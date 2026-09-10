// SPDX-License-Identifier: Apache-2.0
/**
 * ReorderPump contract: one pass at a time, sequential moves, and one issuance
 * per observed order. These are the properties that keep the browser half's
 * re-assertion out of its own echo (issue #4); the end-to-end regression over
 * the real client glue is `tests/reorder-loop.test.ts`.
 */
import { describe, expect, it, vi } from 'vitest'
import { createReorderPump, type ReorderMove } from '../src/reorder-pump.ts'

/** The plan a pinned-prefix re-assertion would produce for `x,p1,p2,p3`. */
const MOVES: readonly ReorderMove[] = [
  { kind: 'session', id: 'p3' },
  { kind: 'session', id: 'p2' },
  { kind: 'session', id: 'p1' },
]

/** Wait out `ticks` timer generations (each `apply` takes one). */
async function settle(ticks = 4): Promise<void> {
  for (let index = 0; index < ticks; index += 1) await new Promise(resolve => setTimeout(resolve, 0))
}

describe('createReorderPump', () => {
  it('applies a plan sequentially, one move at a time', async () => {
    const applied: string[] = []
    let inFlight = 0
    let maxInFlight = 0
    const order = ['x', 'p1', 'p2', 'p3']
    const pump = createReorderPump({
      plan: () => ({ orderKey: order.join(','), moves: MOVES }),
      apply: async (move) => {
        applied.push(move.id)
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        await new Promise(resolve => setTimeout(resolve, 0))
        inFlight -= 1
      },
    })

    pump.request()
    await settle()

    expect(applied).toEqual(['p3', 'p2', 'p1'])
    expect(maxInFlight).toBe(1)
  })

  it('coalesces triggers that land during a pass into one re-check', async () => {
    const applied: string[] = []
    let passes = 0
    const order = ['x', 'p1', 'p2', 'p3']
    const pump = createReorderPump({
      plan: () => {
        passes += 1
        return { orderKey: order.join(','), moves: MOVES }
      },
      apply: async (move) => {
        applied.push(move.id)
        await new Promise(resolve => setTimeout(resolve, 0))
      },
    })

    pump.request()
    await settle(1)
    // The list-change echo of the move already in flight (plus any other
    // same-tick trigger) must not start another pass.
    pump.request()
    pump.request()
    pump.request()
    await settle()

    expect(applied).toEqual(['p3', 'p2', 'p1'])
    expect(passes).toBe(2) // the pass plus its single coalesced re-check
  })

  it('issues a plan once per observed order, however often it is requested', async () => {
    const apply = vi.fn(async (): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    const order = ['x', 'p1', 'p2', 'p3']
    const pump = createReorderPump({
      plan: () => ({ orderKey: order.join(','), moves: MOVES }),
      apply,
    })

    for (let round = 0; round < 10; round += 1) {
      pump.request()
      await settle(1)
    }
    await settle()

    // Replaying the same request sequence against the same observed order
    // cannot change that order: it is issued once (the reported storm stops).
    expect(apply).toHaveBeenCalledTimes(MOVES.length)
  })

  it('re-arms issuance when the observed order changes', async () => {
    const applied: string[] = []
    let order = ['x', 'p1', 'p2', 'p3']
    let moves: readonly ReorderMove[] = MOVES
    const pump = createReorderPump({
      plan: () => ({ orderKey: order.join(','), moves }),
      apply: async (move) => {
        applied.push(move.id)
        await new Promise(resolve => setTimeout(resolve, 0))
      },
    })

    pump.request()
    await settle()
    expect(applied).toEqual(['p3', 'p2', 'p1'])

    // The client observes a different order that the same plan still has to
    // fix (a third party moved a session): a new signature re-arms issuance.
    order = ['p1', 'x', 'p2', 'p3']
    pump.request()
    await settle()
    expect(applied).toEqual(['p3', 'p2', 'p1', 'p3', 'p2', 'p1'])

    // An observed order the pinned prefix already leads plans nothing.
    order = ['p1', 'p2', 'p3', 'x']
    moves = []
    pump.request()
    await settle()
    expect(applied).toHaveLength(MOVES.length * 2)
  })

  it('re-arms issuance for an unchanged order after reset()', async () => {
    const applied: string[] = []
    const order = ['x', 'p1', 'p2', 'p3']
    const pump = createReorderPump({
      plan: () => ({ orderKey: order.join(','), moves: MOVES }),
      apply: async (move) => {
        applied.push(move.id)
        await new Promise(resolve => setTimeout(resolve, 0))
      },
    })

    pump.request()
    await settle()
    pump.request()
    await settle()
    expect(applied).toHaveLength(MOVES.length)

    pump.reset() // a transport reconnect re-arms the re-assertion
    pump.request()
    await settle()
    expect(applied).toHaveLength(MOVES.length * 2)
  })

  it('reports a failing pass through onError and stays usable', async () => {
    const errors: unknown[] = []
    const applied: string[] = []
    let fail = true
    let order = ['x', 'p1', 'p2', 'p3']
    const pump = createReorderPump({
      plan: () => ({ orderKey: order.join(','), moves: MOVES }),
      apply: async (move) => {
        if (fail) throw new Error('host rejected the move')
        applied.push(move.id)
        await new Promise(resolve => setTimeout(resolve, 0))
      },
      onError: (error) => {
        errors.push(error)
      },
    })

    pump.request()
    await settle()
    expect(errors).toHaveLength(1)
    expect(String(errors[0])).toContain('host rejected the move')

    fail = false
    order = ['p1', 'p2', 'p3', 'x']
    pump.request()
    await settle()
    expect(applied).toEqual(['p3', 'p2', 'p1'])
  })

  it('issues nothing for an empty plan', async () => {
    const apply = vi.fn(async (): Promise<void> => {})
    const pump = createReorderPump({ plan: () => ({ orderKey: 'x,p1', moves: [] }), apply })
    pump.request()
    await settle()
    expect(apply).not.toHaveBeenCalled()
  })
})
