import { useEffect, useState } from 'react'
import { ATTACHMENTS_FOLDER } from '../dropbox/guard'
import { readVaultBlob } from '../dropbox/vault'

export type PhotoItem = { status: 'loading' } | { status: 'ok'; url: string } | { status: 'error' }

const loaded = new Map<string, string>()

function vaultPath(link: string): string {
  return link.includes('/') ? link : `${ATTACHMENTS_FOLDER}/${link}`
}

function initial(paths: string[]): Record<string, PhotoItem> {
  return Object.fromEntries(paths.map((p) => [p, loaded.has(p) ? { status: 'ok', url: loaded.get(p)! } : { status: 'loading' }]))
}

export function useVaultPhotos(paths: string[]): Record<string, PhotoItem> {
  const key = paths.join('\n')
  const [state, setState] = useState<{ key: string; items: Record<string, PhotoItem> }>(() => ({ key, items: initial(paths) }))
  const items = state.key === key ? state.items : initial(paths)

  useEffect(() => {
    let alive = true
    const list = key ? key.split('\n') : []
    ;(async () => {
      for (const p of list.filter((x) => !loaded.has(x))) {
        try {
          const url = URL.createObjectURL(await readVaultBlob(vaultPath(p)))
          loaded.set(p, url)
          if (alive) setState((prev) => ({ key, items: { ...(prev.key === key ? prev.items : initial(list)), [p]: { status: 'ok', url } } }))
        } catch {
          if (alive) setState((prev) => ({ key, items: { ...(prev.key === key ? prev.items : initial(list)), [p]: { status: 'error' } } }))
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [key])

  return items
}
