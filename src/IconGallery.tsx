import { MOODS } from './diary/mood'
import { Glyph, MoodIcon, TileIcon, WeatherIcon, type GlyphName, type TileName } from './ui/Icon'

const TILES: TileName[] = ['calendar', 'quill', 'leaf', 'gear', 'flame', 'clock', 'bubble', 'smile', 'clipboard', 'stamp', 'cloud', 'moon']
const GLYPHS: GlyphName[] = ['chevronLeft', 'chevronRight', 'plus', 'trash', 'pin', 'people', 'yen', 'clock', 'check', 'logout', 'refresh', 'flask', 'photo', 'pencil', 'leaf', 'close']
const WEATHER = ['☀️', '🌤️', '☁️', '🌫️', '☔️', '❄️', '⛈️']

export default function IconGallery() {
  return (
    <div className="stack" style={{ padding: 16, maxWidth: 480 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {TILES.map((t) => (
          <div key={t} style={{ textAlign: 'center', fontSize: 11 }}>
            <TileIcon name={t} size={72} />
            <div>{t}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {MOODS.map((m) => (
          <MoodIcon key={m.id} id={m.id} size={72} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, color: '#5b4636' }}>
        {GLYPHS.map((g) => (
          <Glyph key={g} name={g} size={32} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        {WEATHER.map((w) => (
          <WeatherIcon key={w} emoji={w} size={40} />
        ))}
      </div>
    </div>
  )
}
