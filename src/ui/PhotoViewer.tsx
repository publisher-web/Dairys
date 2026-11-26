import { useEffect, useState } from 'react'
import { readVaultBlob } from '../dropbox/vault'
import { Glyph, TileIcon } from './Icon'
import Sheet from './Sheet'

const loaded = new Map<string, string>()

type Item = { status: 'loading' } | { status: 'ok'; url: string } | { status: 'error' }

function initial(paths: string[]): Record<string, Item> {
  return Object.fromEntries(paths.map((p) => [p, loaded.has(p) ? { status: 'ok', url: loaded.get(p)! } : { status: 'loading' }]))
}

export default function PhotoViewer({ paths: initialPaths, onClose }: { paths: string[]; onClose: () => void }) {
  const [paths] = useState(initialPaths)
  const [items, setItems] = useState<Record<string, Item>>(() => initial(initialPaths))

  useEffect(() => {
    let alive = true
    const missing = paths.filter((p) => !loaded.has(p))
    ;(async () => {
      for (const p of missing) {
        try {
          const url = URL.createObjectURL(await readVaultBlob(p))
          loaded.set(p, url)
          if (alive) setItems((prev) => ({ ...prev, [p]: { status: 'ok', url } }))
        } catch {
          if (alive) setItems((prev) => ({ ...prev, [p]: { status: 'error' } }))
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [paths])

  return (
    <Sheet label="写真" onClose={onClose} className="photo-viewer">
      <div className="sheet-head">
        <TileIcon name="camera" size={36} />
        <p className="sheet-title grow">写真（{paths.length}枚）</p>
        <button className="round-button" aria-label="閉じる" onClick={onClose}>
          <Glyph name="close" />
        </button>
      </div>
      <div className="viewer-list">
        {paths.map((p) => {
          const item = items[p] ?? { status: 'loading' }
          return (
            <figure key={p} className="viewer-item">
              {item.status === 'ok' ? <img src={item.url} alt="" /> : <div className={`viewer-placeholder ${item.status}`}>{item.status === 'error' ? '読み込めませんでした' : '読み込んでいます…'}</div>}
            </figure>
          )
        })}
      </div>
    </Sheet>
  )
}
