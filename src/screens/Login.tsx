import { startLogin } from '../dropbox/auth'

export default function Login({ error }: { error: string | null }) {
  return (
    <div className="stack">
      <section className="card hero">
        <span className="hero-emoji" aria-hidden="true">
          📔
        </span>
        <p className="hero-title">まいにちの ふりかえり</p>
        <p className="muted">夜にちょっとだけ、今日をのこそう</p>
      </section>
      <section className="card stack">
        <p>日記は Dropbox の Obsidian 保管庫にとどきます。はじめにログインしてね。</p>
        <button className="btn sky" onClick={() => startLogin()}>
          Dropbox でログイン
        </button>
        {error && <p className="error">{error}</p>}
      </section>
    </div>
  )
}
