import { describe, expect, it } from 'vitest'
import { normalizePins, togglePin, topAnchor } from '../src/pin-core.ts'

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
  it('returns the current first id for a mid-list session', () => {
    expect(topAnchor(['x', 'y', 'z'], 'z')).toBe('x')
  })

  it('returns undefined when the session is already first', () => {
    expect(topAnchor(['z', 'x'], 'z')).toBeUndefined()
  })

  it('returns undefined when the session is absent', () => {
    expect(topAnchor(['x', 'y'], 'ghost')).toBeUndefined()
  })
})
