import { useMemo, useState } from 'react'
import { noteNameProblem } from '../dropbox/guard'
import { fromDateString } from '../lib/date'
import { Segments, TextField } from '../ui/Fields'
import { Glyph, TileIcon } from '../ui/Icon'
import Sheet from '../ui/Sheet'
import { loadDirectory, reloadDirectory } from '../vault/directory'
import type { Unresolved as UnresolvedName } from '../vault/links'
import { connectUnresolved, type ConnectResult } from '../vault/notes'
import { RELATIONS } from '../vault/person'
import { normalizeForSearch } from '../vault/search'
import { useDirectory } from '../vault/useDirectory'

function shortDate(s: string): string {
  const d = fromDateString(s)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

type Phase = { kind: 'edit' } | { kind: 'saving'; done: number; total: number } | { kind: 'done'; result: ConnectResult; target: string } | { kind: 'error'; message: string }

function CreateSheet({ item, onClose }: { item: UnresolvedName; onClose: () => void }) {
  const dir = useDirectory()
  const [kind, setKind] = useState<'person' | 'place'>('person')
  const [name, setName] = useState(item.name)
  const [reading, setReading] = useState('')
  const [relation, setRelation] = useState('')
  const [category, setCategory] = useState('')
  const [phase, setPhase] = useState<Phase>({ kind: 'edit' })

  const trimmed = name.trim()
  const problem = noteNameProblem(trimmed)
  const existing = useMemo(() => [...dir.people, ...dir.places].find((n) => normalizeForSearch(n.name) === normalizeForSearch(trimmed)) ?? null, [dir.people, dir.places, trimmed])
  const sources = useMemo(() => dir.sources.filter((s) => s.targets.includes(item.name)).map((s) => s.path), [dir.sources, item.name])
  const categories = useMemo(() => [...new Set(dir.places.map((p) => p.category ?? '').filter(Boolean))], [dir.places])
  const target = existing?.name ?? trimmed

  const save = async () => {
    setPhase({ kind: 'saving', done: 0, total: sources.length })
    try {
      const note = kind === 'person' ? { kind, name: trimmed, reading, relation } : { kind, name: trimmed, category }
      const result = await connectUnresolved(item.name, note, existing, sources, (done, total) => setPhase({ kind: 'saving', done, total }))
      setPhase({ kind: 'done', result, target })
      await reloadDirectory()
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }

  return (
    <Sheet label="ノートを作る" onClose={phase.kind === 'saving' ? () => undefined : onClose}>
      <div className="sheet-head">
        <TileIcon name={kind === 'person' ? 'people' : 'pin'} size={36} />
        <p className="sheet-title grow">「{item.name}」のノート</p>
        <button className="round-button" aria-label="閉じる" disabled={phase.kind === 'saving'} onClick={onClose}>
          <Glyph name="close" />
        </button>
      </div>

      {phase.kind === 'done' ? (
        <div className="stack">
          <p>
            {phase.result.created ? `「${phase.target}」のノートを作りました。` : `「${phase.target}」のノートにつなぎました。`}
            {phase.result.rewritten > 0 && `${phase.result.rewritten}件のファイルのリンクを直しました。`}
          </p>
          {phase.result.failed.length > 0 && <p className="error">直せなかったファイル: {phase.result.failed.join('、')}</p>}
          <button className="btn primary" onClick={onClose}>
            <Glyph name="check" />
            閉じる
          </button>
        </div>
      ) : (
        <div className="sheet-list stack">
          <div className="toggle" role="radiogroup" aria-label="人物か場所か">
            <button role="radio" aria-checked={kind === 'person'} className={kind === 'person' ? 'on pick' : ''} onClick={() => setKind('person')}>
              人物
            </button>
            <button role="radio" aria-checked={kind === 'place'} className={kind === 'place' ? 'on pick' : ''} onClick={() => setKind('place')}>
              場所
            </button>
          </div>
          <TextField label={kind === 'person' ? '正式名（フルネーム）' : '正式名（店名・施設名）'} value={name} onChange={setName} />
          {problem && trimmed && <p className="error small">{problem}</p>}
          {existing ? (
            <p className="form-note">同じ名前のノート「{existing.name}」があるので、新しくは作らずにそこへつなぎます。</p>
          ) : kind === 'person' ? (
            <>
              <TextField label="読み" value={reading} placeholder="ひらがなで" onChange={setReading} />
              <Segments label="間柄" options={RELATIONS} value={relation} onChange={setRelation} />
            </>
          ) : (
            <TextField label="種別" value={category} suggestions={categories} placeholder="例：飲食店" onChange={setCategory} />
          )}
          <p className="form-note">
            {target === item.name
              ? '日記のリンクはそのまま使えます。'
              : `日記・イベントの${sources.length}件のファイルにある [[${item.name}]] を [[${target}|${item.name}]] に書き換えます。日記での表示は「${item.name}」のままです。`}
          </p>
          {phase.kind === 'error' && <p className="error">{phase.message}</p>}
          <button className="btn primary" disabled={!!problem || phase.kind === 'saving'} onClick={save}>
            <Glyph name="check" />
            {phase.kind === 'saving' ? `保存しています（${phase.done} / ${phase.total}）` : existing ? 'このノートにつなぐ' : 'ノートを作る'}
          </button>
        </div>
      )}
    </Sheet>
  )
}

export default function Unresolved() {
  const dir = useDirectory()
  const [open, setOpen] = useState<UnresolvedName | null>(null)

  return (
    <div className="stack">
      <section className="card stack">
        <div className="row">
          <TileIcon name="people" size={44} />
          <p className="grow small">日記やイベントでリンクしているのに、ノートがまだない名前です。タップすると、正式な名前でノートを作り、日記のリンクもそのノートにつなぎ直します。</p>
        </div>
      </section>

      <section className="card stack">
        <span className="ribbon yellow">未登録の名前</span>
        {dir.status === 'loading' && (
          <p className="muted small">
            確認しています（{dir.progress.done} / {dir.progress.total}）
          </p>
        )}
        {dir.status === 'ready' && dir.unresolved.length === 0 && <p className="muted">未登録の名前はありません。</p>}
        {dir.unresolved.map((u) => (
          <button key={u.name} className="pick-row" onClick={() => setOpen(u)}>
            <span className="avatar plus">
              <Glyph name="plus" size={18} />
            </span>
            <span className="grow">
              <span className="pick-name">{u.name}</span>
              <span className="pick-sub">
                {u.count}回・最後は{shortDate(u.last)}
              </span>
            </span>
            <Glyph name="chevronRight" size={18} />
          </button>
        ))}
        <button className="btn secondary" disabled={dir.status === 'loading'} onClick={() => loadDirectory(true)}>
          <Glyph name="refresh" />
          読み込み直す
        </button>
      </section>

      {open && <CreateSheet item={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
