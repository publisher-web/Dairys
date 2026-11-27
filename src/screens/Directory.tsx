import { useMemo, useState } from 'react'
import { fromDateString } from '../lib/date'
import Avatar from '../ui/Avatar'
import { subText } from '../vault/labels'
import { Glyph, TileIcon } from '../ui/Icon'
import { loadDirectory, type Person, type Place } from '../vault/directory'
import type { LinkUsage } from '../vault/links'
import { RELATIONS } from '../vault/person'
import { displayName, matches } from '../vault/search'
import { useDirectory } from '../vault/useDirectory'

export type DirectoryTab = 'people' | 'places'

type Item = Person | Place
type Group = { label: string; items: Item[] }

const UNSET = '未設定'

function shortDate(s: string): string {
  const d = fromDateString(s)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

function byRecent(usage: Map<string, LinkUsage>) {
  return (a: Item, b: Item) => {
    const ua = usage.get(a.name)?.last ?? ''
    const ub = usage.get(b.name)?.last ?? ''
    return ub.localeCompare(ua) || (a.reading ?? a.name).localeCompare(b.reading ?? b.name, 'ja')
  }
}

function groupPeople(people: Person[], usage: Map<string, LinkUsage>): Group[] {
  const known: string[] = [...RELATIONS]
  const labels = [...known, ...new Set(people.map((p) => p.relation ?? '').filter((r) => r && !known.includes(r))), UNSET]
  return labels
    .map((label) => ({ label, items: people.filter((p) => (p.relation && labels.includes(p.relation) ? p.relation : UNSET) === label).sort(byRecent(usage)) }))
    .filter((g) => g.items.length > 0)
}

function groupPlaces(places: Place[], usage: Map<string, LinkUsage>): Group[] {
  const labelOf = (p: Place) => (p.kind === 'school' ? '学校' : p.kind === 'company' ? '会社' : p.category || '種別なし')
  const groups = new Map<string, Item[]>()
  for (const p of places) groups.set(labelOf(p), [...(groups.get(labelOf(p)) ?? []), p])
  const tail = new Set(['種別なし', '学校', '会社'])
  return [...groups.entries()]
    .sort(([a, ia], [b, ib]) => Number(tail.has(a)) - Number(tail.has(b)) || ib.length - ia.length || a.localeCompare(b, 'ja'))
    .map(([label, items]) => ({ label, items: items.sort(byRecent(usage)) }))
}

type Props = {
  tab: DirectoryTab
  onTab: (tab: DirectoryTab) => void
  onOpen: (item: Item) => void
  onUnresolved: () => void
}

export default function Directory({ tab, onTab, onOpen, onUnresolved }: Props) {
  const dir = useDirectory()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const items: Item[] = tab === 'people' ? dir.people : dir.places
  const trimmed = query.trim()

  const groups = useMemo(() => (tab === 'people' ? groupPeople(dir.people, dir.usage) : groupPlaces(dir.places, dir.usage)), [tab, dir.people, dir.places, dir.usage])
  const results = useMemo(() => (trimmed ? items.filter((i) => matches(i, trimmed)).sort(byRecent(dir.usage)) : []), [items, trimmed, dir.usage])

  const row = (item: Item) => {
    const u = dir.usage.get(item.name)
    return (
      <button key={`${item.kind}:${item.name}`} className="pick-row" onClick={() => onOpen(item)}>
        <Avatar item={item} />
        <span className="grow">
          <span className="pick-name">{displayName(item)}</span>
          <span className="pick-sub">{subText(item) || (item.kind === 'person' ? '読み未入力' : '')}</span>
        </span>
        {u && <span className="muted small">{shortDate(u.last)}</span>}
        <Glyph name="chevronRight" size={18} />
      </button>
    )
  }

  const toggleGroup = (label: string) =>
    setOpen((s) => {
      const next = new Set(s)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })

  return (
    <div className="stack">
      <div className="toggle" role="tablist" aria-label="人物か場所か">
        <button role="tab" aria-selected={tab === 'people'} className={tab === 'people' ? 'on pick' : ''} onClick={() => onTab('people')}>
          人物（{dir.people.length}）
        </button>
        <button role="tab" aria-selected={tab === 'places'} className={tab === 'places' ? 'on pick' : ''} onClick={() => onTab('places')}>
          場所（{dir.places.length}）
        </button>
      </div>

      <div className="search">
        <Glyph name="search" size={18} />
        <input type="text" placeholder="名前・読み・あだ名で探す" value={query} enterKeyHint="search" onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
        {query && (
          <button className="search-clear" aria-label="検索をクリア" onClick={() => setQuery('')}>
            <Glyph name="close" size={14} />
          </button>
        )}
      </div>

      {dir.unresolved.length > 0 && (
        <div className="notice">
          <TileIcon name="quill" size={36} />
          <p className="grow">ノートがまだない名前が{dir.unresolved.length}件あります</p>
          <button className="btn soft" onClick={onUnresolved}>
            見る
          </button>
        </div>
      )}

      {dir.status === 'loading' && items.length === 0 && (
        <p className="muted small center">
          読み込んでいます（{dir.progress.done} / {dir.progress.total}）
        </p>
      )}
      {dir.status === 'error' && <p className="error">{dir.error}</p>}

      {trimmed ? (
        <section className="card stack tight">
          {results.map(row)}
          {results.length === 0 && <p className="muted small center">見つかりませんでした</p>}
        </section>
      ) : (
        groups.map((g) => {
          const collapsed = tab === 'places' && !open.has(g.label) && groups.length > 1
          return (
            <section key={g.label} className="card stack tight">
              <button className="group-head" aria-expanded={!collapsed} onClick={() => tab === 'places' && toggleGroup(g.label)}>
                <span className={`ribbon ${g.label === UNSET ? 'yellow' : ''}`}>{g.label}</span>
                <span className="muted small grow">{g.items.length}件</span>
                {tab === 'places' && <Glyph name={collapsed ? 'chevronRight' : 'chevronDown'} size={18} />}
              </button>
              {!collapsed && g.items.map(row)}
            </section>
          )
        })
      )}

      <button className="btn secondary" disabled={dir.status === 'loading'} onClick={() => loadDirectory(true)}>
        <Glyph name="refresh" />
        {dir.status === 'loading' ? `読み込み中（${dir.progress.done} / ${dir.progress.total}）` : '読み込み直す'}
      </button>
    </div>
  )
}
