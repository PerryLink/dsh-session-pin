// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest'
import {
  colorClassIndex, decodeStoredPins, emptyStoredPins, encodeStoredPins, hexToRgba, isPaletteColor,
  nextPaletteColor, normalizeColors, normalizePins, PIN_COLOR_PALETTE, pruneColors, prunePins,
  reorderMoves, togglePin, topAnchor,
} from '../src/pin-core.ts'

describe('normalizePins', () => {
  it('accepts a plain string array unchanged', () => {
    expect(normalizePins(['a', 'b'])).toEqual(['a', 'b'])
  })

  it('deduplicates keeping first occurrence order', () => {
    expect(normalizePins(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c'])
  })

  it('drops non-string entries and empties', () => {
    expect(normalizePins(['a', 1, null, '', 'b'])).toEqual(['a', 'b'])
  })

  it('returns an empty list for malformed input', () => {
    expect(normalizePins(undefined)).toEqual([])
    expect(normalizePins('a,b')).toEqual([])
    expect(normalizePins({ pinned: ['a'] })).toEqual([])
  })
})

describe('togglePin', () => {
  it('appends an unpinned id to the front', () => {
    expect(togglePin(['a', 'b'], 'c')).toEqual(['c', 'a', 'b'])
  })

  it('removes a pinned id', () => {
    expect(togglePin(['a', 'b'], 'a')).toEqual(['b'])
  })

  it('rejects pinning beyond the limit without blocking unpin', () => {
    expect(togglePin(['a', 'b'], 'c', 2)).toBeNull()
    expect(togglePin(['a', 'b'], 'b', 2)).toEqual(['a'])
  })

  it('treats 0 (and negatives) as unlimited', () => {
    expect(togglePin(['a', 'b'], 'c', 0)).toEqual(['c', 'a', 'b'])
    expect(togglePin(['a', 'b'], 'c', -1)).toEqual(['c', 'a', 'b'])
  })
})

describe('topAnchor', () => {
  it('returns the current first id for a mid-list entity', () => {
    expect(topAnchor(['x', 'y', 'z'], 'z')).toBe('x')
  })

  it('returns undefined when the entity is already first', () => {
    expect(topAnchor(['z', 'x'], 'z')).toBeUndefined()
  })

  it('returns undefined when the entity is absent', () => {
    expect(topAnchor(['x', 'y'], 'ghost')).toBeUndefined()
  })
})

describe('color palette helpers', () => {
  it('accepts exactly the preset palette hexes', () => {
    for (const color of PIN_COLOR_PALETTE) expect(isPaletteColor(color)).toBe(true)
    expect(isPaletteColor('#123456')).toBe(false)
    expect(isPaletteColor(undefined)).toBe(false)
    expect(isPaletteColor(7)).toBe(false)
  })

  it('normalizes color maps to palette values only', () => {
    expect(normalizeColors({ a: PIN_COLOR_PALETTE[0], b: '#badbad', c: 1, '': PIN_COLOR_PALETTE[1] })).toEqual({
      a: PIN_COLOR_PALETTE[0],
    })
    expect(normalizeColors('nope')).toEqual({})
    expect(normalizeColors(['x'])).toEqual({})
    expect(normalizeColors(null)).toEqual({})
  })

  it('maps stored colors to palette indices for the class hook', () => {
    expect(colorClassIndex(PIN_COLOR_PALETTE[3])).toBe(3)
    expect(colorClassIndex('#123456')).toBeUndefined()
    expect(colorClassIndex(undefined)).toBeUndefined()
    expect(colorClassIndex(null)).toBeUndefined()
  })

  it('cycles none → palette[0] → … → none', () => {
    expect(nextPaletteColor(undefined)).toBe(PIN_COLOR_PALETTE[0])
    expect(nextPaletteColor(null)).toBe(PIN_COLOR_PALETTE[0])
    expect(nextPaletteColor('#bogus')).toBe(PIN_COLOR_PALETTE[0])
    expect(nextPaletteColor(PIN_COLOR_PALETTE[0])).toBe(PIN_COLOR_PALETTE[1])
    expect(nextPaletteColor(PIN_COLOR_PALETTE[PIN_COLOR_PALETTE.length - 1])).toBeNull()
  })

  it('converts hex literals to rgba()', () => {
    expect(hexToRgba('#f97316', 0.1)).toBe('rgba(249,115,22,0.1)')
    expect(hexToRgba('garbage', 0.1)).toBe('transparent')
  })
})

describe('stored-pin envelope', () => {
  const fullDoc = {
    pinned: ['b', 'a'],
    workspacePinned: ['w2', 'w1'],
    colors: { a: PIN_COLOR_PALETTE[0] },
    workspaceColors: { w1: PIN_COLOR_PALETTE[2] },
  }

  it('round-trips through the v2 envelope', () => {
    expect(decodeStoredPins(JSON.parse(encodeStoredPins(fullDoc)))).toEqual(fullDoc)
  })

  it('reads the legacy bare array form (session pins only)', () => {
    expect(decodeStoredPins(['a', 'b'])).toEqual({ ...emptyStoredPins(), pinned: ['a', 'b'] })
  })

  it('migrates the v1 envelope (session pins only)', () => {
    expect(decodeStoredPins({ v: 1, pinned: ['a', 'b', 'a', 7] })).toEqual({ ...emptyStoredPins(), pinned: ['a', 'b'] })
  })

  it('normalizes every v2 payload field', () => {
    expect(decodeStoredPins({
      v: 2,
      pinned: ['a', 'a'],
      workspacePinned: [1, 'w'],
      colors: { a: PIN_COLOR_PALETTE[1], x: 'nope' },
      workspaceColors: 'broken',
    })).toEqual({
      pinned: ['a'],
      workspacePinned: ['w'],
      colors: { a: PIN_COLOR_PALETTE[1] },
      workspaceColors: {},
    })
  })

  it('rejects unknown envelope versions and malformed documents', () => {
    expect(decodeStoredPins({ v: 9, pinned: ['a'] })).toEqual(emptyStoredPins())
    expect(decodeStoredPins('a,b')).toEqual(emptyStoredPins())
    expect(decodeStoredPins(null)).toEqual(emptyStoredPins())
    expect(decodeStoredPins({ v: 2 })).toEqual(emptyStoredPins())
  })
})

describe('prunePins', () => {
  it('drops ids absent from the live set, preserving order', () => {
    expect(prunePins(['a', 'b', 'c'], new Set(['a', 'c']))).toEqual(['a', 'c'])
  })

  it('keeps everything when every id is live', () => {
    expect(prunePins(['a', 'b'], new Set(['a', 'b']))).toEqual(['a', 'b'])
  })
})

describe('pruneColors', () => {
  it('drops color entries for ids absent from the live set', () => {
    expect(pruneColors({ a: PIN_COLOR_PALETTE[0], ghost: PIN_COLOR_PALETTE[1] }, new Set(['a']))).toEqual({
      a: PIN_COLOR_PALETTE[0],
    })
  })

  it('returns an empty map when nothing matches', () => {
    expect(pruneColors({ x: PIN_COLOR_PALETTE[0] }, new Set())).toEqual({})
  })
})

describe('reorderMoves', () => {
  it('plans no moves when the pinned prefix already matches pin order', () => {
    expect(reorderMoves(['b', 'a', 'x'], ['b', 'a'])).toEqual([])
  })

  it('plans oldest-first moves so the newest pin ends up front', () => {
    expect(reorderMoves(['x', 'a', 'y', 'b'], ['b', 'a'])).toEqual(['a', 'b'])
  })

  it('moves only the pins present in the account', () => {
    expect(reorderMoves(['x', 'a'], ['b', 'a'])).toEqual(['a'])
  })

  it('plans nothing when no pinned id lives in the account', () => {
    expect(reorderMoves(['x', 'y'], ['b'])).toEqual([])
  })
})
