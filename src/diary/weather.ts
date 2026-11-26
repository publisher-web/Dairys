export type WeatherData = { date: string; daily: string | null; hourly: (string | null)[] }

export type Position = { lat: number; lon: number }

const POSITION_KEY = 'dairys.position'
const ENABLED_KEY = 'dairys.weather'
const POSITION_TTL = 7 * 24 * 60 * 60 * 1000

export function emojiForCode(code: number | null | undefined): string | null {
  if (code === null || code === undefined || Number.isNaN(code)) return null
  if (code <= 1) return '☀️'
  if (code === 2) return '🌤️'
  if (code === 3) return '☁️'
  if (code === 45 || code === 48) return '🌫️'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return '☔️'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return '❄️'
  if (code >= 95 && code <= 99) return '⛈️'
  return null
}

type OpenMeteoResponse = {
  error?: boolean
  reason?: string
  daily?: { time?: string[]; weather_code?: (number | null)[] }
  hourly?: { time?: string[]; weather_code?: (number | null)[] }
}

export function parseOpenMeteo(json: OpenMeteoResponse, date: string): WeatherData {
  const dailyIndex = json.daily?.time?.indexOf(date) ?? -1
  const daily = dailyIndex >= 0 ? emojiForCode(json.daily?.weather_code?.[dailyIndex]) : null
  const hourly: (string | null)[] = Array(24).fill(null)
  json.hourly?.time?.forEach((t, i) => {
    if (!t.startsWith(date)) return
    const hour = Number(t.slice(11, 13))
    if (hour >= 0 && hour < 24) hourly[hour] = emojiForCode(json.hourly?.weather_code?.[i])
  })
  return { date, daily, hourly }
}

export function weatherAt(data: WeatherData | null, time: string | null): string | null {
  if (!data || !time) return null
  const hour = Number(time.slice(0, 2))
  return data.hourly[hour] ?? data.daily
}

export function isWeatherEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setWeatherEnabled(on: boolean) {
  try {
    localStorage.setItem(ENABLED_KEY, on ? 'on' : 'off')
  } catch {
    void 0
  }
}

function cachedPosition(): Position | null {
  try {
    const raw = localStorage.getItem(POSITION_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Position & { at: number }
    return Date.now() - v.at < POSITION_TTL ? { lat: v.lat, lon: v.lon } : null
  } catch {
    return null
  }
}

export function getPosition(): Promise<Position> {
  const cached = cachedPosition()
  if (cached) return Promise.resolve(cached)
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('この端末では位置情報を使えません'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = { lat: Math.round(p.coords.latitude * 100) / 100, lon: Math.round(p.coords.longitude * 100) / 100 }
        try {
          localStorage.setItem(POSITION_KEY, JSON.stringify({ ...pos, at: Date.now() }))
        } catch {
          void 0
        }
        resolve(pos)
      },
      (e) => reject(new Error(e.code === e.PERMISSION_DENIED ? '位置情報の利用が許可されていません' : '位置情報を取得できませんでした')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60 * 60 * 1000 },
    )
  })
}

function query(pos: Position, date: string): string {
  return new URLSearchParams({
    latitude: String(pos.lat),
    longitude: String(pos.lon),
    daily: 'weather_code',
    hourly: 'weather_code',
    timezone: 'auto',
    start_date: date,
    end_date: date,
  }).toString()
}

export async function fetchWeather(date: string, pos: Position): Promise<WeatherData> {
  const forecast = (await (await fetch(`https://api.open-meteo.com/v1/forecast?${query(pos, date)}`)).json()) as OpenMeteoResponse
  if (!forecast.error) return parseOpenMeteo(forecast, date)
  const archive = (await (await fetch(`https://archive-api.open-meteo.com/v1/archive?${query(pos, date)}`)).json()) as OpenMeteoResponse
  if (archive.error) throw new Error(archive.reason ?? '天気を取得できませんでした')
  return parseOpenMeteo(archive, date)
}
