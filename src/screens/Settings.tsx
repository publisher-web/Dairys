import { useEffect, useState } from 'react'
import { logout } from '../dropbox/auth'
import { forgetVaultRoot, resolveVaultRoot } from '../dropbox/vault'

export default function Settings({ onLogout, onOpenSpike }: { onLogout: () => void; onOpenSpike: () => void }) {
  const [root, setRoot] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async (refresh: boolean) => {
    setBusy(true)
    setError(null)
    try {
      setRoot(await resolveVaultRoot(refresh))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    resolveVaultRoot()
      .then(setRoot)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  return (
    <div className="stack">
      <section className="card stack">
        <h2>⚙️ せってい</h2>
        <dl className="kv">
          <dt>保管庫</dt>
          <dd>{root ?? '—'}</dd>
        </dl>
        {error && <p className="error">{error}</p>}
        <button className="btn ghost" disabled={busy} onClick={() => load(true)}>
          保管庫をさがしなおす
        </button>
      </section>
      <section className="card stack">
        <button className="btn ghost" onClick={onOpenSpike}>
          🧪 技術検証ページ
        </button>
        <button
          className="btn danger"
          onClick={() => {
            logout()
            forgetVaultRoot()
            onLogout()
          }}
        >
          ログアウト
        </button>
      </section>
    </div>
  )
}
