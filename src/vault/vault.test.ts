import { describe, expect, it } from 'vitest'
import { frontmatterOf, readList, readScalar } from './frontmatter'
import { buildUsage, extractLinkTargets, rankByUsage, unresolvedLinks } from './links'
import { displayName, hasExactName, matches, normalizeForSearch } from './search'

const PERSON = ['---', 'type: person', 'name: 姓 名', 'reading: せい めい', 'aliases:', '  - 呼び名', '  - あだ名', 'likes:', '  - ', '---', '', '# 姓 名'].join('\n')

describe('frontmatter', () => {
  const fm = frontmatterOf(PERSON)

  it('reads scalars', () => {
    expect(readScalar(fm, 'reading')).toBe('せい めい')
    expect(readScalar(fm, 'missing')).toBeNull()
  })

  it('reads block lists and skips empty items', () => {
    expect(readList(fm, 'aliases')).toEqual(['呼び名', 'あだ名'])
    expect(readList(fm, 'likes')).toEqual([])
  })

  it('reads inline and scalar lists', () => {
    expect(readList(['aliases: [a, "b c"]'], 'aliases')).toEqual(['a', 'b c'])
    expect(readList(['aliases: KJ'], 'aliases')).toEqual(['KJ'])
    expect(readList(['aliases:', '- 左詰め'], 'aliases')).toEqual(['左詰め'])
    expect(readList(['aliases:', '  - '], 'aliases')).toEqual([])
  })
})

describe('search', () => {
  const item = { name: '姓 名', reading: 'せい めい', aliases: ['呼び名'] }

  it('normalizes kana, width and spaces', () => {
    expect(normalizeForSearch('セイ メイ')).toBe('せいめい')
    expect(normalizeForSearch('ＡＢＣ')).toBe('abc')
  })

  it('matches by name, reading and alias', () => {
    expect(matches(item, 'せい')).toBe(true)
    expect(matches(item, 'メイ')).toBe(true)
    expect(matches(item, '呼び')).toBe(true)
    expect(matches(item, '姓名')).toBe(true)
    expect(matches(item, 'ちがう')).toBe(false)
    expect(matches(item, '')).toBe(true)
  })

  it('detects exact names and aliases', () => {
    expect(hasExactName([item], '姓 名')).toBe(true)
    expect(hasExactName([item], '呼び名')).toBe(true)
    expect(hasExactName([item], '呼び')).toBe(false)
  })

  it('prefers the first alias for display', () => {
    expect(displayName(item)).toBe('呼び名')
    expect(displayName({ name: '場所', reading: null, aliases: [] })).toBe('場所')
  })
})

describe('links', () => {
  it('extracts link targets but not embeds', () => {
    const text = '- 12:10 📍[[場所A]] 👥[[姓 名|呼び名]] [[友達#見出し]]\n  ![[attachments/photo-1.jpg]]'
    expect(extractLinkTargets(text)).toEqual(['場所A', '姓 名', '友達'])
  })

  it('ranks by most recent use, then frequency', () => {
    const usage = buildUsage([
      { date: '2026-10-01', targets: ['A', 'B', 'B'] },
      { date: '2026-11-01', targets: ['B'] },
      { date: '2026-11-01', targets: ['C'] },
      { date: '2026-09-01', targets: ['C'] },
    ])
    expect(usage.get('B')).toEqual({ count: 2, last: '2026-11-01' })
    const ranked = rankByUsage([{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }], usage).map((i) => i.name)
    expect(ranked).toEqual(['B', 'C', 'A'])
  })

  it('lists links that have no note', () => {
    const usage = buildUsage([
      { date: '2026-11-01', targets: ['新しい人', '既存', 'folder/既存2', 'attachments/x.jpg'] },
      { date: '2026-11-02', targets: ['新しい人'] },
    ])
    const result = unresolvedLinks(usage, new Set(['既存', '既存2']))
    expect(result).toEqual([{ name: '新しい人', count: 2, last: '2026-11-02' }])
  })
})
