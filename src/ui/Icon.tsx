import type { ReactNode } from 'react'
import type { MoodId } from '../diary/mood'
import { WEATHER_LABEL, weatherKind, type WeatherKind } from './weather'

const INK = '#5b4636'
const PAPER = '#fffdf6'
const TEAL = '#34a09c'
const DOT = '#dccdae'

const SQUIRCLE = 'M24 2.5C39.6 2.5 45.5 8.4 45.5 24S39.6 45.5 24 45.5 2.5 39.6 2.5 24 8.4 2.5 24 2.5Z'

export type TileName = 'calendar' | 'quill' | 'leaf' | 'gear' | 'flame' | 'clock' | 'bubble' | 'smile' | 'clipboard' | 'stamp' | 'cloud' | 'moon' | 'people' | 'pin' | 'camera' | 'coin'

const TILE_COLORS: Record<TileName, string> = {
  calendar: '#9fddc0',
  quill: '#f6b99b',
  leaf: '#b5e3bf',
  gear: '#cbc2ec',
  flame: '#ffe08f',
  clock: '#a9d6ee',
  bubble: '#ffe08f',
  smile: '#f7c3cd',
  clipboard: '#a3dcd6',
  stamp: TEAL,
  cloud: '#a9d6ee',
  moon: '#c9c3ea',
  people: '#ffe08f',
  pin: '#f7c9a8',
  camera: '#d4eba6',
  coin: '#cde9d6',
}

function gearPath(cx: number, cy: number, rOut: number, rIn: number, teeth: number): string {
  const step = (Math.PI * 2) / teeth
  const pt = (r: number, a: number) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`
  const parts: string[] = []
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2
    parts.push(`${i === 0 ? 'M' : 'L'}${pt(rIn, a - step * 0.3)}`, `L${pt(rOut, a - step * 0.17)}`, `L${pt(rOut, a + step * 0.17)}`, `L${pt(rIn, a + step * 0.3)}`)
  }
  return `${parts.join('')}Z`
}

function sparkle(x: number, y: number, r: number): string {
  const k = r * 0.3
  return `M${x} ${y - r}L${x + k} ${y - k}L${x + r} ${y}L${x + k} ${y + k}L${x} ${y + r}L${x - k} ${y + k}L${x - r} ${y}L${x - k} ${y - k}Z`
}

const TILE_ART: Record<TileName, ReactNode> = {
  calendar: (
    <>
      <rect x="12" y="13" width="24" height="23.5" rx="4.5" fill={PAPER} />
      <path d="M16.5 13h15a4.5 4.5 0 0 1 4.5 4.5V21H12v-3.5a4.5 4.5 0 0 1 4.5-4.5Z" fill="#f08a6c" />
      <rect x="17" y="9.8" width="3" height="6.6" rx="1.5" fill={INK} />
      <rect x="28" y="9.8" width="3" height="6.6" rx="1.5" fill={INK} />
      {[18, 24, 30].map((x) => (
        <circle key={`a${x}`} cx={x} cy="26" r="1.7" fill={DOT} />
      ))}
      <circle cx="18" cy="31.5" r="1.7" fill={DOT} />
      <circle cx="24" cy="31.5" r="1.7" fill={DOT} />
      <circle cx="30" cy="31.5" r="2.7" fill={TEAL} />
    </>
  ),
  quill: (
    <>
      <path d="M36 10c-9.2 0-17.6 5.9-19.9 15.6L15 33.2l7.6-1.5C31.9 29.7 36.5 20.4 36 10Z" fill={PAPER} />
      <path d="M33.9 19.2l-5.4 1.4 4.3 1.9ZM30.1 25.8l-5.1.9 3.8 2.1Z" fill="#f6b99b" />
      <path d="M34.3 12 16.7 32.4" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M16.7 32.4 12.6 37.4" stroke={INK} strokeWidth="2.7" strokeLinecap="round" />
    </>
  ),
  leaf: (
    <>
      <path d="M14.2 34.2c-1.7-11.2 5.4-19.6 21.2-21.3.9 14.8-7.6 22.6-21.2 21.3Z" fill="#3e9f6a" />
      <path d="M15.8 32.6 29.2 19.2M20.9 27.5l-.5-4.6M20.9 27.5l4.6.5M25 23.4l-.3-4.1M25 23.4l4.1.3" stroke="#e3f5e7" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15.8 32.6 12.2 36.4" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  gear: (
    <>
      <path d={gearPath(24, 24, 12.6, 9.4, 8)} fill={INK} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="4.4" fill="#cbc2ec" />
    </>
  ),
  flame: (
    <>
      <path d="M24.6 10.4c.8 5.6 8.6 8.4 8.6 16.5a9.2 9.2 0 0 1-18.4 0c0-4.7 2.7-7.5 4.9-9.3-.1 3 1 5.2 3 5.8-.9-5 .2-9.6 1.9-13Z" fill="#f2784b" />
      <path d="M24.1 24.4c2.2 2 4.5 3.4 4.5 6.3a4.5 4.5 0 0 1-9 0c0-2.1 1.1-3.3 2.3-4.3.1 1.3.7 2.2 1.6 2.5-.3-1.6-.1-3.1.6-4.5Z" fill="#ffd36b" />
    </>
  ),
  clock: (
    <>
      <circle cx="24" cy="24" r="12.6" fill={PAPER} />
      <circle cx="24" cy="14.6" r="1.1" fill={DOT} />
      <circle cx="33.4" cy="24" r="1.1" fill={DOT} />
      <circle cx="24" cy="33.4" r="1.1" fill={DOT} />
      <circle cx="14.6" cy="24" r="1.1" fill={DOT} />
      <path d="M24 17.6V24l4.7 3" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="24" cy="24" r="1.7" fill="#f08a6c" />
    </>
  ),
  bubble: (
    <>
      <path d="M15.5 13.5h17a4.5 4.5 0 0 1 4.5 4.5v9.5a4.5 4.5 0 0 1-4.5 4.5h-7.3l-6.2 5.2V32h-3.5a4.5 4.5 0 0 1-4.5-4.5V18a4.5 4.5 0 0 1 4.5-4.5Z" fill={PAPER} />
      <path d="M17.2 20h13.6M17.2 25.6h8.6" stroke={DOT} strokeWidth="2.3" strokeLinecap="round" />
    </>
  ),
  smile: (
    <>
      <circle cx="24" cy="24.5" r="12.4" fill="#fff4d6" />
      <circle cx="20" cy="22.6" r="1.7" fill={INK} />
      <circle cx="28" cy="22.6" r="1.7" fill={INK} />
      <path d="M19.4 27.2q4.6 4.4 9.2 0" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <circle cx="17.2" cy="27" r="1.9" fill="#f49aa8" opacity="0.7" />
      <circle cx="30.8" cy="27" r="1.9" fill="#f49aa8" opacity="0.7" />
    </>
  ),
  clipboard: (
    <>
      <rect x="14" y="12.5" width="20" height="24" rx="4" fill={PAPER} />
      <rect x="19.5" y="9.6" width="9" height="5.4" rx="2.2" fill={INK} />
      <path d="M19 25.2l3.7 3.7 6.8-7.2" stroke={TEAL} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  stamp: (
    <>
      <circle cx="24" cy="24" r="12.2" fill={PAPER} />
      <path d="M18.4 24.4l4 4 7.4-8" stroke={TEAL} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={sparkle(37.4, 11.2, 3.6)} fill="#ffd36b" />
      <path d={sparkle(10.8, 36.4, 2.8)} fill="#ffd36b" />
    </>
  ),
  cloud: (
    <>
      <path d="M17 33h14.4a5.8 5.8 0 0 0 .7-11.5 8 8 0 0 0-15.2-2A6.8 6.8 0 0 0 17 33Z" fill={PAPER} />
      <path d="M20.4 26.4l2.8 2.8 5-5.2" stroke={TEAL} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  people: (
    <>
      <circle cx="29.4" cy="18.4" r="4.3" fill={TEAL} />
      <path d="M22.6 34.2a6.8 6.8 0 0 1 13.6 0v1.4H22.6Z" fill={TEAL} />
      <circle cx="19.2" cy="20.6" r="4.8" fill="#f08a6c" />
      <path d="M11 36.4a8.2 8.2 0 0 1 16.4 0v.6H11Z" fill="#f08a6c" />
      <circle cx="17.6" cy="20" r=".9" fill={INK} />
      <circle cx="21" cy="20" r=".9" fill={INK} />
    </>
  ),
  pin: (
    <>
      <ellipse cx="24" cy="38" rx="6" ry="1.6" fill={INK} opacity="0.16" />
      <path d="M24 37s-9.4-8.4-9.4-15.6a9.4 9.4 0 0 1 18.8 0C33.4 28.6 24 37 24 37Z" fill={PAPER} />
      <circle cx="24" cy="21.6" r="3.8" fill="#f08a6c" />
    </>
  ),
  camera: (
    <>
      <rect x="18.4" y="12.4" width="9.6" height="6" rx="2.2" fill={PAPER} />
      <rect x="10.6" y="16" width="26.8" height="19.6" rx="5.4" fill={PAPER} />
      <circle cx="24" cy="25.8" r="6.6" fill={TEAL} />
      <circle cx="24" cy="25.8" r="3.6" fill={INK} />
      <circle cx="25.5" cy="24.3" r="1.2" fill={PAPER} />
      <circle cx="32.6" cy="20.4" r="1.5" fill="#f08a6c" />
    </>
  ),
  coin: (
    <>
      <circle cx="24" cy="24.6" r="12.4" fill="#e0a92b" />
      <circle cx="24" cy="23.4" r="12.4" fill="#f5c84a" />
      <circle cx="24" cy="23.4" r="9.2" fill="none" stroke="#e0a92b" strokeWidth="1.6" />
      <path d="M19.8 17.4 24 22.6l4.2-5.2M24 22.6v7.6M20.6 24.6h6.8M20.6 27.6h6.8" stroke={INK} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="18" cy="17" r="1.4" fill={PAPER} opacity="0.85" />
    </>
  ),
  moon: (
    <>
      <path d="M28.6 12.4a12 12 0 1 0 7.2 18.8 10 10 0 0 1-7.2-18.8Z" fill="#fff1b8" />
      <path d={sparkle(33.6, 15.4, 2.6)} fill={PAPER} />
      <path d={sparkle(30, 22.4, 1.7)} fill={PAPER} />
    </>
  ),
}

export function TileIcon({ name, size = 44, className }: { name: TileName; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d={SQUIRCLE} fill={TILE_COLORS[name]} />
      {TILE_ART[name]}
    </svg>
  )
}

const MOOD_TILES: Record<MoodId, string> = {
  great: '#ffc3ae',
  good: '#ffe08f',
  okay: '#b9e6c8',
  meh: '#cfdcec',
  down: '#d6cdee',
}

const MOOD_FACES: Record<MoodId, ReactNode> = {
  great: (
    <>
      <path d="M17.6 23.4l2.6-2.6 2.6 2.6M25.2 23.4l2.6-2.6 2.6 2.6" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M17.8 26.6h12.4a6.2 6.2 0 0 1-12.4 0Z" fill={INK} />
      <path d="M21 30.7a3 2.1 0 0 0 6 0 6 6 0 0 1-6 0Z" fill="#f28b8b" />
    </>
  ),
  good: (
    <>
      <circle cx="20" cy="22.4" r="1.8" fill={INK} />
      <circle cx="28" cy="22.4" r="1.8" fill={INK} />
      <path d="M18.6 26.8h10.8a5.4 5.4 0 0 1-10.8 0Z" fill={INK} />
    </>
  ),
  okay: (
    <>
      <circle cx="20" cy="22.6" r="1.8" fill={INK} />
      <circle cx="28" cy="22.6" r="1.8" fill={INK} />
      <path d="M19.6 27.6q4.4 3.6 8.8 0" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </>
  ),
  meh: (
    <>
      <circle cx="20" cy="23" r="1.8" fill={INK} />
      <circle cx="28" cy="23" r="1.8" fill={INK} />
      <path d="M20.2 29h7.6" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  down: (
    <>
      <path d="M17.4 21.6l3.6-1.6M30.6 21.6l-3.6-1.6" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="20.4" cy="24" r="1.8" fill={INK} />
      <circle cx="27.6" cy="24" r="1.8" fill={INK} />
      <path d="M19.8 31q4.2-3.4 8.4 0" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </>
  ),
}

export function MoodIcon({ id, size = 56 }: { id: MoodId; size?: number }) {
  const blush = id === 'great' || id === 'good' || id === 'okay'
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d={SQUIRCLE} fill={MOOD_TILES[id]} />
      <circle cx="24" cy="25" r="13.2" fill="#fff6dc" />
      {blush && (
        <>
          <circle cx="16.6" cy="27.4" r="2" fill="#f49aa8" opacity="0.65" />
          <circle cx="31.4" cy="27.4" r="2" fill="#f49aa8" opacity="0.65" />
        </>
      )}
      {MOOD_FACES[id]}
    </svg>
  )
}

export type GlyphName = 'chevronLeft' | 'chevronRight' | 'plus' | 'trash' | 'pin' | 'people' | 'yen' | 'clock' | 'check' | 'logout' | 'refresh' | 'flask' | 'photo' | 'pencil' | 'leaf' | 'close' | 'search' | 'question'

const GLYPHS: Record<GlyphName, ReactNode> = {
  chevronLeft: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  chevronRight: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  search: (
    <>
      <circle cx="10.6" cy="10.6" r="6" />
      <path d="M15.2 15.2 19.5 19.5" />
    </>
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M9.7 9.6a2.4 2.4 0 0 1 4.6.9c0 1.6-2.3 2-2.3 3.4M12 16.8v.1" />
    </>
  ),
  trash: <path d="M5 7.5h14M9.8 7.5V5.6h4.4v1.9M7 7.5l.9 11.2a1.6 1.6 0 0 0 1.6 1.5h5a1.6 1.6 0 0 0 1.6-1.5L17 7.5" />,
  pin: (
    <>
      <path d="M12 20.5s-6-5.3-6-10.2a6 6 0 0 1 12 0c0 4.9-6 10.2-6 10.2Z" />
      <circle cx="12" cy="10.3" r="2.1" />
    </>
  ),
  people: (
    <>
      <circle cx="9.2" cy="8.4" r="3" />
      <path d="M3.6 19a5.6 5.6 0 0 1 11.2 0" />
      <circle cx="16.6" cy="9.4" r="2.4" />
      <path d="M15.4 14.4a4.6 4.6 0 0 1 5.4 4.6" />
    </>
  ),
  yen: <path d="M7.5 5.5 12 11.5l4.5-6M12 11.5v7.5M8.6 13.2h6.8M8.6 16.2h6.8" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.8V12l2.9 1.8" />
    </>
  ),
  check: <path d="M5.5 12.6l4.2 4.2 8.8-9.4" />,
  logout: <path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14M10 16l-4-4 4-4M6 12h9" />,
  refresh: <path d="M19.2 12a7.2 7.2 0 1 1-2.1-5.1M19.4 4.6v3.6h-3.6" />,
  flask: <path d="M9.4 4h5.2M10.4 4v5.4L5.6 17.6A1.7 1.7 0 0 0 7.1 20h9.8a1.7 1.7 0 0 0 1.5-2.4l-4.8-8.2V4M7.8 14.4h8.4" />,
  photo: (
    <>
      <rect x="4" y="5.5" width="16" height="13" rx="2.6" />
      <path d="M4.6 16.4l4.4-4.2 3.4 3.2 2.6-2.4 4.4 4" />
      <circle cx="15.6" cy="9.6" r="1.4" />
    </>
  ),
  pencil: <path d="M14.6 5.8l3.6 3.6M5.5 18.5l1-4.2 9.6-9.6a1.9 1.9 0 0 1 2.6 0l1 1a1.9 1.9 0 0 1 0 2.6l-9.6 9.6-4.6.6Z" />,
  leaf: (
    <>
      <path d="M5.6 18.4C4.8 11.6 9 6.6 18.6 5.6c.5 9-4.6 13.6-13 12.8Z" />
      <path d="M6.6 17.4 14 10" />
    </>
  ),
}

export function Glyph({ name, size = 20, className }: { name: GlyphName; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {GLYPHS[name]}
    </svg>
  )
}

const CLOUD = 'M7.2 17.6h9.6a3.9 3.9 0 0 0 .5-7.8 5.4 5.4 0 0 0-10.3 1.5 3.2 3.2 0 0 0 .2 6.3Z'
const CLOUD_HIGH = 'M7.2 14.6h9.6a3.9 3.9 0 0 0 .5-7.8 5.4 5.4 0 0 0-10.3 1.5 3.2 3.2 0 0 0 .2 6.3Z'

const SUN_RAYS = [0, 45, 90, 135, 180, 225, 270, 315]

const WEATHER_ART: Record<WeatherKind, ReactNode> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4.4" fill="#ffc94a" />
      {SUN_RAYS.map((deg) => (
        <path key={deg} d="M12 3.2v2" stroke="#ffc94a" strokeWidth="2" strokeLinecap="round" transform={`rotate(${deg} 12 12)`} />
      ))}
    </>
  ),
  partly: (
    <>
      <circle cx="9" cy="8.6" r="3.6" fill="#ffc94a" />
      <path d="M9 2.6v1.4M3 8.6h1.4M4.8 4.4l1 1M13.2 4.4l-1 1" stroke="#ffc94a" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.4 19h8.2a3.4 3.4 0 0 0 .4-6.8 4.7 4.7 0 0 0-9 1.3 2.8 2.8 0 0 0 .4 5.5Z" fill="#c9d3dd" />
    </>
  ),
  cloud: <path d={CLOUD} fill="#c3ced9" />,
  rain: (
    <>
      <path d={CLOUD_HIGH} fill="#c3ced9" />
      <path d="M8.6 17.4l-1 2.4M12.4 17.4l-1 2.4M16.2 17.4l-1 2.4" stroke="#6fb3e0" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  snow: (
    <>
      <path d={CLOUD_HIGH} fill="#c3ced9" />
      <circle cx="8.4" cy="18.4" r="1.2" fill="#9cc9e8" />
      <circle cx="12.2" cy="20" r="1.2" fill="#9cc9e8" />
      <circle cx="16" cy="18.4" r="1.2" fill="#9cc9e8" />
    </>
  ),
  fog: <path d="M5 9h14M3.5 13h17M6 17h12" stroke="#b5bfca" strokeWidth="2.2" strokeLinecap="round" />,
  thunder: (
    <>
      <path d={CLOUD_HIGH} fill="#b5c0cc" />
      <path d="M12.6 14.6l-2.6 4h3l-1.6 3.4" stroke="#f5b83d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
}

export function WeatherIcon({ emoji, size = 20 }: { emoji: string; size?: number }) {
  const kind = weatherKind(emoji)
  if (!kind) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={WEATHER_LABEL[kind]}>
      {WEATHER_ART[kind]}
    </svg>
  )
}
