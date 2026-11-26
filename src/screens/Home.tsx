import { useEffect, useState } from 'react'
import { writtenDates } from '../diary/store'
import { resolveVaultRoot } from '../dropbox/vault'
import { addDays, dateLabel, defaultDiaryDate, streakDays, toDateString } from '../lib/date'
import { loadDraft } from '../wizard/draft'

type VaultState = { kind: 'wait' } | { kind: 'ok' } | { kind: 'ng'; message: string }

function greeting(hour: number): { emoji: string; text: string } {
  if (hour < 4) return { emoji: '🌙', text: 'よふかしさん、おつかれさま' }
  if (hour < 11) return { emoji: '🌤️', text: 'おはよう' }
  if (hour < 17) return { emoji: '☀️', text: 'こんにちは' }
  return { emoji: '🌙', text: 'こんばんは' }
}

export default function Home({ onStart }: { onStart: (date: string) => void }) {
  const [now] = useState(() => new Date())
  const today = toDateString(now)
  const [date, setDate] = useState(() => defaultDiaryDate(now))
  const [vault, setVault] = useState<VaultState>({ kind: 'wait' })
  const [written, setWritten] = useState<Set<string> | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const hello = greeting(now.getHours())

  useEffect(() => {
    resolveVaultRoot()
      .then(() => {
        setVault({ kind: 'ok' })
        return writtenDates(addDays(today, -400))
      })
      .then(setWritten)
      .catch((e: unknown) => setVault({ kind: 'ng', message: e instanceof Error ? e.message : String(e) }))
  }, [today])

  useEffect(() => {
    loadDraft(date).then((d) => setHasDraft(!!d))
  }, [date])

  const yesterday = addDays(today, -1)
  const streak = written ? streakDays(written, today) : null
  const isDone = written?.has(date) ?? false
  const missedYesterday = written !== null && date === today && !written.has(yesterday)

  return (
    <div className="stack">
      <section className="card hero">
        <span className="hero-emoji" aria-hidden="true">
          {hello.emoji}
        </span>
        <p className="hero-title">{hello.text}</p>
        <p className="muted">{dateLabel(today, today)}</p>
        {streak !== null && (
          <p className="streak">
            🔥 <b>{streak}</b> 日れんぞく
          </p>
        )}
      </section>

      {missedYesterday && (
        <button className="banner" onClick={() => setDate(yesterday)}>
          <span aria-hidden="true">🍃</span> きのうがまだだよ。きのうを書く？
        </button>
      )}

      <section className="card stack">
        <div className="row between">
          <h2>📅 {dateLabel(date, today)}</h2>
          <span className={`pill ${isDone ? 'done' : ''}`}>{written === null ? '…' : isDone ? 'かけた ✅' : 'まだ ✏️'}</span>
        </div>
        <div className="segmented">
          <button className={date === yesterday ? 'on' : ''} onClick={() => setDate(yesterday)}>
            きのう
          </button>
          <button className={date === today ? 'on' : ''} onClick={() => setDate(today)}>
            今日
          </button>
          <label className={date !== today && date !== yesterday ? 'on' : ''}>
            ほかの日
            <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
        </div>
        <button className="btn" disabled={vault.kind !== 'ok'} onClick={() => onStart(date)}>
          {hasDraft ? '✏️ つづきを書く' : isDone ? '📝 書きたす・なおす' : '🌙 ふりかえりをはじめる'}
        </button>
      </section>

      <section className="card">
        <div className="status">
          <span className={`status-dot ${vault.kind}`} />
          <div>
            {vault.kind === 'wait' && <p>保管庫をさがしています…</p>}
            {vault.kind === 'ok' && <p>保管庫とつながっています 🌿</p>}
            {vault.kind === 'ng' && <p className="error">{vault.message}</p>}
          </div>
        </div>
      </section>
    </div>
  )
}
