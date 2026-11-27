import { useState } from 'react'
import { Glyph } from './Icon'

type Props = { kindLabel: string; name: string; usageCount: number; onDelete: () => Promise<void> }

export default function DeleteNote({ kindLabel, name, usageCount, onDelete }: Props) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      await onDelete()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  if (!asking) {
    return (
      <button className="btn danger" onClick={() => setAsking(true)}>
        <Glyph name="trash" />
        この{kindLabel}を削除
      </button>
    )
  }

  return (
    <section className="card stack">
      <p>「{name}」のノートを削除しますか？</p>
      <p className="small muted">
        {usageCount > 0 ? `日記・イベントに${usageCount}回出てきます。日記のリンクは残り、「未登録の名前」に戻ります。` : 'まだ日記には出てきていません。'}
        削除したノートは Dropbox の「削除したファイル」から一定期間は復元できます。写真は削除しません。
      </p>
      {error && <p className="error">{error}</p>}
      <div className="button-pair">
        <button className="btn secondary" disabled={busy} onClick={() => setAsking(false)}>
          やめる
        </button>
        <button className="btn danger" disabled={busy} onClick={run}>
          <Glyph name="trash" />
          {busy ? '削除しています…' : '削除する'}
        </button>
      </div>
    </section>
  )
}
