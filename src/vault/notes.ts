import { PEOPLE_FOLDER, PERSON_TEMPLATE, PLACE_TEMPLATE, PLACES_FOLDER, SCHOOLS_FOLDER, TEMPLATES_FOLDER } from '../config'
import { DropboxError, listFolder } from '../dropbox/api'
import { notePath } from '../dropbox/guard'
import { deleteVaultNote, readVaultText, resolveVaultRoot, writeVaultFile } from '../dropbox/vault'
import { PLACE_FOLDERS, type Person, type Place } from './directory'
import { emptyPerson, newPersonText, parsePerson, personSkeleton, setRelationIfEmpty, type Relation } from './person'
import { emptyPlace, newPlaceText } from './place'
import { needsDataviewUpgrade, upgradeDataview } from './queries'
import { draftRelations } from './relation'
import { renameLinks } from './rename'

const MAX_ATTEMPTS = 4

export async function readNote(path: string): Promise<{ text: string; rev: string }> {
  const found = await readVaultText(path)
  if (!found) throw new Error('ノートが見つかりません。読み込み直してください')
  return found
}

export async function updateNote(path: string, transform: (text: string) => string, known?: { text: string; rev: string }): Promise<boolean> {
  let latest = known ?? (await readNote(path))
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const next = transform(latest.text)
    if (next === latest.text) return false
    try {
      await writeVaultFile(path, next, { kind: 'update', rev: latest.rev })
      return true
    } catch (e) {
      if (!(e instanceof DropboxError && e.isConflict)) throw e
      latest = await readNote(path)
    }
  }
  throw new Error('保存が混み合っています。少し待ってからもう一度ためしてください')
}

export async function deleteNote(path: string, rev: string): Promise<void> {
  try {
    await deleteVaultNote(path, rev)
  } catch (e) {
    if (e instanceof DropboxError && e.isConflict) throw new Error('ほかの端末で変更されています。開き直してから削除してください')
    throw e
  }
}

async function createNote(path: string, text: string) {
  try {
    await writeVaultFile(path, text, { kind: 'add' })
  } catch (e) {
    if (e instanceof DropboxError && e.isConflict) throw new Error('同じ名前のノートがすでにあります')
    throw e
  }
}

export type NewNote = { kind: 'person'; name: string; reading: string; relation: string } | { kind: 'place'; name: string; category: string }

export type ConnectResult = { created: boolean; rewritten: number; failed: string[] }

export async function connectUnresolved(from: string, note: NewNote, existing: Person | Place | null, sourcePaths: string[], onProgress: (done: number, total: number) => void): Promise<ConnectResult> {
  const root = await resolveVaultRoot()
  const name = note.name.trim()
  let created = false
  if (!existing) {
    const aliases = from !== name ? [from] : []
    if (note.kind === 'person') {
      await createNote(notePath(root, PEOPLE_FOLDER, name), newPersonText({ ...emptyPerson(name), aliases, reading: note.reading, relation: note.relation }))
    } else {
      await createNote(notePath(root, PLACES_FOLDER, name), newPlaceText({ ...emptyPlace(name), aliases, category: note.category }))
    }
    created = true
  }
  const target = existing?.name ?? name
  let rewritten = 0
  const failed: string[] = []
  const paths = target === from ? [] : sourcePaths
  onProgress(0, paths.length)
  for (const [i, path] of paths.entries()) {
    try {
      if (await updateNote(path, (t) => renameLinks(t, from, target))) rewritten++
    } catch {
      failed.push(path.split('/').pop() ?? path)
    }
    onProgress(i + 1, paths.length)
  }
  return { created, rewritten, failed }
}

export type MaintenanceTarget = 'people' | 'places'

export type MaintenanceItem = { path: string; name: string; upgrade: boolean; relation: Relation | null; template: boolean }

async function listNotes(folder: string): Promise<{ name: string; path: string }[]> {
  const root = await resolveVaultRoot()
  try {
    return (await listFolder(`${root}/${folder}`))
      .filter((e) => e['.tag'] === 'file' && /^[^_.].*\.md$/i.test(e.name))
      .map((e) => ({ name: e.name.replace(/\.md$/i, ''), path: e.path_display }))
  } catch (e) {
    if (e instanceof DropboxError && e.isNotFound) return []
    throw e
  }
}

async function pooled<T, R>(items: T[], worker: (item: T) => Promise<R>, onTick: () => void): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const run = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await worker(items[i])
      onTick()
    }
  }
  await Promise.all(Array.from({ length: Math.min(8, items.length) }, run))
  return out
}

function templatePath(root: string, target: MaintenanceTarget): string {
  return `${root}/${TEMPLATES_FOLDER}/${target === 'people' ? PERSON_TEMPLATE : PLACE_TEMPLATE}`
}

function templateTransform(target: MaintenanceTarget): (text: string) => string {
  if (target === 'places') return upgradeDataview
  return (text) => (needsDataviewUpgrade(text) || /bloodType:/.test(text) ? personSkeleton('{{title}}') : text)
}

export async function planMaintenance(target: MaintenanceTarget, onProgress: (done: number, total: number) => void): Promise<MaintenanceItem[]> {
  const root = await resolveVaultRoot()
  const folders = target === 'people' ? [PEOPLE_FOLDER] : PLACE_FOLDERS.map((f) => f.path)
  const files = (await Promise.all(folders.map(listNotes))).flat()
  let done = 0
  onProgress(0, files.length + 1)
  const tick = () => onProgress(++done, files.length + 1)
  const texts = await pooled(files, async (f) => (await readNote(f.path)).text, tick)
  const notes = files.map((f, i) => ({ ...f, text: texts[i] }))
  const drafts = target === 'people' ? draftRelations(notes, new Set((await listNotes(SCHOOLS_FOLDER)).map((s) => s.name))) : new Map<string, Relation>()
  const items: MaintenanceItem[] = notes
    .map((n) => ({
      path: n.path,
      name: n.name,
      upgrade: needsDataviewUpgrade(n.text),
      relation: target === 'people' && !parsePerson(n.text, n.name).relation ? (drafts.get(n.name) ?? null) : null,
      template: false,
    }))
    .filter((i) => i.upgrade || i.relation)
  const tpl = await readVaultText(templatePath(root, target))
  tick()
  if (tpl && templateTransform(target)(tpl.text) !== tpl.text) items.push({ path: templatePath(root, target), name: target === 'people' ? PERSON_TEMPLATE : PLACE_TEMPLATE, upgrade: true, relation: null, template: true })
  return items
}

export async function runMaintenance(target: MaintenanceTarget, items: MaintenanceItem[], onProgress: (done: number, total: number) => void): Promise<{ changed: number; failed: string[] }> {
  let changed = 0
  const failed: string[] = []
  onProgress(0, items.length)
  for (const [i, item] of items.entries()) {
    const transform = item.template
      ? templateTransform(target)
      : (text: string) => {
          const upgraded = upgradeDataview(text)
          return item.relation ? setRelationIfEmpty(upgraded, item.relation) : upgraded
        }
    try {
      if (await updateNote(item.path, transform)) changed++
    } catch {
      failed.push(item.name)
    }
    onProgress(i + 1, items.length)
  }
  return { changed, failed }
}
