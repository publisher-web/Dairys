import { DIARY_FOLDER } from '../config'

export const ATTACHMENTS_FOLDER = 'attachments'

const DIARY_FILE_RE = /^[^_./\\][^/\\]*\.md$/
const ATTACHMENT_FILE_RE = /^[^_./\\][^/\\]*\.(jpe?g|png|webp)$/i

export class UnsafePathError extends Error {}

export function assertWritablePath(vaultRoot: string, path: string): void {
  if (!vaultRoot.startsWith('/') || vaultRoot.endsWith('/')) throw new UnsafePathError(`invalid vault root: ${vaultRoot}`)
  if (path.includes('//') || path.split('/').some((seg) => seg === '..' || seg === '.')) throw new UnsafePathError(`invalid path: ${path}`)
  const lowerPath = path.toLowerCase()
  const diaryPrefix = `${vaultRoot}/${DIARY_FOLDER}/`.toLowerCase()
  const attachmentsPrefix = `${vaultRoot}/${ATTACHMENTS_FOLDER}/`.toLowerCase()
  if (lowerPath.startsWith(diaryPrefix)) {
    if (DIARY_FILE_RE.test(path.slice(diaryPrefix.length))) return
  } else if (lowerPath.startsWith(attachmentsPrefix)) {
    if (ATTACHMENT_FILE_RE.test(path.slice(attachmentsPrefix.length))) return
  }
  throw new UnsafePathError(`write not allowed: ${path}`)
}

export function diaryPath(vaultRoot: string, date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new UnsafePathError(`invalid date: ${date}`)
  return `${vaultRoot}/${DIARY_FOLDER}/${date}.md`
}
