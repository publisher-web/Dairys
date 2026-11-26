import { useEffect, useState } from 'react'
import { resolveVaultRoot } from '../dropbox/vault'

type VaultState = { kind: 'wait' } | { kind: 'ok'; root: string } | { kind: 'ng'; message: string }

function greeting(hour: number): { emoji: string; text: string } {
  if (hour < 5) return { emoji: '🌙', text: 'おそくまでおつかれさま' }
  if (hour < 11) return { emoji: '🌤️', text: 'おはよう' }
  if (hour < 17) return { emoji: '☀️', text: 'こんにちは' }
  return { emoji: '🌙', text: 'こんばんは' }
}

function todayLabel(now: Date): string {
  return now.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
}

export default function Home() {
  const [vault, setVault] = useState<VaultState>({ kind: 'wait' })
  const [now] = useState(() => new Date())
  const hello = greeting(now.getHours())

  useEffect(() => {
    resolveVaultRoot()
      .then((root) => setVault({ kind: 'ok', root }))
      .catch((e: unknown) => setVault({ kind: 'ng', message: e instanceof Error ? e.message : String(e) }))
  }, [])

  return (
    <div className="stack">
      <section className="card hero">
        <span className="hero-emoji" aria-hidden="true">
          {hello.emoji}
        </span>
        <p className="hero-title">{hello.text}</p>
        <p className="muted">{todayLabel(now)}</p>
      </section>
      <section className="card stack">
        <h2>今日のふりかえり</h2>
        <p className="muted">写真 → できごと → 気分 → 一言 の順に、ゆっくり書けるようになるよ。</p>
        <button className="btn" disabled>
          じゅんびちゅう…
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
