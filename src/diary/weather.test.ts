import { describe, expect, it } from 'vitest'
import { emojiForCode, parseOpenMeteo, weatherAt } from './weather'

describe('emojiForCode', () => {
  it('maps WMO codes to the emoji used in the vault', () => {
    expect(emojiForCode(0)).toBe('☀️')
    expect(emojiForCode(1)).toBe('☀️')
    expect(emojiForCode(2)).toBe('🌤️')
    expect(emojiForCode(3)).toBe('☁️')
    expect(emojiForCode(45)).toBe('🌫️')
    expect(emojiForCode(61)).toBe('☔️')
    expect(emojiForCode(81)).toBe('☔️')
    expect(emojiForCode(73)).toBe('❄️')
    expect(emojiForCode(95)).toBe('⛈️')
    expect(emojiForCode(null)).toBeNull()
  })
})

describe('parseOpenMeteo', () => {
  const json = {
    daily: { time: ['2026-11-26'], weather_code: [61] },
    hourly: {
      time: Array.from({ length: 24 }, (_, h) => `2026-11-26T${String(h).padStart(2, '0')}:00`),
      weather_code: Array.from({ length: 24 }, (_, h) => (h < 12 ? 0 : 63)),
    },
  }

  it('reads daily and hourly codes for the date', () => {
    const data = parseOpenMeteo(json, '2026-11-26')
    expect(data.daily).toBe('☔️')
    expect(data.hourly[9]).toBe('☀️')
    expect(data.hourly[18]).toBe('☔️')
  })

  it('picks the hour of an entry and falls back to the daily weather', () => {
    const data = parseOpenMeteo(json, '2026-11-26')
    expect(weatherAt(data, '09:45')).toBe('☀️')
    expect(weatherAt(data, '18:05')).toBe('☔️')
    expect(weatherAt({ ...data, hourly: Array(24).fill(null) }, '09:00')).toBe('☔️')
    expect(weatherAt(data, null)).toBeNull()
    expect(weatherAt(null, '09:00')).toBeNull()
  })

  it('handles a response without the date', () => {
    expect(parseOpenMeteo({ daily: { time: ['2026-11-25'], weather_code: [0] } }, '2026-11-26')).toEqual({ date: '2026-11-26', daily: null, hourly: Array(24).fill(null) })
  })
})
