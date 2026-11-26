import { useEffect, useState } from 'react'
import { logout } from '../dropbox/auth'
import { forgetVaultRoot, resolveVaultRoot } from '../dropbox/vault'
import { Glyph } from '../ui/Icon'
import { loadDirectory } from '../vault/directory'
import { useDirectory } from '../vault/useDirectory'

export default function Settings({ onLogout, onOpenSpike, onOpenUnresolved }: { onLogout: () => void; onOpenSpike: () => void; onOpenUnresolved: () => void }) {
  const dir = useDirectory()
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
        <span className="ribbon">人物・場所の候補</span>
        <div className="list-row">
          <span className="tag mint">人物</span>
          <span className="value">{dir.people.length > 0 ? `${dir.people.length}人` : '読み込み中…'}</span>
        </div>
        <div className="list-row">
          <span className="tag mint">場所</span>
          <span className="value">{dir.places.length > 0 ? `${dir.places.length}件` : '読み込み中…'}</span>
        </div>
        <div className="list-row">
          <span className="tag cream">未登録</span>
          <span className="value">{dir.status === 'ready' ? `${dir.unresolved.length}件` : '－'}</span>
        </div>
        <button className="btn secondary" onClick={onOpenUnresolved}>
          <Glyph name="question" />
          未登録の名前を見る
        </button>
        <button className="btn secondary" disabled={dir.status === 'loading'} onClick={() => loadDirectory(true)}>
          <Glyph name="refresh" />
          {dir.status === 'loading' ? `読み込み中（${dir.progress.done} / ${dir.progress.total}）` : '候補を読み込み直す'}
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
