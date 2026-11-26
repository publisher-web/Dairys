import { useEffect, useMemo, useRef, useState } from 'react'
import type { LinkRef } from '../diary/markdown'
import type { Person, Place, PlaceKind } from '../vault/directory'
import { rankByUsage } from '../vault/links'
import { linkLabel, linkOf } from '../vault/refs'
import { displayName, hasExactName, matches } from '../vault/search'
import { useDirectory } from '../vault/useDirectory'
import { Glyph, TileIcon } from './Icon'

type Item = Person | Place

const KIND_LABEL: Record<Item['kind'], string> = { person: '人物', place: '場所', school: '学校', company: '会社' }
const AVATAR_COLORS = ['#f6b99b', '#9fddc0', '#a9d6ee', '#cbc2ec', '#ffe08f', '#f7c3cd']
const PLACE_COLORS: Record<PlaceKind, string> = { place: '#f7c9a8', school: '#a9d6ee', company: '#cbc2ec' }

function hash(s: string): number {
  let h = 0
  for (const ch of s) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0
  return h
}

function Avatar({ item }: { item: Item }) {
  if (item.kind !== 'person')
    return (
      <span className="avatar" style={{ background: PLACE_COLORS[item.kind] }}>
        <Glyph name="pin" size={18} />
      </span>
    )
  const label = displayName(item)
  return (
    <span className="avatar" style={{ background: AVATAR_COLORS[hash(item.name) % AVATAR_COLORS.length] }}>
      {[...label][0]}
    </span>
  )
}

function subText(item: Item): string {
  const display = displayName(item)
  if (item.kind === 'person') return display !== item.name ? item.name : (item.reading ?? '')
  return [KIND_LABEL[item.kind], display !== item.name ? item.name : null].filter(Boolean).join('・')
}

function collate(a: Item, b: Item): number {
  return (a.reading ?? a.name).localeCompare(b.reading ?? b.name, 'ja')
}

type Props = {
  mode: 'people' | 'place'
  selected: LinkRef[]
  onDone: (selected: LinkRef[]) => void
  onClose: () => void
}

export default function Picker({ mode, selected, onDone, onClose }: Props) {
  const dir = useDirectory()
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<LinkRef[]>(selected)
  const inputRef = useRef<HTMLInputElement>(null)
  const items: Item[] = mode === 'people' ? dir.people : dir.places
  const multi = mode === 'people'
  const title = mode === 'people' ? '一緒にいた人' : '場所'

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const recent = useMemo(() => rankByUsage(items, dir.usage).slice(0, 8), [items, dir.usage])
  const all = useMemo(() => [...items].sort(collate), [items])
  const results = useMemo(() => (query.trim() ? all.filter((i) => matches(i, query)) : all), [all, query])
  const trimmed = query.trim()
  const canAddNew = trimmed.length > 0 && !hasExactName(items, trimmed) && !picked.some((p) => p.target === trimmed)

  const isOn = (ref: LinkRef) => picked.some((p) => p.target === ref.target)
  const choose = (ref: LinkRef) => {
    if (!multi) {
      onDone([ref])
      return
    }
    setPicked((list) => (list.some((p) => p.target === ref.target) ? list.filter((p) => p.target !== ref.target) : [...list, ref]))
    setQuery('')
    inputRef.current?.focus()
  }

  const row = (item: Item) => {
    const ref = linkOf(item)
    const on = isOn(ref)
    return (
      <button key={`${item.kind}:${item.name}`} className={`pick-row ${on ? 'on' : ''}`} onClick={() => choose(ref)}>
        <Avatar item={item} />
        <span className="grow">
          <span className="pick-name">{displayName(item)}</span>
          <span className="pick-sub">{subText(item)}</span>
        </span>
        {on && <Glyph name="check" />}
      </button>
    )
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <TileIcon name={mode === 'people' ? 'people' : 'pin'} size={36} />
          <p className="sheet-title grow">{title}</p>
          <button className="round-button" aria-label="閉じる" onClick={onClose}>
            <Glyph name="close" />
          </button>
        </div>

        <label className="search">
          <Glyph name="search" size={18} />
          <input ref={inputRef} type="text" placeholder="名前・読み・あだ名で探す" value={query} onChange={(e) => setQuery(e.target.value)} enterKeyHint="done" />
          {query && (
            <button
              className="search-clear"
              aria-label="検索をクリア"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
            >
              <Glyph name="close" size={14} />
            </button>
          )}
        </label>

        {multi && picked.length > 0 && (
          <div className="chips">
            {picked.map((p) => (
              <span key={p.target} className="tag mint removable">
                {linkLabel(p)}
                <button aria-label={`${linkLabel(p)}を外す`} onClick={() => setPicked((list) => list.filter((x) => x.target !== p.target))}>
                  <Glyph name="close" size={13} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="sheet-list">
          {dir.status === 'loading' && items.length === 0 && (
            <p className="muted small center">
              候補を準備しています（{dir.progress.done} / {dir.progress.total}）
            </p>
          )}
          {dir.status === 'error' && <p className="error">{dir.error}</p>}

          {!trimmed && recent.length > 0 && (
            <>
              <p className="section-label">最近</p>
              {recent.map(row)}
              <p className="section-label">すべて</p>
            </>
          )}
          {results.map(row)}
          {canAddNew && (
            <button className="pick-row new" onClick={() => choose({ target: trimmed, alias: null })}>
              <span className="avatar plus">
                <Glyph name="plus" size={18} />
              </span>
              <span className="grow">
                <span className="pick-name">「{trimmed}」を名前だけで追加</span>
                <span className="pick-sub">ノートはあとから PC で作れます</span>
              </span>
              <span className="tag cream">未登録</span>
            </button>
          )}

          {trimmed && results.length === 0 && !canAddNew && <p className="muted small center">見つかりませんでした</p>}
        </div>

        {multi && (
          <button className="btn primary" onClick={() => onDone(picked)}>
            <Glyph name="check" />
            決定（{picked.length}人）
          </button>
        )}
      </div>
    </div>
  )
}
