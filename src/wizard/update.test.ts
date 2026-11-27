import { describe, expect, it } from 'vitest'
import { parseEntries, type Entry } from '../diary/markdown'
import type { LoadedDiary } from '../diary/store'
import type { WeatherData } from '../diary/weather'
import type { Draft, EditableEntry } from './draft'
import { buildUpdate, hasRealChanges } from './update'

const weather: WeatherData = { date: '2026-11-27', daily: '☔️', hourly: Array.from({ length: 24 }, (_, h) => (h < 12 ? '☀️' : '☔️')) }

function entry(partial: Partial<Entry>): EditableEntry {
  return { key: Math.random().toString(36), time: null, weather: null, place: null, people: [], amount: null, text: [], photos: [], raw: null, ...partial }
}

function loaded(entries: Entry[] = [], weatherEmoji: string | null = null): LoadedDiary {
  return { date: '2026-11-27', text: null, rev: null, diary: { date: '2026-11-27', mood: null, weather: weatherEmoji, oneLiner: '', entries } }
}

function draft(patch: Partial<Draft>): Draft {
  return { date: '2026-11-27', baseRev: null, step: 'confirm', mood: null, oneLiner: '', entries: [], baseEntries: [], moodTouched: false, oneLinerTouched: false, entriesTouched: false, savedAt: 0, ...patch }
}

describe('buildUpdate weather', () => {
  it('adds hourly weather to new entries with a time and the daily weather to the diary', () => {
    const u = buildUpdate(draft({ entries: [entry({ time: '09:30' }), entry({ time: '19:00' }), entry({ text: ['時刻なし'] })], entriesTouched: true }), loaded(), undefined, weather)
    expect(u.entries!.map((e) => e.weather)).toEqual(['☀️', '☔️', null])
    expect(u.weather).toBe('☔️')
  })

  it('does not touch unchanged raw entries', () => {
    const raw = parseEntries(['- 08:00', '  手書き']).entries[0]
    const u = buildUpdate(draft({ entries: [{ ...raw, key: 'k' }, entry({ time: '13:00' })], entriesTouched: true }), loaded([raw]), undefined, weather)
    expect(u.entries![0].weather).toBeNull()
    expect(u.entries![0].raw).not.toBeNull()
    expect(u.entries![1].weather).toBe('☔️')
  })

  it('keeps existing weather and adds nothing when there are no changes', () => {
    expect(buildUpdate(draft({}), loaded(), undefined, weather)).toEqual({})
    expect(buildUpdate(draft({ mood: '😆', moodTouched: true }), loaded([], '☁️'), undefined, weather).weather).toBeUndefined()
  })

  it('keeps an explicit weather on an entry', () => {
    const u = buildUpdate(draft({ entries: [entry({ time: '09:00', weather: '❄️' })], entriesTouched: true }), loaded(), undefined, weather)
    expect(u.entries![0].weather).toBe('❄️')
  })

  it('turns pending photos into paths', () => {
    const photo = { id: 'p1', blob: new Blob(), width: 1, height: 1, taken: null }
    const u = buildUpdate(draft({ entries: [{ ...entry({}), pendingPhotos: [photo] }], entriesTouched: true }), loaded(), (p) => `attachments/${p.id}.jpg`)
    expect(u.entries![0].photos).toEqual(['attachments/p1.jpg'])
  })
})

describe('hasRealChanges', () => {
  const text = ['---', 'type: diary', 'date: "2026-11-27"', 'mood: 🙂', '---', '', '## 📝 今日の一言', '- 一言', '', '## 🕒 できごと', '- 08:00', '  朝', ''].join('\n')
  const base: LoadedDiary = { date: '2026-11-27', text, rev: 'r1', diary: { date: '2026-11-27', mood: '🙂', weather: null, oneLiner: '一言', entries: parseEntries(['- 08:00', '  朝', '']).entries } }
  const fresh = (patch: Partial<Draft>) => draft({ mood: '🙂', oneLiner: '一言', entries: base.diary.entries.map((e) => ({ ...e, key: 'k' })), ...patch })

  it('is false when only touched without changing the text', () => {
    expect(hasRealChanges(fresh({ moodTouched: true }), base)).toBe(false)
    expect(hasRealChanges(fresh({ oneLinerTouched: true, oneLiner: '一言 ' }), base)).toBe(false)
    expect(hasRealChanges(fresh({ entriesTouched: true, entries: [...base.diary.entries.map((e) => ({ ...e, key: 'k' })), entry({})] }), base)).toBe(false)
  })

  it('is true when the saved text would change', () => {
    expect(hasRealChanges(fresh({ mood: '😆', moodTouched: true }), base)).toBe(true)
    expect(hasRealChanges(fresh({ entriesTouched: true, entries: [...base.diary.entries.map((e) => ({ ...e, key: 'k' })), entry({ text: ['夜'] })] }), base)).toBe(true)
  })

  it('treats an empty new diary as unchanged', () => {
    expect(hasRealChanges(draft({ entriesTouched: true, entries: [entry({})] }), loaded())).toBe(false)
  })
})
