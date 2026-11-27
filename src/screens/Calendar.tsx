import { useEffect, useRef, useState } from 'react'
import type { VaultState } from '../App'
import { moodFromEmoji } from '../diary/mood'
import { diaryIndex, type DayInfo } from '../diary/store'
import { addMonths, monthGrid, monthKey } from '../lib/date'
import { Glyph, MoodIcon } from '../ui/Icon'
import DayPanel from './DayPanel'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

type Props = {
  vault: VaultState
  today: string
  month: string
  onMonth: (month: string) => void
  onWrite: (date: string) => void
}

export default function Calendar({ vault, today, month, onMonth, onWrite }: Props) {
  const [index, setIndex] = useState<Map<string, DayInfo> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const thisMonth = monthKey(today)

  useEffect(() => {
    if (vault.kind !== 'ok') return
    diaryIndex()
      .then(setIndex)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [vault.kind])

  const written = index ? [...index.keys()].sort() : []
  const inMonth = written.filter((d) => monthKey(d) === month)
  const photos = inMonth.reduce((n, d) => n + (index?.get(d)?.photos ?? 0), 0)
  const [y, m] = month.split('-').map(Number)
  const canNext = month < thisMonth

  const move = (n: number) => {
    const target = addMonths(month, n)
    if (target <= thisMonth) onMonth(target)
  }

  const neighbor = (date: string, dir: 1 | -1): string | null => {
    const list = dir === 1 ? written.filter((d) => d > date) : written.filter((d) => d < date).reverse()
    return list[0] ?? null
  }

  const select = (date: string) => {
    setSelected(date)
    if (monthKey(date) !== month) onMonth(monthKey(date))
  }

  return (
    <div className="stack calendar">
      <section
        className="card stack"
        onTouchStart={(e) => {
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }}
        onTouchEnd={(e) => {
          const start = touch.current
          touch.current = null
          if (!start) return
          const dx = e.changedTouches[0].clientX - start.x
          const dy = e.changedTouches[0].clientY - start.y
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1)
        }}
      >
        <div className="cal-head">
          <button className="round-button" aria-label="前の月" onClick={() => move(-1)}>
            <Glyph name="chevronLeft" />
          </button>
          <p className="cal-title grow center">
            <span className="small muted">{y}年</span>
            {m}月
          </p>
          <button className="round-button" aria-label="次の月" disabled={!canNext} onClick={() => move(1)}>
            <Glyph name="chevronRight" />
          </button>
        </div>

        <div className="cal-grid" role="grid" aria-label={`${y}年${m}月`}>
          {WEEKDAYS.map((w, i) => (
            <span key={w} className={`cal-weekday ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>
              {w}
            </span>
          ))}
          {monthGrid(month)
            .flat()
            .map((date, i) => {
              if (!date) return <span key={`e${i}`} className="cal-day blank" />
              const info = index?.get(date)
              const mood = moodFromEmoji(info?.mood ?? null)
              const future = date > today
              const cls = ['cal-day', info ? 'written' : '', date === today ? 'today' : '', future ? 'future' : '', i % 7 === 0 ? 'sun' : i % 7 === 6 ? 'sat' : ''].filter(Boolean).join(' ')
              return (
                <button key={date} className={cls} disabled={future || !index} aria-label={`${Number(date.slice(8))}日${info ? '（日記あり）' : ''}`} onClick={() => select(date)}>
                  <span className="cal-num">{Number(date.slice(8))}</span>
                  <span className="cal-mark">{info ? mood ? <MoodIcon id={mood.id} size={24} /> : <span className="cal-dot" /> : null}</span>
                  {info && info.photos > 0 && (
                    <span className="cal-photo">
                      <Glyph name="photo" size={11} />
                    </span>
                  )}
                </button>
              )
            })}
        </div>

        <div className="cal-foot">
          {index === null && !error && <span className="muted small">日記を読み込んでいます…</span>}
          {error && <span className="error">{error}</span>}
          {index && (
            <span className="tag cream">
              <Glyph name="pencil" size={14} />
              {inMonth.length > 0 ? `${m}月は${inMonth.length}日記録` : `${m}月の日記はまだありません`}
            </span>
          )}
          {index && photos > 0 && (
            <span className="tag plain">
              <Glyph name="photo" size={14} />
              写真 {photos}枚
            </span>
          )}
          {month !== thisMonth && (
            <button className="tag plain tag-button" onClick={() => onMonth(thisMonth)}>
              今月に戻る
            </button>
          )}
        </div>
      </section>

      {selected && (
        <DayPanel
          date={selected}
          today={today}
          written={index?.has(selected) ?? false}
          prev={neighbor(selected, -1)}
          next={neighbor(selected, 1)}
          onMove={select}
          onWrite={onWrite}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
