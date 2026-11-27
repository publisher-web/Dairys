import { REMOTELY_SAVE_FOLDER, VAULT_NAME } from '../config'
import { deleteFile, downloadBlob, downloadText, getMetadata, listFolder, upload, type Entry, type WriteMode } from './api'
import { assertDeletablePath, assertWritablePath, diaryPath } from './guard'

const ROOT_KEY = 'dairys.vaultRoot'

function readCachedRoot(): string | null {
  try {
    return localStorage.getItem(ROOT_KEY)
  } catch {
    return null
  }
}

function writeCachedRoot(root: string | null) {
  try {
    if (root) localStorage.setItem(ROOT_KEY, root)
    else localStorage.removeItem(ROOT_KEY)
  } catch {
    void 0
  }
}

export function forgetVaultRoot() {
  writeCachedRoot(null)
}

export async function resolveVaultRoot(refresh = false): Promise<string> {
  const cached = refresh ? null : readCachedRoot()
  if (cached) return cached
  const top = await listFolder('')
  for (const folder of top.filter((e) => e['.tag'] === 'folder')) {
    const meta = await getMetadata(`${folder.path_display}/${REMOTELY_SAVE_FOLDER}/${VAULT_NAME}`)
    if (meta?.['.tag'] === 'folder') {
      writeCachedRoot(meta.path_display)
      return meta.path_display
    }
  }
  throw new Error(`Vault が見つかりません: */${REMOTELY_SAVE_FOLDER}/${VAULT_NAME}`)
}

export type VaultText = { text: string; rev: string }

export async function readVaultText(path: string): Promise<VaultText | null> {
  const meta = await getMetadata(path)
  if (!meta || meta['.tag'] !== 'file' || !meta.rev) return null
  return { text: await downloadText(path), rev: meta.rev }
}

export async function writeVaultFile(path: string, content: Blob | string, mode: WriteMode): Promise<Entry> {
  assertWritablePath(await resolveVaultRoot(), path)
  return upload(path, content, mode)
}

export async function deleteVaultNote(path: string, rev: string): Promise<void> {
  assertDeletablePath(await resolveVaultRoot(), path)
  await deleteFile(path, rev)
}

export async function readDiaryText(date: string): Promise<VaultText | null> {
  return readVaultText(diaryPath(await resolveVaultRoot(), date))
}

export async function readVaultBlob(relativePath: string): Promise<Blob> {
  const clean = relativePath.replace(/^\/+/, '')
  if (clean.split('/').some((seg) => seg === '..')) throw new Error(`invalid path: ${relativePath}`)
  return downloadBlob(`${await resolveVaultRoot()}/${clean}`)
}
