import { startLogin } from '../dropbox/auth'
import { TileIcon } from '../ui/Icon'

export default function Login({ error }: { error: string | null }) {
  return (
    <div className="stack">
      <div className="hero">
        <TileIcon name="quill" size={84} className="float" />
        <p className="hero-title">夜に、今日を少しだけ</p>
        <p className="muted">写真とできごとを並べるだけで、日記が続きます。</p>
      </div>
      <section className="card stack">
        <span className="ribbon">はじめに</span>
        <p>日記は Dropbox 上の Obsidian 保管庫に保存されます。最初に Dropbox でログインしてください。</p>
        <button className="btn primary" onClick={() => startLogin()}>
          Dropbox でログイン
        </button>
        {error && <p className="error">{error}</p>}
      </section>
    </div>
  )
}
