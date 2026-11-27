import { useEffect, useRef, useState } from 'react'
import { Glyph, TileIcon } from './Icon'
import Sheet from './Sheet'
import { useVaultPhotos } from './vaultPhotos'

export default function PhotoViewer({ paths: initialPaths, start, onClose }: { paths: string[]; start?: string; onClose: () => void }) {
  const [paths] = useState(initialPaths)
  const items = useVaultPhotos(paths)
  const startRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    startRef.current?.scrollIntoView({ block: 'start' })
  }, [])

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
            <figure key={p} className="viewer-item" ref={p === start ? startRef : undefined}>
              {item.status === 'ok' ? <img src={item.url} alt="" /> : <div className={`viewer-placeholder ${item.status}`}>{item.status === 'error' ? '読み込めませんでした' : '読み込んでいます…'}</div>}
            </figure>
          )
        })}
      </div>
    </Sheet>
  )
}
