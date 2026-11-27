import { readVaultBlob } from '../dropbox/vault'
import { kvGet, kvSet } from '../storage/kv'

const urls = new Map<string, Promise<string>>()
let active = 0
const queue: (() => void)[] = []

async function limited<T>(task: () => Promise<T>): Promise<T> {
  if (active >= 4) await new Promise<void>((r) => queue.push(r))
  active++
  try {
    return await task()
  } finally {
    active--
    queue.shift()?.()
  }
}

async function fetchImage(path: string): Promise<string> {
  const key = `img:${path}`
  const cached = await kvGet<Blob>(key).catch(() => undefined)
  if (cached) return URL.createObjectURL(cached)
  const blob = await limited(() => readVaultBlob(path))
  await kvSet(key, blob).catch(() => undefined)
  return URL.createObjectURL(blob)
}

export function imageUrl(path: string): Promise<string> {
  let url = urls.get(path)
  if (!url) {
    url = fetchImage(path)
    url.catch(() => urls.delete(path))
    urls.set(path, url)
  }
  return url
}
