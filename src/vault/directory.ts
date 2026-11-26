import { DIARY_FOLDER } from '../config'
import { DropboxError, downloadText, listFolder, listFolderRecursive, type Entry } from '../dropbox/api'
import { resolveVaultRoot } from '../dropbox/vault'
import { kvGet, kvSet } from '../storage/kv'
import { frontmatterOf, readList, readScalar } from './frontmatter'
import { buildUsage, extractLinkTargets, unresolvedLinks, type LinkUsage, type Unresolved } from './links'

export type PlaceKind = 'place' | 'school' | 'company'

export type Person = { kind: 'person'; name: string; reading: string | null; aliases: string[] }
export type Place = { kind: PlaceKind; name: string; reading: string | null; aliases: string[] }

export const PEOPLE_FOLDER = '30_HumanNetwork/10_People'
export const EVENTS_FOLDER = '30_HumanNetwork/30_Events'
export const PLACE_FOLDERS: { path: string; kind: PlaceKind }[] = [
  { path: '30_HumanNetwork/40_Places', kind: 'place' },
  { path: '30_HumanNetwork/15_Schools', kind: 'school' },
  { path: '30_HumanNetwork/20_Companies', kind: 'company' },
]

type NoteCache = { rev: string; reading: string | null; aliases: string[] }
type LinkCache = { rev: string; targets: string[] }
type Cache = { notes: Record<string, NoteCache>; links: Record<string, LinkCache> }

const CACHE_KEY = 'directory:v1'
const CONCURRENCY = 8

export type DirectoryState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  progress: { done: number; total: number }
  people: Person[]
  places: Place[]
  usage: Map<string, LinkUsage>
  unresolved: Unresolved[]
  error: string | null
}

let state: DirectoryState = {
  status: 'idle',
  progress: { done: 0, total: 0 },
  people: [],
  places: [],
  usage: new Map(),
  unresolved: [],
  error: null,
}
const listeners = new Set<() => void>()
let running: Promise<void> | null = null

function setState(patch: Partial<DirectoryState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function getDirectory(): DirectoryState {
  return state
}

export function subscribeDirectory(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

async function listMarkdown(path: string): Promise<Entry[]> {
  try {
    return (await listFolder(path)).filter((e) => e['.tag'] === 'file' && e.name.toLowerCase().endsWith('.md'))
  } catch (e) {
    if (e instanceof DropboxError && e.isNotFound) return []
    throw e
  }
}

async function pool<T>(items: T[], worker: (item: T) => Promise<void>) {
  let next = 0
  const run = async () => {
    while (next < items.length) {
      const item = items[next++]
      await worker(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, run))
}

function baseName(file: Entry): string {
  return file.name.replace(/\.md$/i, '')
}

function dateOf(file: Entry): string | null {
  return /^(\d{4}-\d{2}-\d{2})/.exec(file.name)?.[1] ?? null
}

async function load(refresh: boolean) {
  setState({ status: 'loading', error: null })
  const root = await resolveVaultRoot()
  const cache: Cache = (!refresh && (await kvGet<Cache>(CACHE_KEY))) || { notes: {}, links: {} }

  const peopleFiles = await listMarkdown(`${root}/${PEOPLE_FOLDER}`)
  const placeGroups = await Promise.all(PLACE_FOLDERS.map(async (g) => ({ kind: g.kind, files: await listMarkdown(`${root}/${g.path}`) })))
  const linkFiles = [...(await listMarkdown(`${root}/${DIARY_FOLDER}`)), ...(await listMarkdown(`${root}/${EVENTS_FOLDER}`))].filter((f) => dateOf(f))

  const noteFiles = [...peopleFiles, ...placeGroups.flatMap((g) => g.files)]
  const keyOf = (f: Entry) => f.path_lower ?? f.path_display
  const toItem = (f: Entry) => {
    const c = cache.notes[keyOf(f)]
    return { name: baseName(f), reading: c?.reading ?? null, aliases: c?.aliases ?? [] }
  }
  const buildPeople = (): Person[] => peopleFiles.map((f) => ({ kind: 'person', ...toItem(f) }))
  const buildPlaces = (): Place[] => placeGroups.flatMap((g) => g.files.map((f) => ({ kind: g.kind, ...toItem(f) })))
  const buildUsageNow = () => buildUsage(linkFiles.map((f) => ({ date: dateOf(f)!, targets: cache.links[keyOf(f)]?.targets ?? [] })))

  const stalePeople = peopleFiles.filter((f) => cache.notes[keyOf(f)]?.rev !== f.rev)
  const stalePlaces = placeGroups.flatMap((g) => g.files).filter((f) => cache.notes[keyOf(f)]?.rev !== f.rev)
  const staleLinks = linkFiles.filter((f) => cache.links[keyOf(f)]?.rev !== f.rev)
  const total = stalePeople.length + stalePlaces.length + staleLinks.length
  let done = 0
  setState({ people: buildPeople(), places: buildPlaces(), usage: buildUsageNow(), progress: { done, total } })
  const tick = () => {
    done++
    if (done % 8 === 0 || done === total) setState({ progress: { done, total } })
  }
  const fetchNote = async (f: Entry) => {
    const fm = frontmatterOf(await downloadText(f.path_display))
    cache.notes[keyOf(f)] = { rev: f.rev ?? '', reading: readScalar(fm, 'reading'), aliases: readList(fm, 'aliases') }
    tick()
  }

  await pool(stalePeople, fetchNote)
  setState({ people: buildPeople() })
  await kvSet(CACHE_KEY, cache)
  await pool(stalePlaces, fetchNote)
  setState({ places: buildPlaces() })
  await kvSet(CACHE_KEY, cache)
  await pool(staleLinks, async (f) => {
    cache.links[keyOf(f)] = { rev: f.rev ?? '', targets: extractLinkTargets(await downloadText(f.path_display)) }
    tick()
  })
  await kvSet(CACHE_KEY, cache)
  const usage = buildUsageNow()

  const allNames = new Set<string>()
  try {
    const everything = await listFolderRecursiveNames(root)
    everything.forEach((n) => allNames.add(n))
  } catch {
    noteFiles.forEach((f) => allNames.add(baseName(f)))
  }

  setState({ status: 'ready', usage, unresolved: unresolvedLinks(usage, allNames) })
}

async function listFolderRecursiveNames(root: string): Promise<string[]> {
  return (await listFolderRecursive(root)).filter((e) => e['.tag'] === 'file' && e.name.toLowerCase().endsWith('.md')).map((e) => e.name.replace(/\.md$/i, ''))
}

export function loadDirectory(refresh = false): Promise<void> {
  if (running && !refresh) return running
  running = load(refresh)
    .catch((e: unknown) => setState({ status: 'error', error: e instanceof Error ? e.message : String(e) }))
    .finally(() => {
      running = null
    })
  return running
}
