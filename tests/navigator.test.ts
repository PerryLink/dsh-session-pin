// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest'
import {
  assignPinToBoard, boardOf, emptyBoards, filterEntries, gotoMatches, normalizeBoards, normalizeTags,
  normalizeViews, removeBoard, sanitizeLabel, saveView, setEntityTags, summarizeHealth, upsertBoard, validateBoardName,
} from '../src/navigator.ts'

describe('boards', () => {
  it('creates, renames, removes, and assigns pins with membership fallback', () => {
    let boards = emptyBoards()
    boards = upsertBoard(boards, 'release', '本周发布')
    expect(boards.byId['release']?.name).toBe('本周发布')
    boards = upsertBoard(boards, 'release', 'Release')
    expect(boards.byId['release']?.name).toBe('Release')
    boards = assignPinToBoard(boards, 's1', 'release')
    expect(boardOf(boards, 's1')).toBe('release')
    boards = assignPinToBoard(boards, 's1', '')
    expect(boardOf(boards, 's1')).toBeUndefined()
    boards = assignPinToBoard(boards, 's1', 'release')
    boards = removeBoard(boards, 'release')
    expect(boards.byId['release']).toBeUndefined()
    expect(boardOf(boards, 's1')).toBeUndefined()
  })

  it('validates board names and caps the registry', () => {
    expect(validateBoardName('  Work  ')).toBe('Work')
    expect(() => validateBoardName('')).toThrow()
    expect(() => validateBoardName('x'.repeat(33))).toThrow()
    let boards = emptyBoards()
    for (let i = 0; i < 24; i++) boards = upsertBoard(boards, `b${i}`, `B${i}`)
    expect(() => upsertBoard(boards, 'overflow', 'Overflow')).toThrow(/at most 24/)
  })

  it('normalizes unknown board payloads defensively', () => {
    expect(normalizeBoards({ byId: { a: { name: 'A', order: 0 }, bad: { name: '', order: 1 } }, membership: { s: 'a', x: 'missing' } }))
      .toEqual({ byId: { a: { name: 'A', order: 0 } }, membership: { s: 'a' } })
    expect(normalizeBoards('junk')).toEqual(emptyBoards())
  })
})

describe('tags', () => {
  it('normalizes, trims, dedupes, and caps tags', () => {
    expect(normalizeTags({ a: [' release ', 'release', 'x'.repeat(50), '', 7] })).toEqual({ a: ['release', 'x'.repeat(24)] })
    expect(normalizeTags('nope')).toEqual({})
    expect(setEntityTags({ a: ['x'] }, 'a', [])).toEqual({})
    expect(setEntityTags({}, 'a', ['one', 'two'])).toEqual({ a: ['one', 'two'] })
  })
})

describe('views', () => {
  it('normalizes, saves with replacement, and caps the list', () => {
    const v1 = { id: 'v1', name: 'work', text: '', tags: [], board: 'work' }
    expect(normalizeViews([v1, { id: '' }])).toEqual([v1])
    const saved = saveView([v1], { id: 'v1', name: 'work2', text: 'x', tags: [], board: 'work' })
    expect(saved).toHaveLength(1)
    expect(saved[0]?.name).toBe('work2')
    const many = Array.from({ length: 25 }, (_, i) => ({ id: `v${i}`, name: `V${i}`, text: '', tags: [] }))
    expect(normalizeViews(many)).toHaveLength(20)
  })
})

describe('filterEntries', () => {
  const entries = [
    { id: 's1', name: 'Release plan', tags: ['release'], boardId: 'work' },
    { id: 's2', name: 'Research notes', tags: ['research'], boardId: 'study' },
    { id: 's3', name: 'Misc', tags: [] },
  ]
  it('filters by text (case-insensitive), tags, and board', () => {
    expect(filterEntries(entries, { text: 'RELEASE', tags: [], board: undefined }).map(entry => entry.id)).toEqual(['s1'])
    expect(filterEntries(entries, { text: '', tags: ['research'], board: undefined }).map(entry => entry.id)).toEqual(['s2'])
    expect(filterEntries(entries, { text: '', tags: [], board: 'study' }).map(entry => entry.id)).toEqual(['s2'])
    expect(filterEntries(entries, { text: '', tags: [], board: undefined })).toHaveLength(3)
  })
})

describe('summarizeHealth', () => {
  it('summarizes message counts, last activity, and direction', () => {
    expect(summarizeHealth([])).toEqual({ lastActivity: null, messages: 0, lastDirection: null })
    expect(summarizeHealth([
      { type: 'user/message', time: 1000 },
      { type: 'assistant/message', time: 2000 },
      { type: 'command/run', time: 2500 },
    ])).toEqual({ lastActivity: 2500, messages: 2, lastDirection: 'assistant' })
  })
})

describe('gotoMatches', () => {
  const entries = [
    { id: 's1', name: 'Release plan', tags: ['release'] },
    { id: 's2', name: 'Research', tags: ['release'] },
    { id: 's3', name: 'Misc', tags: [] },
  ]
  it('matches titles and tags, case-insensitively, capped and empty-safe', () => {
    expect(gotoMatches(entries, 'RELEASE').map(entry => entry.id)).toEqual(['s1', 's2'])
    expect(gotoMatches(entries, 'plan').map(entry => entry.id)).toEqual(['s1'])
    expect(gotoMatches(entries, '')).toEqual([])
    expect(gotoMatches(entries, 'nope')).toEqual([])
  })
})

describe('sanitizeLabel', () => {
  it('strips control characters and caps length', () => {
    expect(sanitizeLabel('a\u0000b\u001fc')).toBe('abc')
    expect(sanitizeLabel('x'.repeat(500))).toHaveLength(200)
  })
})
