import { describe, expect, it } from 'vitest'
import { frontmatterOf, readList, readScalar, writeList, writeScalar, yamlScalar } from './frontmatter'
import { applyPerson, emptyPerson, newPersonText, parsePerson, setRelationIfEmpty } from './person'
import { applyPlace, categoryTags, newPlaceText, parsePlace } from './place'
import { needsDataviewUpgrade, PEOPLE_QUERY, PLACE_QUERY, upgradeDataview } from './queries'
import { draftRelations } from './relation'
import { countLinks, renameLinks } from './rename'

const OLD_PEOPLE_BLOCK = [
  '```dataview',
  'TABLE WITHOUT ID link(file.link, default(file.aliases[0], file.name)) as "イベント名", date as "日付", place as "場所"',
  'FROM "30_HumanNetwork/30_Events"',
  'WHERE contains(human, this.file.link)',
  'SORT date DESC, file.name DESC',
  '```',
]

const OLD_PLACE_BLOCK = [
  '```dataview',
  'TABLE date as "日付", human, category',
  'FROM "30_HumanNetwork/30_Events"',
  'WHERE contains(place, this.file.link)',
  'SORT date DESC',
  '```',
]

const PERSON = [
  '---',
  'type: person',
  'tags:',
  '  - 人物',
  'name: 姓 名',
  'reading: せい めい',
  'aliases:',
  '  - 呼び名',
  'birthDate: 2008-05-01',
  'likes:',
  '  - ',
  'dislikes:',
  '  - ',
  'bloodType: A',
  'school: "[[学校A]]"',
  'company:',
  'position:',
  '保有資格:',
  '---',
  '',
  '# 姓 名',
  '',
  '![[attachments/photo-1.jpg]]',
  '',
  '友達の友達。',
  '',
  '## 📅 所属履歴',
  '',
  '- [名称:: [[学校A]]]',
  '',
  '## 👨‍👩‍👧‍👦 人間関係・家族',
  '',
  '- 配偶者:: ',
  '- 両親:: [[親A]], [[親B]]',
  '- ペット:: 犬(ポチ)',
  '',
  '',
  '## 🤝 最近の接点',
  ...OLD_PEOPLE_BLOCK,
].join('\n')

const PLACE = [
  '---',
  'type: place',
  'aliases:',
  '  - 店',
  '種別: 飲食店',
  '郵便番号: 630-0000',
  '住所: 奈良県どこか1-2',
  '電話番号:',
  'URL: https://example.com/a',
  'tags:',
  '  - カテゴリ/飲食店/ラーメン',
  '  - 場所/奈良',
  '---',
  '',
  '# 店A',
  '',
  '## 📅 訪問履歴',
  ...OLD_PLACE_BLOCK,
  '',
  '## メモ',
  '- 大盛り無料',
  '',
].join('\n')

describe('frontmatter writing', () => {
  it('quotes only when needed', () => {
    expect(yamlScalar('姓 名')).toBe('姓 名')
    expect(yamlScalar('2008-01-01')).toBe('2008-01-01')
    expect(yamlScalar('https://example.com/a')).toBe('https://example.com/a')
    expect(yamlScalar('[[学校A]]')).toBe('"[[学校A]]"')
    expect(yamlScalar('{{title}}')).toBe('"{{title}}"')
    expect(yamlScalar('a: b')).toBe('"a: b"')
    expect(yamlScalar('090')).toBe('"090"')
    expect(yamlScalar('say "hi"')).toBe('say "hi"')
    expect(yamlScalar('"q"')).toBe('"\\"q\\""')
  })

  it('replaces blocks and inserts after anchors', () => {
    const fm = ['type: person', 'aliases:', '  - a', 'likes:', '  - ', 'name: x']
    writeList(fm, 'aliases', ['b', 'c'])
    writeScalar(fm, 'relation', '家族', ['aliases'])
    writeList(fm, 'likes', [])
    expect(fm).toEqual(['type: person', 'aliases:', '  - b', '  - c', 'relation: 家族', 'likes:', 'name: x'])
    expect(readList(fm, 'aliases')).toEqual(['b', 'c'])
    expect(readScalar(fm, 'relation')).toBe('家族')
  })

  it('reads unindented list items and stops at the next key', () => {
    const fm = ['aliases:', '- a', '- b', 'name: x']
    writeScalar(fm, 'name', 'y')
    writeList(fm, 'aliases', ['c'])
    expect(fm).toEqual(['aliases:', '  - c', 'name: y'])
  })
})

describe('person notes', () => {
  const note = parsePerson(PERSON, '姓 名')

  it('parses fields, photo, memo and family', () => {
    expect(note.reading).toBe('せい めい')
    expect(note.aliases).toEqual(['呼び名'])
    expect(note.school).toBe('[[学校A]]')
    expect(note.likes).toEqual([])
    expect(note.photo).toBe('attachments/photo-1.jpg')
    expect(note.memo).toBe('友達の友達。')
    expect(note.family.両親).toBe('[[親A]], [[親B]]')
    expect(note.family.ペット).toBe('犬(ポチ)')
    expect(note.family.息子).toBe('')
  })

  it('is a no-op when nothing changed', () => {
    expect(applyPerson(PERSON, note, note)).toBe(PERSON)
  })

  it('changes only what was edited and keeps unknown keys', () => {
    const next = { ...note, relation: '友達', likes: ['ラーメン'], memo: '友達の友達。\n二行目', family: { ...note.family, 息子: '[[子A]]', 配偶者: '[[配偶者A]]' } }
    const out = applyPerson(PERSON, note, next)
    const fm = frontmatterOf(out)
    expect(readScalar(fm, 'relation')).toBe('友達')
    expect(fm.indexOf('relation: 友達')).toBe(fm.indexOf('  - 呼び名') + 1)
    expect(readList(fm, 'likes')).toEqual(['ラーメン'])
    expect(fm).toContain('bloodType: A')
    expect(fm).toContain('保有資格:')
    expect(fm).toContain('school: "[[学校A]]"')
    expect(out).toContain('![[attachments/photo-1.jpg]]\n\n友達の友達。\n二行目\n\n## 📅 所属履歴')
    expect(out).toContain('- 配偶者:: [[配偶者A]]\n- 両親:: [[親A]], [[親B]]\n- ペット:: 犬(ポチ)\n- 息子:: [[子A]]')
    expect(parsePerson(out, '姓 名')).toEqual(next)
  })

  it('removes the photo', () => {
    const out = applyPerson(PERSON, note, { ...note, photo: null })
    expect(out).not.toContain('photo-1.jpg')
    expect(out).toContain('# 姓 名\n\n友達の友達。\n\n## 📅')
  })

  it('creates the family section when missing', () => {
    const text = ['---', 'type: person', '---', '', '# A', '', '## 🤝 最近の接点', ...OLD_PEOPLE_BLOCK].join('\n')
    const before = parsePerson(text, 'A')
    const out = applyPerson(text, before, { ...before, family: { ...before.family, 両親: '[[B]]' } })
    expect(out).toContain('# A\n\n## 👨‍👩‍👧‍👦 人間関係・家族\n\n- 両親:: [[B]]\n\n## 🤝 最近の接点')
  })

  it('builds new notes with the new query', () => {
    const text = newPersonText({ ...emptyPerson('新 人'), aliases: ['しんじん'], relation: '学校' })
    const fm = frontmatterOf(text)
    expect(readScalar(fm, 'name')).toBe('新 人')
    expect(readList(fm, 'aliases')).toEqual(['しんじん'])
    expect(readScalar(fm, 'relation')).toBe('学校')
    expect(text).toContain(PEOPLE_QUERY.join('\n'))
    expect(text).not.toContain('bloodType')
    expect(parsePerson(text, '新 人').relation).toBe('学校')
  })

  it('sets a draft relation only when empty', () => {
    const out = setRelationIfEmpty(PERSON, '家族')
    expect(readScalar(frontmatterOf(out), 'relation')).toBe('家族')
    expect(setRelationIfEmpty(out, '友達')).toBe(out)
  })
})

describe('place notes', () => {
  const note = parsePlace(PLACE, '店A')

  it('parses fields and memo', () => {
    expect(note).toEqual({ name: '店A', aliases: ['店'], category: '飲食店', postal: '630-0000', address: '奈良県どこか1-2', phone: '', url: 'https://example.com/a', memo: '- 大盛り無料' })
    expect(applyPlace(PLACE, note, note)).toBe(PLACE)
  })

  it('keeps finer category tags unless the category changes', () => {
    const phoneOnly = applyPlace(PLACE, note, { ...note, phone: '0742-00-0000' })
    expect(readList(frontmatterOf(phoneOnly), 'tags')).toEqual(['カテゴリ/飲食店/ラーメン', '場所/奈良'])
    const changed = applyPlace(PLACE, note, { ...note, category: 'カフェ', memo: '静か' })
    expect(readList(frontmatterOf(changed), 'tags')).toEqual(['カテゴリ/カフェ', '場所/奈良'])
    expect(changed).toContain('## メモ\n\n静か\n')
    expect(categoryTags([], '寿司')).toEqual(['カテゴリ/寿司'])
  })

  it('builds new notes with the new query', () => {
    const text = newPlaceText({ ...parsePlace('', '新店'), name: '新店', category: 'カフェ' })
    expect(text).toContain(PLACE_QUERY.join('\n'))
    expect(readList(frontmatterOf(text), 'tags')).toEqual(['カテゴリ/カフェ'])
    expect(parsePlace(text, '新店').category).toBe('カフェ')
  })
})

describe('dataview upgrade', () => {
  it('rewrites people and place queries once', () => {
    const person = upgradeDataview(PERSON)
    expect(person).toContain(PEOPLE_QUERY.join('\n'))
    expect(person).not.toContain('イベント名')
    expect(needsDataviewUpgrade(person)).toBe(false)
    expect(upgradeDataview(PLACE)).toContain(PLACE_QUERY.join('\n'))
  })

  it('keeps CRLF and leaves unrelated queries alone', () => {
    const crlf = PERSON.replace(/\n/g, '\r\n')
    expect(upgradeDataview(crlf)).toContain(PEOPLE_QUERY.join('\r\n'))
    const other = '```dataview\nTABLE x\nFROM "30_HumanNetwork/10_People"\n```'
    expect(upgradeDataview(other)).toBe(other)
  })
})

describe('relation drafts', () => {
  const fam = (lines: string[]) => ['---', 'type: person', '---', '', '## 👨‍👩‍👧‍👦 人間関係・家族', '', ...lines].join('\n')
  const fm = (lines: string[]) => ['---', 'type: person', ...lines, '---', ''].join('\n')

  it('infers family, school, work and other', () => {
    const result = draftRelations(
      [
        { name: '親', text: fam(['- 息子:: [[子]]']) },
        { name: '子', text: fam(['- 両親:: [[親]]']) },
        { name: '祖母', text: fm([]) },
        { name: '猫', text: fm([]) },
        { name: '飼い主', text: fam(['- ペット:: [[猫]]', '- 両親:: [[祖母]]']) },
        { name: '冗談', text: fam(['- ペット:: 友達の名前']).replace('---\n\n', 'school: "[[学校A]]"\n---\n\n') },
        { name: '同級生', text: fm(['school: "[[学校A]]"']) },
        { name: '幼なじみ', text: fm([]) + '\n- [名称:: [[小学校]]]' },
        { name: '講師', text: fm(['company: 会社A', 'metHow: "[[学校A]]"']) },
        { name: '先輩', text: fm(['metHow: "[[学校A]]"']) },
        { name: '知人', text: fm(['school: 現在はなし']) + '\n- [名称:: [[未登録の高校]]]' },
      ],
      new Set(['学校A', '小学校']),
    )
    expect(Object.fromEntries(result)).toEqual({
      親: '家族',
      子: '家族',
      祖母: '家族',
      猫: '家族',
      飼い主: '家族',
      冗談: '学校',
      同級生: '学校',
      幼なじみ: '学校',
      講師: '仕事',
      先輩: '学校',
      知人: 'その他',
    })
  })
})

describe('link renaming', () => {
  it('points links to the new note and keeps the written name', () => {
    const text = '- 12:00 📍[[仮]] 👥[[仮]] [[仮|あだ名]] [[仮#見出し]] ![[仮]] [[仮名]]\nhuman:\n  - "[[仮]]"'
    expect(renameLinks(text, '仮', '正式 名')).toBe('- 12:00 📍[[正式 名|仮]] 👥[[正式 名|仮]] [[正式 名|あだ名]] [[正式 名#見出し|仮]] ![[仮]] [[仮名]]\nhuman:\n  - "[[正式 名|仮]]"')
    expect(renameLinks(text, '仮', '仮')).toBe(text)
    expect(countLinks(text, '仮')).toBe(5)
  })
})
