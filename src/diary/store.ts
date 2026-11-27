import { DIARY_FOLDER } from '../config'
import { DropboxError, listFolder } from '../dropbox/api'
import { diaryPath } from '../dropbox/guard'
import { readVaultText, resolveVaultRoot, writeVaultFile } from '../dropbox/vault'
import { kvGet, kvSet } from '../storage/kv'
import { applyDiary, isWritten, mergeExternalEntries, parseDiary, type Diary, type DiaryUpdate } from './markdown'

export type LoadedDiary = {
  date: string
  text: string | null
  rev: string | null
  diary: Diary
}

export async function loadDiary(date: string): Promise<LoadedDiary> {
  const root = await resolveVaultRoot()
  const found = await readVaultText(diaryPath(root, date))
  const text = found?.text ?? null
  return {
    date,
    text,
    rev: found?.rev ?? null,
    diary: text ? parseDiary(text, date) : { date, mood: null, weather: null, oneLiner: '', entries: [] },
  }
}

export type SaveResult = { text: string; rev: string; merged: number }

const MAX_ATTEMPTS = 4

export async function saveDiary(loaded: LoadedDiary, update: DiaryUpdate): Promise<SaveResult> {
  const root = await resolveVaultRoot()
  const path = diaryPath(root, loaded.date)
  let latest: { text: string | null; rev: string | null } = { text: loaded.text, rev: loaded.rev }
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let effective = update
    let merged = 0
    if (latest.rev !== loaded.rev && update.entries && latest.text) {
      const latestEntries = parseDiary(latest.text, loaded.date).entries
      const entries = mergeExternalEntries(loaded.diary.entries, latestEntries, update.entries)
      merged = entries.length - update.entries.length
      effective = { ...update, entries }
    }
    const next = applyDiary(latest.text, loaded.date, effective)
    try {
      const entry = await writeVaultFile(path, next, latest.rev ? { kind: 'update', rev: latest.rev } : { kind: 'add' })
      await rememberWritten(loaded.date, entry.rev ?? '', next)
      return { text: next, rev: entry.rev ?? '', merged }
    } catch (e) {
      if (!(e instanceof DropboxError && e.isConflict)) throw e
      const found = await readVaultText(path)
      latest = { text: found?.text ?? null, rev: found?.rev ?? null }
    }
  }
  throw new Error('保存が混み合っています。少し待ってからもう一度ためしてね')
}

export type DayInfo = { written: boolean; mood: string | null; photos: number }

type IndexCache = Record<string, DayInfo & { rev: string }>

const INDEX_KEY = 'diaryIndex'

function dayInfo(text: string, date: string): DayInfo {
  const diary = parseDiary(text, date)
  return { written: isWritten(text), mood: diary.mood, photos: diary.entries.reduce((n, e) => n + e.photos.length, 0) }
}

async function rememberWritten(date: string, rev: string, text: string) {
  const cache = (await kvGet<IndexCache>(INDEX_KEY)) ?? {}
  cache[date] = { rev, ...dayInfo(text, date) }
  await kvSet(INDEX_KEY, cache)
}

export async function diaryIndex(onlySince?: string): Promise<Map<string, DayInfo>> {
  const root = await resolveVaultRoot()
  const files = (await listFolder(`${root}/${DIARY_FOLDER}`)).filter((e) => e['.tag'] === 'file' && /^\d{4}-\d{2}-\d{2}\.md$/.test(e.name))
  const cache = (await kvGet<IndexCache>(INDEX_KEY)) ?? {}
  const result = new Map<string, DayInfo>()
  let changed = false
  for (const f of files) {
    const date = f.name.slice(0, 10)
    if (onlySince && date < onlySince) continue
    const cached = cache[date]
    if (cached && cached.rev === f.rev) {
      if (cached.written) result.set(date, cached)
      continue
    }
    const found = await readVaultText(f.path_display)
    if (!found) continue
    const info = dayInfo(found.text, date)
    cache[date] = { rev: found.rev, ...info }
    changed = true
    if (info.written) result.set(date, info)
  }
  if (changed) await kvSet(INDEX_KEY, cache)
  return result
}

export async function writtenDates(onlySince?: string): Promise<Set<string>> {
  return new Set((await diaryIndex(onlySince)).keys())
}
