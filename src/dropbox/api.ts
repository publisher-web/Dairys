import { getAccessToken } from './auth'

const RPC_BASE = 'https://api.dropboxapi.com/2'
const CONTENT_BASE = 'https://content.dropboxapi.com/2'

export type Entry = {
  '.tag': 'file' | 'folder' | 'deleted'
  name: string
  path_display: string
  path_lower?: string
  rev?: string
  server_modified?: string
  size?: number
}

export type WriteMode = { kind: 'add' } | { kind: 'overwrite' } | { kind: 'update'; rev: string }

export class DropboxError extends Error {
  readonly status: number
  readonly body: string
  constructor(endpoint: string, status: number, body: string) {
    super(`${endpoint} ${status}: ${body}`)
    this.status = status
    this.body = body
  }
  get isConflict(): boolean {
    return this.status === 409 && this.body.includes('conflict')
  }
  get isNotFound(): boolean {
    return this.status === 409 && this.body.includes('not_found')
  }
}

function headerSafeJson(value: unknown): string {
  return JSON.stringify(value).replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
}

function toWriteMode(mode: WriteMode) {
  if (mode.kind === 'update') return { '.tag': 'update', update: mode.rev }
  return mode.kind
}

async function rpc<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${RPC_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new DropboxError(endpoint, res.status, await res.text())
  return (await res.json()) as T
}

export async function listFolder(path: string): Promise<Entry[]> {
  const first = await rpc<{ entries: Entry[]; cursor: string; has_more: boolean }>('files/list_folder', { path })
  const entries = [...first.entries]
  let page = first
  while (page.has_more) {
    page = await rpc('files/list_folder/continue', { cursor: page.cursor })
    entries.push(...page.entries)
  }
  return entries
}

export async function listFolderRecursive(path: string): Promise<Entry[]> {
  const first = await rpc<{ entries: Entry[]; cursor: string; has_more: boolean }>('files/list_folder', { path, recursive: true })
  const entries = [...first.entries]
  let page = first
  while (page.has_more) {
    page = await rpc('files/list_folder/continue', { cursor: page.cursor })
    entries.push(...page.entries)
  }
  return entries
}

export async function getMetadata(path: string): Promise<Entry | null> {
  try {
    return await rpc<Entry>('files/get_metadata', { path })
  } catch (e) {
    if (e instanceof DropboxError && e.isNotFound) return null
    throw e
  }
}

export async function downloadText(path: string): Promise<string> {
  const res = await fetch(`${CONTENT_BASE}/files/download`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      'Dropbox-API-Arg': headerSafeJson({ path }),
    },
  })
  if (!res.ok) throw new DropboxError('files/download', res.status, await res.text())
  return await res.text()
}

export async function upload(path: string, content: Blob | string, mode: WriteMode): Promise<Entry> {
  const res = await fetch(`${CONTENT_BASE}/files/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': headerSafeJson({ path, mode: toWriteMode(mode), autorename: false, mute: true }),
    },
    body: typeof content === 'string' ? new TextEncoder().encode(content) : content,
  })
  if (!res.ok) throw new DropboxError('files/upload', res.status, await res.text())
  return (await res.json()) as Entry
}
