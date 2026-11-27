import { COMPANIES_FOLDER, DIARY_FOLDER, EVENTS_FOLDER, PEOPLE_FOLDER, PERSON_TEMPLATE, PLACE_TEMPLATE, PLACES_FOLDER, SCHOOLS_FOLDER, TEMPLATES_FOLDER } from '../config'

export const ATTACHMENTS_FOLDER = 'attachments'

const NOTE_FILE_RE = /^[^_./\\][^/\\]*\.md$/
const ATTACHMENT_FILE_RE = /^[^_./\\][^/\\]*\.(jpe?g|png|webp)$/i
const NOTE_FOLDERS = [DIARY_FOLDER, PEOPLE_FOLDER, EVENTS_FOLDER, PLACES_FOLDER, SCHOOLS_FOLDER, COMPANIES_FOLDER]
const TEMPLATE_FILES = [PERSON_TEMPLATE, PLACE_TEMPLATE].map((f) => `${TEMPLATES_FOLDER}/${f}`.toLowerCase())

export class UnsafePathError extends Error {}

export function assertWritablePath(vaultRoot: string, path: string): void {
  if (!vaultRoot.startsWith('/') || vaultRoot.endsWith('/')) throw new UnsafePathError(`invalid vault root: ${vaultRoot}`)
  if (path.includes('//') || path.split('/').some((seg) => seg === '..' || seg === '.')) throw new UnsafePathError(`invalid path: ${path}`)
  const rootPrefix = `${vaultRoot}/`.toLowerCase()
  if (!path.toLowerCase().startsWith(rootPrefix)) throw new UnsafePathError(`write not allowed: ${path}`)
  const relative = path.slice(rootPrefix.length)
  const lower = relative.toLowerCase()
  for (const folder of NOTE_FOLDERS) {
    const prefix = `${folder}/`.toLowerCase()
    if (lower.startsWith(prefix) && NOTE_FILE_RE.test(relative.slice(prefix.length))) return
  }
  const attachments = `${ATTACHMENTS_FOLDER}/`
  if (lower.startsWith(attachments) && ATTACHMENT_FILE_RE.test(relative.slice(attachments.length))) return
  if (TEMPLATE_FILES.includes(lower)) return
  throw new UnsafePathError(`write not allowed: ${path}`)
}

const DELETABLE_FOLDERS = [PEOPLE_FOLDER, PLACES_FOLDER, SCHOOLS_FOLDER, COMPANIES_FOLDER]

export function assertDeletablePath(vaultRoot: string, path: string): void {
  assertWritablePath(vaultRoot, path)
  const relative = path.slice(vaultRoot.length + 1).toLowerCase()
  if (!DELETABLE_FOLDERS.some((f) => relative.startsWith(`${f}/`.toLowerCase()))) throw new UnsafePathError(`delete not allowed: ${path}`)
}

export function diaryPath(vaultRoot: string, date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new UnsafePathError(`invalid date: ${date}`)
  return `${vaultRoot}/${DIARY_FOLDER}/${date}.md`
}

const BAD_NAME_RE = /[\\/:*?"<>|#^[\]]/

export function noteNameProblem(name: string): string | null {
  const n = name.trim()
  if (!n) return '名前を入れてください'
  if (BAD_NAME_RE.test(n)) return '名前に \\ / : * ? " < > | # ^ [ ] は使えません'
  if (/^[_.]/.test(n)) return '名前の先頭に _ や . は使えません'
  if (n.length > 80) return '名前が長すぎます'
  return null
}

export function notePath(vaultRoot: string, folder: string, name: string): string {
  const problem = noteNameProblem(name)
  if (problem) throw new UnsafePathError(problem)
  return `${vaultRoot}/${folder}/${name.trim()}.md`
}
