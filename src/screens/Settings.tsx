import { useEffect, useState } from 'react'
import { logout } from '../dropbox/auth'
import { forgetVaultRoot, resolveVaultRoot } from '../dropbox/vault'
import { Glyph } from '../ui/Icon'

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
        <span className="ribbon">保管庫</span>
        <div className="list-row">
          <span className="tag mint">場所</span>
          <span className="value">{root ?? '確認中…'}</span>
        </div>
        <div className="list-row">
          <span className="tag mint">接続先</span>
          <span className="value">Dropbox</span>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn secondary" disabled={busy} onClick={() => load(true)}>
          <Glyph name="refresh" />
          保管庫を探し直す
        </button>
      </section>
      <section className="card stack">
        <span className="ribbon yellow">その他</span>
        <button className="btn secondary" onClick={onOpenSpike}>
          <Glyph name="flask" />
          技術検証ページ
        </button>
        <button
          className="btn danger"
          onClick={() => {
            logout()
            forgetVaultRoot()
            onLogout()
          }}
        >
          <Glyph name="logout" />
          ログアウト
        </button>
      </section>
    </div>
  )
}
