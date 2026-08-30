// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest'
import { KNOWN_SESSION_EVENT_TYPES } from '@deepseek-ai/dsh-session'
import {
  PIN_EVENT,
  PinLogAppender,
  emptyPinProjection,
  foldPinEvent,
  foldPinEvents,
  foldPinValue,
  isMarkedIgnorable,
  isPinLogValue,
  normalizePinEventValue,
  type PinLogValue,
  type PinProjection,
} from '../src/pin-log.ts'

/** One foldable pin value (the plugin's own full payload). */
function value(sessionId: string, pinned: boolean, at: number, color?: string | null): PinLogValue {
  return { sessionId, pinned, at, ...(color === undefined ? {} : { color }) }
}

describe('pin-log fold', () => {
  it('pins to the front, unpins, and re-pins in newest-first order', () => {
    let state = emptyPinProjection()
    state = foldPinValue(state, value('a', true, 1))
    state = foldPinValue(state, value('b', true, 2))
    expect(state.pinned).toEqual(['b', 'a'])
    state = foldPinValue(state, value('a', true, 3))
    expect(state.pinned).toEqual(['a', 'b'])
    state = foldPinValue(state, value('a', false, 4))
    expect(state.pinned).toEqual(['b'])
  })

  it('tracks colors independently of membership (pin never clears color)', () => {
    let state = emptyPinProjection()
    state = foldPinValue(state, value('a', true, 1, '#f97316'))
    expect(state.colors).toEqual({ a: '#f97316' })
    state = foldPinValue(state, value('a', false, 2))
    expect(state.pinned).toEqual([])
    expect(state.colors).toEqual({ a: '#f97316' })
    state = foldPinValue(state, value('a', true, 3, null))
    expect(state.colors).toEqual({})
  })

  it('foldPinEvent ignores non-pin events (same reference) and malformed payloads', () => {
    const start = emptyPinProjection()
    expect(foldPinEvent(start, { type: 'user/message', data: null })).toBe(start)
    expect(foldPinEvent(start, { type: PIN_EVENT, data: { pinned: true } })).toBe(start)
    expect(foldPinEvent(start, { type: PIN_EVENT, data: { sessionId: 'a', pinned: 'yes', at: 1 } })).toBe(start)
  })

  it('foldPinEvents rebuilds the canonical pin set from a raw log', () => {
    const events = [
      { type: 'user/message', data: null },
      { type: PIN_EVENT, data: value('a', true, 1, '#0ea5e9') },
      { type: PIN_EVENT, data: value('b', true, 2) },
      { type: PIN_EVENT, data: value('a', false, 3) },
    ]
    expect(foldPinEvents(events)).toEqual({ pinned: ['b'], colors: { a: '#0ea5e9' } })
  })
})

describe('pin-log event normalization', () => {
  it('accepts the plugin-format payload with sessionId', () => {
    expect(normalizePinEventValue('ignored', { sessionId: 's1', pinned: true, at: 5, color: '#22c55e' }))
      .toEqual({ sessionId: 's1', pinned: true, at: 5, color: '#22c55e' })
  })

  it('supplies the carrier session id for the upstream { pinned, at } payload', () => {
    expect(normalizePinEventValue('s2', { pinned: false, at: 7 }))
      .toEqual({ sessionId: 's2', pinned: false, at: 7 })
  })

  it('rejects payloads without a boolean membership', () => {
    expect(normalizePinEventValue('s1', { pinned: 'yes', at: 1 })).toBeUndefined()
    expect(normalizePinEventValue('s1', null)).toBeUndefined()
    expect(normalizePinEventValue('s1', {})).toBeUndefined()
  })

  it('isPinLogValue requires the plugin-format sessionId field', () => {
    expect(isPinLogValue({ sessionId: 'a', pinned: true, at: 1 })).toBe(true)
    expect(isPinLogValue({ pinned: true, at: 1 })).toBe(false)
    expect(isPinLogValue({ sessionId: '', pinned: true, at: 1 })).toBe(false)
    expect(isPinLogValue({ sessionId: 'a', pinned: true, at: Number.NaN })).toBe(false)
  })
})

describe('PinLogAppender pre-flight host gate', () => {
  it('isMarkedIgnorable reads the marker off the returned envelope', () => {
    expect(isMarkedIgnorable({ ignorable: true })).toBe(true)
    expect(isMarkedIgnorable({})).toBe(false)
    expect(isMarkedIgnorable(null)).toBe(false)
  })

  it('appends plainly when the host vocabulary knows the type', () => {
    ;(KNOWN_SESSION_EVENT_TYPES as Set<string>).add(PIN_EVENT)
    try {
      const calls: unknown[][] = []
      // No 'ignorable' in this source: the known-type branch must win before
      // the source probe is ever consulted.
      const append = function (type: string, data: unknown) {
        calls.push([type, data])
        return {}
      }
      const warn = vi.fn()
      const appender = new PinLogAppender(false, warn)
      appender.append({ append }, value('a', true, 1))
      expect(calls).toEqual([[PIN_EVENT, value('a', true, 1)]])
      expect(warn).not.toHaveBeenCalled()
    } finally {
      ;(KNOWN_SESSION_EVENT_TYPES as Set<string>).delete(PIN_EVENT)
    }
  })

  it('appends with the ignorable request and keeps appending on an envelope host', () => {
    const calls: unknown[][] = []
    const append = function (type: string, data: unknown, options?: unknown) {
      // The 'ignorable' marker rides the options bag on envelope hosts.
      calls.push(options === undefined ? [type, data] : [type, data, options])
      return { ignorable: (options as { ignorable?: boolean } | undefined)?.ignorable === true }
    }
    const warn = vi.fn()
    const appender = new PinLogAppender(false, warn)
    appender.append({ append }, value('a', true, 1))
    appender.append({ append }, value('b', true, 2))
    expect(calls).toEqual([
      [PIN_EVENT, value('a', true, 1), { ignorable: true }],
      [PIN_EVENT, value('b', true, 2), { ignorable: true }],
    ])
    expect(warn).not.toHaveBeenCalled()
  })

  it('writes nothing and warns once before the first write on a host that cannot carry the event', () => {
    const calls: unknown[][] = []
    // An envelope-less append: the source never mentions the marker.
    const append = function (type: string, data: unknown) {
      calls.push([type, data])
      return {}
    }
    const warn = vi.fn()
    const appender = new PinLogAppender(false, warn)
    appender.append({ append }, value('a', true, 1))
    appender.append({ append }, value('b', true, 2))
    // The pre-flight probe must prevent the FIRST write itself (the
    // write-then-probe defect poisoned the log on 0.1.2-alpha.1).
    expect(calls).toHaveLength(0)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('ignorable')
  })

  it('allowUnmarked opts back into marked appends without probing', () => {
    const calls: unknown[][] = []
    const append = function (type: string, data: unknown, options?: unknown) {
      calls.push(options === undefined ? [type, data] : [type, data, options])
      return {}
    }
    const warn = vi.fn()
    const appender = new PinLogAppender(true, warn)
    appender.append({ append }, value('a', true, 1))
    appender.append({ append }, value('b', true, 2))
    expect(calls).toEqual([
      [PIN_EVENT, value('a', true, 1), { ignorable: true }],
      [PIN_EVENT, value('b', true, 2), { ignorable: true }],
    ])
    expect(warn).not.toHaveBeenCalled()
  })

  it('contains an append throw without disturbing later appends', () => {
    let attempts = 0
    const append = function (_type: string, _data: unknown, _options?: { ignorable?: true }) {
      attempts += 1
      // The marker word lives in the RUNTIME source (type annotations are
      // stripped), so the pre-flight source probe lets the append through.
      throw new Error(`envelope host failed to stamp ignorable`)
    }
    const warn = vi.fn()
    const appender = new PinLogAppender(false, warn)
    appender.append({ append }, value('a', true, 1))
    appender.append({ append }, value('b', true, 2))
    expect(attempts).toBe(2)
    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn.mock.calls[0]![0]).toContain('append failed')
    expect(warn.mock.calls[1]![0]).toContain('append failed')
  })
})
