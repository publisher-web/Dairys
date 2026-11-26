export type WeatherKind = 'sun' | 'partly' | 'cloud' | 'rain' | 'snow' | 'fog' | 'thunder'

const WEATHER_BY_EMOJI: Record<string, WeatherKind> = {
  '☀️': 'sun',
  '🌤️': 'partly',
  '⛅️': 'partly',
  '⛅': 'partly',
  '🌥️': 'partly',
  '☁️': 'cloud',
  '🌫️': 'fog',
  '🌦️': 'rain',
  '🌧️': 'rain',
  '☔️': 'rain',
  '☔': 'rain',
  '❄️': 'snow',
  '🌨️': 'snow',
  '⛈️': 'thunder',
  '🌩️': 'thunder',
}

export const WEATHER_LABEL: Record<WeatherKind, string> = { sun: '晴れ', partly: '晴れ時々くもり', cloud: 'くもり', rain: '雨', snow: '雪', fog: '霧', thunder: '雷' }

export function weatherKind(emoji: string): WeatherKind | null {
  return WEATHER_BY_EMOJI[emoji] ?? null
}

export function isKnownWeather(emoji: string): boolean {
  return emoji in WEATHER_BY_EMOJI
}
