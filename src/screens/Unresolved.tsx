import { fromDateString } from '../lib/date'
import { Glyph, TileIcon } from '../ui/Icon'
import { loadDirectory } from '../vault/directory'
import { useDirectory } from '../vault/useDirectory'

function shortDate(s: string): string {
  const d = fromDateString(s)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

export default function Unresolved() {
  const dir = useDirectory()

  return (
    <div className="stack">
      <section className="card stack">
        <div className="row">
          <TileIcon name="people" size={44} />
          <p className="grow small">日記やイベントでリンクしているのに、ノートがまだない名前です。PC の Obsidian でノートを作ると、候補に表示されるようになります。</p>
        </div>
      </section>

      <section className="card stack">
        <span className="ribbon yellow">未登録の名前</span>
        {dir.status === 'loading' && (
          <p className="muted small">
            確認しています（{dir.progress.done} / {dir.progress.total}）
          </p>
        )}
        {dir.status === 'ready' && dir.unresolved.length === 0 && <p className="muted">未登録の名前はありません。</p>}
        {dir.unresolved.map((u) => (
          <div key={u.name} className="list-row">
            <span className="grow">{u.name}</span>
            <span className="muted small">
              {u.count}回・{shortDate(u.last)}
            </span>
          </div>
        ))}
        <button className="btn secondary" disabled={dir.status === 'loading'} onClick={() => loadDirectory(true)}>
          <Glyph name="refresh" />
          読み込み直す
        </button>
      </section>
    </div>
  )
}
