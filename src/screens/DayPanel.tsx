import { useEffect, useState } from 'react'
import { extraBlocks } from '../diary/extras'
import type { Entry } from '../diary/markdown'
import { moodFromEmoji } from '../diary/mood'
import { loadDiary, type LoadedDiary } from '../diary/store'
import { dateLabel, relativeDayName } from '../lib/date'
import { formatYen } from '../lib/money'
import { Glyph, MoodIcon, TileIcon, WeatherIcon } from '../ui/Icon'
import PhotoViewer from '../ui/PhotoViewer'
import Sheet from '../ui/Sheet'
import { useVaultPhotos } from '../ui/vaultPhotos'
import { isKnownWeather, WEATHER_LABEL, weatherKind } from '../ui/weather'

type Props = {
  date: string
  today: string
  written: boolean
  prev: string | null
  next: string | null
  onMove: (date: string) => void
  onWrite: (date: string) => void
  onClose: () => void
}

type State = { date: string; status: 'loading' } | { date: string; status: 'ok'; loaded: LoadedDiary } | { date: string; status: 'error'; message: string }

export default function DayPanel({ date, today, written, prev, next, onMove, onWrite, onClose }: Props) {
  const [state, setState] = useState<State>({ date, status: 'loading' })
  const [viewer, setViewer] = useState<{ paths: string[]; start: string } | null>(null)
  const current: State = state.date === date ? state : { date, status: 'loading' }

  useEffect(() => {
    if (!written) return
    let alive = true
    loadDiary(date)
      .then((loaded) => {
        if (alive) setState({ date, status: 'ok', loaded })
      })
      .catch((e: unknown) => {
        if (alive) setState({ date, status: 'error', message: e instanceof Error ? e.message : String(e) })
      })
    return () => {
      alive = false
    }
  }, [date, written])

  const relative = relativeDayName(date, today)

  return (
    <Sheet label={`${dateLabel(date, today)}の日記`} onClose={onClose} className={`day-panel ${written ? 'filled' : ''}`}>
      <div className="sheet-head">
        <button className="round-button" aria-label="前の日記" disabled={!prev} onClick={() => prev && onMove(prev)}>
          <Glyph name="chevronLeft" />
        </button>
        <div className="grow center">
          {relative && <p className="muted small">{relative}</p>}
          <p className="sheet-title">{dateLabel(date, today)}</p>
        </div>
        <button className="round-button" aria-label="次の日記" disabled={!next} onClick={() => next && onMove(next)}>
          <Glyph name="chevronRight" />
        </button>
        <button className="round-button" aria-label="閉じる" onClick={onClose}>
          <Glyph name="close" />
        </button>
      </div>

      {!written ? (
        <div className="day-empty">
          <TileIcon name="quill" size={56} />
          <p>この日の日記はまだありません</p>
          <button className="btn primary" onClick={() => onWrite(date)}>
            <Glyph name="pencil" />
            この日を書く
          </button>
        </div>
      ) : (
        <>
          <div className="day-body">
            {current.status === 'loading' && <p className="muted center day-loading">読み込んでいます…</p>}
            {current.status === 'error' && <p className="error">{current.message}</p>}
            {current.status === 'ok' && <DayContent loaded={current.loaded} onOpenPhoto={(paths, start) => setViewer({ paths, start })} />}
          </div>
          <button className="btn soft" onClick={() => onWrite(date)}>
            <Glyph name="pencil" />
            書き足す・直す
          </button>
        </>
      )}
      {viewer && <PhotoViewer paths={viewer.paths} start={viewer.start} onClose={() => setViewer(null)} />}
    </Sheet>
  )
}

function DayContent({ loaded, onOpenPhoto }: { loaded: LoadedDiary; onOpenPhoto: (paths: string[], start: string) => void }) {
  const { diary } = loaded
  const mood = moodFromEmoji(diary.mood)
  const dayWeather = diary.weather && isKnownWeather(diary.weather) ? diary.weather : null
  const extras = loaded.text ? extraBlocks(loaded.text) : []
  const allPhotos = [...diary.entries.flatMap((e) => e.photos), ...extras.flatMap((b) => b.photos)]
  const amounts = diary.entries.map((e) => e.amount ?? 0).filter((a) => a !== 0)
  const expense = amounts.filter((a) => a < 0).reduce((a, b) => a + b, 0)
  const income = amounts.filter((a) => a > 0).reduce((a, b) => a + b, 0)
  const open = (p: string) => onOpenPhoto(allPhotos, p)

  return (
    <div className="stack">
      {(mood || dayWeather || amounts.length > 0) && (
        <div className="day-facts">
          {mood && (
            <span className="day-fact">
              <MoodIcon id={mood.id} size={30} />
              {mood.label}
            </span>
          )}
          {dayWeather && (
            <span className="day-fact">
              <WeatherIcon emoji={dayWeather} size={24} />
              {WEATHER_LABEL[weatherKind(dayWeather)!]}
            </span>
          )}
          {expense < 0 && (
            <span className="tag cream">
              <Glyph name="yen" size={15} />
              {formatYen(expense)}
            </span>
          )}
          {income > 0 && (
            <span className="tag mint">
              <Glyph name="yen" size={15} />
              {formatYen(income)}
            </span>
          )}
        </div>
      )}

      {diary.oneLiner && (
        <div className="day-quote">
          <span className="tag mint">今日の一言</span>
          <p>{diary.oneLiner}</p>
        </div>
      )}

      {diary.entries.length > 0 && (
        <>
          <span className="ribbon yellow">できごと</span>
          <div className="timeline">
            {diary.entries.map((e, i) => (
              <DayEntry key={i} entry={e} onOpenPhoto={open} />
            ))}
          </div>
        </>
      )}

      {extras.map((b, i) => (
        <div key={i} className="day-extra stack tight">
          {b.heading && <p className="day-extra-title">{b.heading}</p>}
          {b.lines.length > 0 && <p className="value">{b.lines.join('\n')}</p>}
          {b.photos.length > 0 && <Thumbs paths={b.photos} onOpen={open} />}
        </div>
      ))}
    </div>
  )
}

function DayEntry({ entry, onOpenPhoto }: { entry: Entry; onOpenPhoto: (path: string) => void }) {
  const weather = entry.weather && isKnownWeather(entry.weather) ? entry.weather : null
  const chips = [
    weather ? (
      <span key="w" className="tag plain">
        <WeatherIcon emoji={weather} size={18} />
        {WEATHER_LABEL[weatherKind(weather)!]}
      </span>
    ) : null,
    entry.place ? (
      <span key="p" className="tag plain">
        <Glyph name="pin" size={15} />
        {entry.place.alias ?? entry.place.target}
      </span>
    ) : null,
    ...entry.people.map((p, i) => (
      <span key={`h${i}`} className="tag plain">
        <Glyph name="people" size={15} />
        {p.alias ?? p.target}
      </span>
    )),
    entry.amount ? (
      <span key="a" className={`tag ${entry.amount > 0 ? 'mint' : 'cream'}`}>
        <Glyph name="yen" size={15} />
        {formatYen(entry.amount)}
      </span>
    ) : null,
  ].filter(Boolean)
  return (
    <div className="timeline-item">
      <span className="tag cream">{entry.time ?? '－'}</span>
      <div className="stack tight">
        {entry.text.length > 0 && <p className="value">{entry.text.join('\n')}</p>}
        {entry.photos.length > 0 && <Thumbs paths={entry.photos} onOpen={onOpenPhoto} />}
        {chips.length > 0 && <div className="chips">{chips}</div>}
      </div>
    </div>
  )
}

function Thumbs({ paths, onOpen }: { paths: string[]; onOpen: (path: string) => void }) {
  const items = useVaultPhotos(paths)
  return (
    <div className="day-photos">
      {paths.map((p) => {
        const item = items[p] ?? { status: 'loading' }
        return (
          <button key={p} className={`day-photo ${item.status}`} aria-label="写真を大きく見る" onClick={() => onOpen(p)}>
            {item.status === 'ok' ? <img src={item.url} alt="" /> : item.status === 'error' ? <Glyph name="photo" /> : null}
          </button>
        )
      })}
    </div>
  )
}
