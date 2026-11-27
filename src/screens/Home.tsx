import { useEffect, useState } from 'react'
import type { VaultState } from '../App'
import { writtenDates } from '../diary/store'
import { addDays, dateLabel, defaultDiaryDate, fromDateString, relativeDayName, streakDays, toDateString } from '../lib/date'
import { Glyph, TileIcon, type TileName } from '../ui/Icon'
import { isTouched, loadDraft, pendingDraftDates } from '../wizard/draft'

function greeting(hour: number): { icon: TileName; text: string } {
  if (hour < 4) return { icon: 'moon', text: '夜ふかしですね' }
  if (hour < 11) return { icon: 'leaf', text: 'おはようございます' }
  if (hour < 17) return { icon: 'leaf', text: 'こんにちは' }
  return { icon: 'moon', text: 'こんばんは' }
}

function dateFromUrl(today: string): string | null {
  const value = new URLSearchParams(window.location.search).get('date')
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && value <= today ? value : null
}

function shortDate(s: string, today?: string): string {
  const d = fromDateString(s)
  const md = `${d.getMonth() + 1}/${d.getDate()}`
  return today && s.slice(0, 4) !== today.slice(0, 4) ? `${d.getFullYear()}/${md}` : md
}

export default function Home({ vault, onStart }: { vault: VaultState; onStart: (date: string) => void }) {
  const [now] = useState(() => new Date())
  const today = toDateString(now)
  const yesterday = addDays(today, -1)
  const [date, setDate] = useState(() => dateFromUrl(toDateString(now)) ?? defaultDiaryDate(now))
  const [written, setWritten] = useState<Set<string> | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [drafts, setDrafts] = useState<string[]>([])
  const hello = greeting(now.getHours())

  useEffect(() => {
    if (vault.kind !== 'ok') return
    writtenDates(addDays(today, -400))
      .then(setWritten)
      .catch(() => setWritten(new Set()))
  }, [vault.kind, today])

  useEffect(() => {
    loadDraft(date).then((d) => setHasDraft(isTouched(d)))
  }, [date])

  useEffect(() => {
    pendingDraftDates().then(setDrafts)
  }, [])

  const otherDrafts = drafts.filter((d) => d !== date)

  const streak = written ? streakDays(written, today) : null
  const isDone = written?.has(date) ?? false
  const missedYesterday = written !== null && date === today && !written.has(yesterday)
  const relative = relativeDayName(date, today)
  const isOther = date !== today && date !== yesterday

  return (
    <div className="stack home">
      <div className="hero">
        <TileIcon name={hello.icon} size={64} className="float" />
        <p className="hero-title">{hello.text}</p>
      </div>

      <section className="card stack">
        <span className="ribbon">日記を書く</span>
        <div className="date-heading">
          <TileIcon name="calendar" size={48} />
          <div className="grow">
            {relative && <p className="muted small">{relative}</p>}
            <p className="date-text">{dateLabel(date, today)}</p>
          </div>
          {written !== null && <span className={`tag ${isDone ? 'mint' : 'cream'}`}>{isDone ? '記入済み' : '未記入'}</span>}
        </div>
        <div className="date-tiles">
          <button className={`date-tile ${date === yesterday ? 'on' : ''}`} onClick={() => setDate(yesterday)}>
            <span>昨日</span>
            <span className="small">{shortDate(yesterday)}</span>
          </button>
          <button className={`date-tile ${date === today ? 'on' : ''}`} onClick={() => setDate(today)}>
            <span>今日</span>
            <span className="small">{shortDate(today)}</span>
          </button>
          <label className={`date-tile ${isOther ? 'on' : ''}`}>
            <span>日付を選ぶ</span>
            <span className="small">{isOther ? shortDate(date) : '－'}</span>
            <input type="date" value={date} max={today} aria-label="日付を選ぶ" onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
        </div>
        <button className="btn primary" disabled={vault.kind !== 'ok'} onClick={() => onStart(date)}>
          <Glyph name="pencil" />
          {hasDraft ? '続きを書く' : isDone ? '書き足す・直す' : 'ふりかえりを始める'}
        </button>
      </section>

      {otherDrafts.length > 0 && (
        <div className="notice">
          <TileIcon name="quill" size={36} />
          <div className="grow stack tight">
            <p>保存していない下書きがあります</p>
            <div className="chips">
              {otherDrafts.slice(0, 4).map((d) => (
                <button key={d} className="tag cream tag-button" onClick={() => setDate(d)}>
                  {shortDate(d, today)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {missedYesterday && !otherDrafts.includes(yesterday) && (
        <div className="notice">
          <TileIcon name="quill" size={36} />
          <p className="grow">昨日の日記がまだです</p>
          <button className="btn soft" onClick={() => setDate(yesterday)}>
            昨日を書く
          </button>
        </div>
      )}

      {streak !== null && (
        <div className="streak-line">
          <span className="tag cream">
            <TileIcon name="flame" size={20} />
            {streak > 0 ? `${streak}日連続で記録中` : '今日から記録を始めましょう'}
          </span>
        </div>
      )}

      <div className="status-line footer">
        <span className={`dot ${vault.kind}`} />
        {vault.kind === 'wait' && '保管庫を確認しています…'}
        {vault.kind === 'ok' && '保管庫に接続しています'}
        {vault.kind === 'ng' && <span className="error">{vault.message}</span>}
      </div>
    </div>
  )
}
