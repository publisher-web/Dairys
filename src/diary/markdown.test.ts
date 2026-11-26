import { describe, expect, it } from 'vitest'
import { applyDiary, entryLines, isWritten, mergeExternalEntries, newDiaryText, parseDiary, parseDocument, parseEntries, serializeDocument, sortEntries, transactionTotal, type Entry } from './markdown'

const EMPTY_TEMPLATE = ['---', 'type: diary', 'date: "2026-10-13"', 'mood:', '---', '', '## 📝 今日の一言', '- '].join('\n')

const OLD_FILLED = [
  '---',
  'type: diary',
  'date: 2026-10-20',
  'mood: 😆',
  '---',
  '',
  '## 📝 今日の一言',
  '- 今日は発表があった。細かく指摘されて笑った。',
  '- 友達と[[ラーメン屋]]に行った',
].join('\n')

const OLD_LONG = [
  '---',
  'type: diary',
  'date: 2026-10-22',
  'mood: 🤣',
  '---',
  '',
  '## 📝 今日の一言',
  '- 朝からお腹が痛かった。',
  '- 電車が遅延していた。',
  '',
  '- [[姓 名|呼び名]]と[[先生]]が話し合いをしていた。',
  '',
  '- 放課後は[[部室]]に残った。',
  '',
].join('\n')

const NEW_FORMAT_CRLF = [
  '---',
  'type: diary',
  'date: "2026-11-27"',
  'mood: 😃',
  'weather: ☁️',
  'transaction: "-1419"',
  '---',
  '',
  '## 📝 今日の一言',
  '- 楽しかった',
  '',
  '## 🕒 できごと',
  '- 12:10 ☀️ 📍[[場所A]] 👥[[姓 名|呼び名]] [[友達]]',
  '  みんなでゲームした',
  '  ![[attachments/photo-1.jpg]]',
  '- 18:45 📍[[コンビニ]] 💴-1419',
  '  おやつ',
  '',
  '## メモ',
  '- 手で書いたメモ',
  '',
].join('\r\n')

const fixtures = { EMPTY_TEMPLATE, OLD_FILLED, OLD_LONG, NEW_FORMAT_CRLF }

function entry(partial: Partial<Entry>): Entry {
  return { time: null, weather: null, place: null, people: [], amount: null, text: [], photos: [], raw: null, ...partial }
}

describe('document round trip', () => {
  for (const [name, text] of Object.entries(fixtures)) {
    it(`keeps ${name} byte-identical`, () => {
      expect(serializeDocument(parseDocument(text))).toBe(text)
    })
  }
})

describe('parseDiary', () => {
  it('reads an old diary', () => {
    const d = parseDiary(OLD_FILLED, '2026-10-20')
    expect(d.mood).toBe('😆')
    expect(d.weather).toBeNull()
    expect(d.oneLiner).toBe('今日は発表があった。細かく指摘されて笑った。\n友達と[[ラーメン屋]]に行った')
    expect(d.entries).toEqual([])
  })

  it('treats the empty template as empty', () => {
    const d = parseDiary(EMPTY_TEMPLATE, '2026-10-13')
    expect(d.mood).toBeNull()
    expect(d.oneLiner).toBe('')
  })

  it('reads entries in the new format', () => {
    const d = parseDiary(NEW_FORMAT_CRLF, '2026-11-27')
    expect(d.weather).toBe('☁️')
    expect(d.entries).toHaveLength(2)
    expect(d.entries[0]).toMatchObject({
      time: '12:10',
      weather: '☀️',
      place: { target: '場所A', alias: null },
      people: [
        { target: '姓 名', alias: '呼び名' },
        { target: '友達', alias: null },
      ],
      amount: null,
      text: ['みんなでゲームした'],
      photos: ['attachments/photo-1.jpg'],
    })
    expect(d.entries[1]).toMatchObject({ time: '18:45', amount: -1419, text: ['おやつ'] })
  })
})

describe('applyDiary', () => {
  it('changes only the mood line', () => {
    const out = applyDiary(OLD_FILLED, '2026-10-20', { mood: '🙂' })
    expect(out).toBe(OLD_FILLED.replace('mood: 😆', 'mood: 🙂'))
  })

  it('leaves the old one-liner untouched when adding entries', () => {
    const out = applyDiary(OLD_LONG, '2026-10-22', {
      entries: [entry({ time: '18:45', place: { target: 'コンビニ', alias: null }, amount: -429, text: ['おやつ'] })],
    })
    expect(out).toBe(
      [
        '---',
        'type: diary',
        'date: 2026-10-22',
        'mood: 🤣',
        'transaction: "-429"',
        '---',
        '',
        '## 📝 今日の一言',
        '- 朝からお腹が痛かった。',
        '- 電車が遅延していた。',
        '',
        '- [[姓 名|呼び名]]と[[先生]]が話し合いをしていた。',
        '',
        '- 放課後は[[部室]]に残った。',
        '',
        '## 🕒 できごと',
        '- 18:45 📍[[コンビニ]] 💴-429',
        '  おやつ',
      ].join('\n'),
    )
  })

  it('keeps unchanged entries, other sections and CRLF as they are', () => {
    const d = parseDiary(NEW_FORMAT_CRLF, '2026-11-27')
    const out = applyDiary(NEW_FORMAT_CRLF, '2026-11-27', { entries: d.entries, oneLiner: d.oneLiner, mood: d.mood, weather: d.weather })
    expect(out).toBe(NEW_FORMAT_CRLF)
  })

  it('rewrites only the edited entry', () => {
    const d = parseDiary(NEW_FORMAT_CRLF, '2026-11-27')
    const edited = { ...d.entries[1], raw: null, amount: -500 }
    const out = applyDiary(NEW_FORMAT_CRLF, '2026-11-27', { entries: [d.entries[0], edited] })
    expect(out).toContain('- 18:45 📍[[コンビニ]] 💴-500\r\n  おやつ')
    expect(out).toContain('transaction: "-500"')
    expect(out).toContain('## メモ\r\n- 手で書いたメモ')
    expect(out).toContain('  ![[attachments/photo-1.jpg]]')
  })

  it('creates a new diary', () => {
    const out = applyDiary(null, '2026-11-28', {
      mood: '😆',
      weather: '☀️',
      oneLiner: '最高の一日\n',
      entries: [
        entry({ time: '09:00', weather: '☀️', text: ['朝ごはん'] }),
        entry({ text: ['夜にのんびり'], photos: ['attachments/photo-2.jpg'] }),
      ],
    })
    expect(out).toBe(
      [
        '---',
        'type: diary',
        'date: "2026-11-28"',
        'mood: 😆',
        'weather: ☀️',
        '---',
        '',
        '## 📝 今日の一言',
        '- 最高の一日',
        '',
        '## 🕒 できごと',
        '- 09:00 ☀️',
        '  朝ごはん',
        '- 夜にのんびり',
        '  ![[attachments/photo-2.jpg]]',
        '',
      ].join('\n'),
    )
  })

  it('removes transaction when no amounts remain', () => {
    const d = parseDiary(NEW_FORMAT_CRLF, '2026-11-27')
    const out = applyDiary(NEW_FORMAT_CRLF, '2026-11-27', { entries: [d.entries[0]] })
    expect(out).not.toContain('transaction:')
  })

  it('clears mood without removing the key', () => {
    const out = applyDiary(OLD_FILLED, '2026-10-20', { mood: null })
    expect(out).toContain('\nmood:\n')
  })

  it('writes an empty bullet when the one-liner is cleared', () => {
    const out = applyDiary(OLD_FILLED, '2026-10-20', { oneLiner: '' })
    expect(out.endsWith('## 📝 今日の一言\n- ')).toBe(true)
  })
})

describe('entries', () => {
  it('parses a hand-written line and keeps it verbatim when unchanged', () => {
    const lines = ['- 18:00 ラーメン食べた', '- 自由に書いた行', '  続き']
    const { entries } = parseEntries(lines)
    expect(entries[0]).toMatchObject({ time: '18:00', text: ['ラーメン食べた'] })
    expect(entries[1]).toMatchObject({ time: null, text: ['自由に書いた行', '続き'] })
    expect(entries.flatMap((e) => e.raw!)).toEqual(lines)
  })

  it('round-trips the canonical format', () => {
    const lines = ['- 07:05 🌧️ 📍[[駅]] 👥[[姓 名|呼び名]] 💴+3000', '  お小遣い', '  ![[attachments/photo-3.jpg]]']
    const [e] = parseEntries(lines).entries
    expect(e.amount).toBe(3000)
    expect(entryLines({ ...e, raw: null })).toEqual(lines)
  })

  it('pads single-digit hours and parses yen with commas', () => {
    const [e] = parseEntries(['- 7:05 💴-1,200円']).entries
    expect(e.time).toBe('07:05')
    expect(e.amount).toBe(-1200)
  })

  it('treats an unsigned amount as an expense', () => {
    expect(parseEntries(['- 💴429']).entries[0].amount).toBe(-429)
  })

  it('reads a photo-only entry', () => {
    const [e] = parseEntries(['- ![[attachments/photo-4.jpg]]']).entries
    expect(e.photos).toEqual(['attachments/photo-4.jpg'])
    expect(e.text).toEqual([])
  })

  it('sums transactions', () => {
    expect(transactionTotal([entry({ amount: -429 }), entry({ amount: 3000 })])).toBe('+2571')
    expect(transactionTotal([entry({ amount: -429 }), entry({ amount: 429 })])).toBe('0')
    expect(transactionTotal([entry({})])).toBeNull()
  })
})

describe('newDiaryText', () => {
  it('matches the calendar plugin template shape', () => {
    expect(newDiaryText('2026-12-01')).toBe('---\ntype: diary\ndate: "2026-12-01"\nmood:\n---\n\n## 📝 今日の一言\n- \n\n## 🕒 できごと\n')
  })
})

describe('isWritten', () => {
  it('follows the calendar plugin rule', () => {
    expect(isWritten(EMPTY_TEMPLATE)).toBe(false)
    expect(isWritten(OLD_FILLED)).toBe(true)
    expect(isWritten(newDiaryText('2026-12-01'))).toBe(false)
    expect(isWritten(newDiaryText('2026-12-01').replace('mood:', 'mood: 🙂'))).toBe(true)
    expect(isWritten(newDiaryText('2026-12-01') + '- 12:00\n')).toBe(true)
  })
})

describe('sortEntries', () => {
  it('orders by time and keeps untimed entries last in their order', () => {
    const a = entry({ time: '18:00', text: ['a'] })
    const b = entry({ text: ['b'] })
    const c = entry({ time: '09:30', text: ['c'] })
    const d = entry({ text: ['d'] })
    expect(sortEntries([a, b, c, d]).map((e) => e.text[0])).toEqual(['c', 'a', 'b', 'd'])
  })
})

describe('mergeExternalEntries', () => {
  it('keeps entries added elsewhere after the diary was loaded', () => {
    const loaded = parseEntries(['- 09:00', '  朝']).entries
    const latest = parseEntries(['- 09:00', '  朝', '- 13:00', '  Obsidian で追加']).entries
    const ours = [entry({ time: '20:00', text: ['夜'] })]
    const merged = mergeExternalEntries(loaded, latest, ours)
    expect(merged.map((e) => e.text[0])).toEqual(['夜', 'Obsidian で追加'])
  })

  it('does not resurrect entries the user deleted in the app', () => {
    const loaded = parseEntries(['- 09:00', '  朝']).entries
    expect(mergeExternalEntries(loaded, loaded, [])).toEqual([])
  })
})
