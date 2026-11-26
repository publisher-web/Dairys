import { describe, expect, it } from 'vitest'
import { addDays, dateLabel, defaultDiaryDate, relativeDayName, streakDays } from './date'

describe('date helpers', () => {
  it('adds days across months', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('treats late night as the previous day', () => {
    expect(defaultDiaryDate(new Date(2026, 10, 27, 1, 30))).toBe('2026-11-26')
    expect(defaultDiaryDate(new Date(2026, 10, 27, 4, 0))).toBe('2026-11-27')
    expect(defaultDiaryDate(new Date(2026, 10, 27, 23, 59))).toBe('2026-11-27')
  })

  it('names today and yesterday', () => {
    expect(relativeDayName('2026-11-27', '2026-11-27')).toBe('今日')
    expect(relativeDayName('2026-11-26', '2026-11-27')).toBe('昨日')
    expect(relativeDayName('2026-11-20', '2026-11-27')).toBeNull()
  })

  it('shows the year only for other years', () => {
    expect(dateLabel('2026-11-27', '2026-11-27')).not.toContain('2026')
    expect(dateLabel('2001-01-01', '2026-11-27')).toContain('2001')
  })
})

describe('streakDays', () => {
  const written = new Set(['2026-11-24', '2026-11-25', '2026-11-26'])

  it('counts from yesterday when today is not written yet', () => {
    expect(streakDays(written, '2026-11-27')).toBe(3)
  })

  it('includes today when written', () => {
    expect(streakDays(new Set([...written, '2026-11-27']), '2026-11-27')).toBe(4)
  })

  it('is zero after a gap', () => {
    expect(streakDays(written, '2026-11-29')).toBe(0)
  })
})
