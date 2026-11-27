import { useEffect, useState } from 'react'
import { logout } from '../dropbox/auth'
import { forgetVaultRoot, resolveVaultRoot } from '../dropbox/vault'
import { isWeatherEnabled, setWeatherEnabled } from '../diary/weather'
import { Glyph } from '../ui/Icon'

const APP_URL = 'https://publisher-web.github.io/Dairys/'
import { loadDirectory } from '../vault/directory'
import { useDirectory } from '../vault/useDirectory'

export default function Settings({ onLogout, onOpenUnresolved }: { onLogout: () => void; onOpenUnresolved: () => void }) {
  const dir = useDirectory()
  const [weatherOn, setWeatherOn] = useState(isWeatherEnabled)
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
        <span className="ribbon yellow">使い方のヒント</span>
        <div className="stack tight">
          <p className="hint-title">ホーム画面に追加する</p>
          <ol className="steps">
            <li>Safari で Dairys を開く</li>
            <li>共有ボタン →「ホーム画面に追加」</li>
            <li>名前は「Dairys」のまま「追加」</li>
          </ol>
        </div>
        <div className="stack tight">
          <p className="hint-title">毎晩お知らせする（ショートカット App）</p>
          <ol className="steps">
            <li>「オートメーション」→「＋」→「時刻」</li>
            <li>時刻（例：21:30）と「毎日」を選び、「すぐに実行」にする</li>
            <li>アクション「URL を開く」に {APP_URL} を入れる</li>
          </ol>
          <p className="muted small">ショートカットから開くと Safari で表示されます。ホーム画面の Dairys から開いた場合と、ログイン状態や下書きが別になることがあります。</p>
        </div>
      </section>
      <section className="card stack">
        <span className="ribbon">天気</span>
        <div className="switch-row">
          <div>
            <p>天気を自動で記録する</p>
            <p className="muted small">位置情報からその日の天気と、できごとの時刻の天気を入れます（Open-Meteo）。位置はおおよそ1km単位に丸めて、この端末にだけ保存します。</p>
          </div>
          <button
            className="switch"
            role="switch"
            aria-checked={weatherOn}
            aria-label="天気を自動で記録する"
            onClick={() => {
              setWeatherEnabled(!weatherOn)
              setWeatherOn(!weatherOn)
            }}
          />
        </div>
      </section>
      <section className="card stack">
        <span className="ribbon yellow">アカウント</span>
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
