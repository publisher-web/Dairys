import { useEffect, useState } from 'react'
import { readVaultBlob } from '../dropbox/vault'
import { readNote } from './notes'

type Found = { text: string; rev: string }
type State = { key: string; found: Found | null; error: string | null }

export function useNote(path: string): { found: Found | null; error: string | null; reload: () => void } {
  const [round, setRound] = useState(0)
  const [state, setState] = useState<State>({ key: '', found: null, error: null })
  const key = `${path}#${round}`

  useEffect(() => {
    let alive = true
    readNote(path)
      .then((found) => alive && setState({ key, found, error: null }))
      .catch((e: unknown) => alive && setState({ key, found: null, error: e instanceof Error ? e.message : String(e) }))
    return () => {
      alive = false
    }
  }, [path, key])

  const current = state.key === key
  return { found: current ? state.found : null, error: current ? state.error : null, reload: () => setRound((r) => r + 1) }
}

export function useVaultImage(path: string | null): string | null {
  const [image, setImage] = useState<{ path: string; url: string } | null>(null)

  useEffect(() => {
    if (!path) return
    let alive = true
    let made: string | null = null
    readVaultBlob(path)
      .then((blob) => {
        if (!alive) return
        made = URL.createObjectURL(blob)
        setImage({ path, url: made })
      })
      .catch(() => undefined)
    return () => {
      alive = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [path])

  return image && image.path === path ? image.url : null
}
