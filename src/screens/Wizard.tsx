import { useEffect, useRef, useState } from 'react'
import { applyDiary, formatAmount, mergeExternalEntries, parseDiary, sortEntries, type DiaryUpdate, type Entry } from '../diary/markdown'
import { MOODS, moodFromEmoji } from '../diary/mood'
import { loadDiary, saveDiary, type LoadedDiary } from '../diary/store'
import { dateLabel, toDateString } from '../lib/date'
import { Glyph, MoodIcon, TileIcon, WeatherIcon, type TileName } from '../ui/Icon'
import Picker from '../ui/Picker'
import { isKnownWeather } from '../ui/weather'
import { linkLabel } from '../vault/refs'
import { clearDraft, isTouched, loadDraft, newKey, STEPS, storeDraft, type Draft, type EditableEntry, type StepId } from '../wizard/draft'

const STEP_META: Record<StepId, { icon: TileName; title: string; hint: string }> = {
  entries: { icon: 'clock', title: 'できごと', hint: '今日あったことを1つずつ書きましょう。なければそのまま次へ進めます。' },
  mood: { icon: 'smile', title: '気分', hint: '今日はどんな1日でしたか？' },
  oneLiner: { icon: 'bubble', title: '今日の一言', hint: '1日をひとことで。音声入力も使えます。' },
  confirm: { icon: 'clipboard', title: '確認', hint: 'この内容で保存します。' },
}

type Phase = { kind: 'loading' } | { kind: 'resume'; loaded: LoadedDiary; draft: Draft } | { kind: 'editing'; loaded: LoadedDiary } | { kind: 'saving'; loaded: LoadedDiary } | { kind: 'done'; merged: number } | { kind: 'error'; message: string }

function toEditable(entries: Entry[]): EditableEntry[] {
  return entries.map((e) => ({ ...e, key: newKey() }))
}

function freshDraft(loaded: LoadedDiary): Draft {
  return {
    date: loaded.date,
    baseRev: loaded.rev,
    step: 'entries',
    mood: loaded.diary.mood,
    oneLiner: loaded.diary.oneLiner,
    entries: toEditable(loaded.diary.entries),
    baseEntries: loaded.diary.entries,
    moodTouched: false,
    oneLinerTouched: false,
    entriesTouched: false,
    savedAt: Date.now(),
  }
}

function resumeDraft(saved: Draft, loaded: LoadedDiary): Draft {
  if (saved.baseRev === loaded.rev || !saved.entriesTouched) return { ...saved, baseRev: loaded.rev, baseEntries: loaded.diary.entries }
  const merged = mergeExternalEntries(saved.baseEntries ?? [], loaded.diary.entries, saved.entries)
  const added = merged.slice(saved.entries.length).map((e) => ({ ...e, key: newKey() }))
  return { ...saved, entries: [...saved.entries, ...added], baseRev: loaded.rev, baseEntries: loaded.diary.entries }
}

function buildUpdate(draft: Draft, loaded: LoadedDiary): DiaryUpdate {
  const update: DiaryUpdate = {}
  if (draft.moodTouched && draft.mood !== loaded.diary.mood) update.mood = draft.mood
  if (draft.oneLinerTouched && draft.oneLiner.trim() !== loaded.diary.oneLiner.trim()) update.oneLiner = draft.oneLiner
  if (draft.entriesTouched) update.entries = sortEntries(draft.entries.map(({ key: _key, ...e }) => (void _key, e)))
  return update
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export default function Wizard({ date, onExit }: { date: string; onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [today] = useState(() => toDateString(new Date()))
  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([loadDiary(date), loadDraft(date)])
      .then(([loaded, saved]) => {
        if (!alive) return
        if (isTouched(saved)) setPhase({ kind: 'resume', loaded, draft: saved! })
        else {
          setDraft(freshDraft(loaded))
          setPhase({ kind: 'editing', loaded })
        }
      })
      .catch((e: unknown) => alive && setPhase({ kind: 'error', message: errorText(e) }))
    return () => {
      alive = false
    }
  }, [date])

  useEffect(() => {
    if (!draft || phase.kind !== 'editing' || !isTouched(draft)) return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => storeDraft(draft), 400)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [draft, phase.kind])

  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d))
  const updateEntries = (fn: (entries: EditableEntry[]) => EditableEntry[]) => setDraft((d) => (d ? { ...d, entries: fn(d.entries), entriesTouched: true } : d))

  if (phase.kind === 'loading')
    return (
      <div className="hero">
        <TileIcon name="leaf" size={64} className="float" />
        <p className="muted">日記を読み込んでいます…</p>
      </div>
    )

  if (phase.kind === 'error')
    return (
      <section className="card stack">
        <span className="ribbon yellow">読み込めませんでした</span>
        <p className="error">{phase.message}</p>
        <button className="btn secondary" onClick={onExit}>
          ホームに戻る
        </button>
      </section>
    )

  if (phase.kind === 'resume')
    return (
      <section className="card stack">
        <div className="hero">
          <TileIcon name="quill" size={64} />
          <p className="hero-title">書きかけの下書きがあります</p>
          <p className="muted small">{new Date(phase.draft.savedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} に保存</p>
        </div>
        <button
          className="btn primary"
          onClick={() => {
            setDraft(resumeDraft(phase.draft, phase.loaded))
            setPhase({ kind: 'editing', loaded: phase.loaded })
          }}
        >
          続きから書く
        </button>
        <button
          className="btn secondary"
          onClick={() => {
            clearDraft(date)
            setDraft(freshDraft(phase.loaded))
            setPhase({ kind: 'editing', loaded: phase.loaded })
          }}
        >
          最初から書く
        </button>
      </section>
    )

  if (phase.kind === 'done')
    return (
      <section className="card stack">
        <div className="hero">
          <TileIcon name="stamp" size={88} className="float" />
          <p className="hero-title">保存しました</p>
          <p className="muted">Obsidian で同期すると反映されます。</p>
          {phase.merged > 0 && <p className="muted small">Obsidian 側で追加されていたできごと {phase.merged} 件も残してあります。</p>}
        </div>
        <button className="btn primary" onClick={onExit}>
          ホームに戻る
        </button>
      </section>
    )

  if (!draft) return null

  const loaded = phase.loaded
  const stepIndex = STEPS.indexOf(draft.step)
  const meta = STEP_META[draft.step]
  const go = (delta: number) => {
    const next = STEPS[stepIndex + delta]
    if (next) update({ step: next })
    else if (delta < 0) onExit()
  }
  const diaryUpdate = buildUpdate(draft, loaded)
  const hasChanges = Object.keys(diaryUpdate).length > 0
  const saving = phase.kind === 'saving'

  const save = async () => {
    setPhase({ kind: 'saving', loaded })
    setSaveError(null)
    try {
      const result = await saveDiary(loaded, diaryUpdate)
      await clearDraft(date)
      setPhase({ kind: 'done', merged: result.merged })
    } catch (e) {
      await storeDraft(draft)
      setPhase({ kind: 'editing', loaded })
      setSaveError(`保存できませんでした（${errorText(e)}）。下書きは残っているので、もう一度お試しください。`)
    }
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="band">
          <div className="band-title">
            <TileIcon name={meta.icon} size={40} />
            <div className="grow">
              <p className="name">{meta.title}</p>
              <p className="small">
                {dateLabel(date, today)}・{stepIndex + 1} / {STEPS.length}
              </p>
            </div>
          </div>
          <div className="progress" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s} className={i < stepIndex ? 'done' : i === stepIndex ? 'now' : ''} />
            ))}
          </div>
        </div>

        <div className="panel-body">
          <p className="muted">{meta.hint}</p>

          {draft.step === 'entries' && (
            <div className="stack">
              {draft.entries.map((e) => (
                <EntryCard
                  key={e.key}
                  entry={e}
                  onChange={(patch) => updateEntries((list) => list.map((x) => (x.key === e.key ? { ...x, ...patch, raw: null } : x)))}
                  onDelete={() => updateEntries((list) => list.filter((x) => x.key !== e.key))}
                />
              ))}
              <button
                className="add-button"
                onClick={() => updateEntries((list) => [...list, { key: newKey(), time: null, weather: null, place: null, people: [], amount: null, text: [], photos: [], raw: null }])}
              >
                <Glyph name="plus" />
                できごとを追加
              </button>
            </div>
          )}

          {draft.step === 'mood' && (
            <div className="mood-grid">
              {MOODS.map((m) => {
                const on = moodFromEmoji(draft.mood)?.id === m.id
                return (
                  <button
                    key={m.id}
                    className={`mood ${on ? 'on' : ''}`}
                    aria-pressed={on}
                    onClick={() => {
                      update({ mood: m.emoji, moodTouched: true })
                      window.setTimeout(() => setDraft((d) => (d && d.step === 'mood' ? { ...d, step: 'oneLiner' } : d)), 320)
                    }}
                  >
                    <MoodIcon id={m.id} />
                    {m.label}
                  </button>
                )
              })}
            </div>
          )}

          {draft.step === 'oneLiner' && (
            <textarea className="field lined" rows={5} placeholder="今日をひとことで" value={draft.oneLiner} onChange={(e) => update({ oneLiner: e.target.value, oneLinerTouched: true })} />
          )}

          {draft.step === 'confirm' && (hasChanges ? <Summary text={applyDiary(loaded.text, date, diaryUpdate)} date={date} /> : <p>まだ何も書かれていません。前の画面に戻って書いてみましょう。</p>)}

          {draft.step === 'confirm' && saveError && <p className="error">{saveError}</p>}
        </div>
      </div>

      <div className="nav-row">
        <button className="btn secondary" onClick={() => go(-1)} disabled={saving}>
          {stepIndex === 0 ? '閉じる' : '戻る'}
        </button>
        {draft.step === 'confirm' ? (
          <button className="btn primary" onClick={save} disabled={!hasChanges || saving}>
            <Glyph name="check" />
            {saving ? '保存しています…' : '保存する'}
          </button>
        ) : (
          <button className="btn primary" onClick={() => go(1)}>
            {draft.step === 'mood' && !draft.mood ? 'スキップ' : '次へ'}
            <Glyph name="chevronRight" />
          </button>
        )}
      </div>
    </div>
  )
}

function EntryChips({ entry, linksEditable = false }: { entry: Entry; linksEditable?: boolean }) {
  const chips = [
    entry.weather && isKnownWeather(entry.weather) ? (
      <span key="w" className="tag plain">
        <WeatherIcon emoji={entry.weather} size={18} />
      </span>
    ) : null,
    entry.place && !linksEditable ? (
      <span key="p" className="tag plain">
        <Glyph name="pin" size={15} />
        {entry.place.alias ?? entry.place.target}
      </span>
    ) : null,
    ...(linksEditable ? [] : entry.people).map((p, i) => (
      <span key={`h${i}`} className="tag plain">
        <Glyph name="people" size={15} />
        {p.alias ?? p.target}
      </span>
    )),
    entry.amount ? (
      <span key="a" className="tag plain">
        <Glyph name="yen" size={15} />
        {formatAmount(entry.amount)}
      </span>
    ) : null,
    entry.photos.length > 0 ? (
      <span key="ph" className="tag plain">
        <Glyph name="photo" size={15} />
        {entry.photos.length}枚
      </span>
    ) : null,
  ].filter(Boolean)
  return chips.length > 0 ? <div className="chips">{chips}</div> : null
}

function EntryCard({ entry, onChange, onDelete }: { entry: EditableEntry; onChange: (patch: Partial<Entry>) => void; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [picker, setPicker] = useState<'people' | 'place' | null>(null)

  return (
    <div className="entry-card">
      <div className="row between">
        <label className="time-chip">
          <Glyph name="clock" size={16} />
          <input type="time" aria-label="時刻" value={entry.time ?? ''} onChange={(e) => onChange({ time: e.target.value || null })} />
        </label>
        {confirmDelete ? (
          <span className="confirm-delete">
            <button className="mini danger" onClick={onDelete}>
              削除
            </button>
            <button className="mini" onClick={() => setConfirmDelete(false)}>
              やめる
            </button>
          </span>
        ) : (
          <button className="icon-btn" aria-label="このできごとを削除" onClick={() => setConfirmDelete(true)}>
            <Glyph name="trash" />
          </button>
        )}
      </div>
      <textarea className="field" rows={2} placeholder="何がありましたか？" value={entry.text.join('\n')} onChange={(e) => onChange({ text: e.target.value.split('\n') })} />
      <div className="entry-links">
        {entry.place ? (
          <span className="tag mint removable">
            <Glyph name="pin" size={15} />
            {linkLabel(entry.place)}
            <button aria-label="場所を外す" onClick={() => onChange({ place: null })}>
              <Glyph name="close" size={13} />
            </button>
          </span>
        ) : (
          <button className="chip-add" onClick={() => setPicker('place')}>
            <Glyph name="pin" size={15} />
            場所
          </button>
        )}
        {entry.people.map((p) => (
          <span key={p.target} className="tag mint removable">
            <Glyph name="people" size={15} />
            {linkLabel(p)}
            <button aria-label={`${linkLabel(p)}を外す`} onClick={() => onChange({ people: entry.people.filter((x) => x.target !== p.target) })}>
              <Glyph name="close" size={13} />
            </button>
          </span>
        ))}
        <button className="chip-add" onClick={() => setPicker('people')}>
          <Glyph name="people" size={15} />
          {entry.people.length > 0 ? '人を追加' : '一緒にいた人'}
        </button>
      </div>
      <EntryChips entry={entry} linksEditable />
      {picker && (
        <Picker
          mode={picker}
          selected={picker === 'people' ? entry.people : entry.place ? [entry.place] : []}
          onClose={() => setPicker(null)}
          onDone={(refs) => {
            if (picker === 'people') onChange({ people: refs })
            else onChange({ place: refs[0] ?? null })
            setPicker(null)
          }}
        />
      )}
    </div>
  )
}

function Summary({ text, date }: { text: string; date: string }) {
  const diary = parseDiary(text, date)
  const mood = moodFromEmoji(diary.mood)
  return (
    <div className="stack">
      <div className="summary-row">
        <span className="tag mint">気分</span>
        <div className="value row">
          {mood ? (
            <>
              <MoodIcon id={mood.id} size={30} />
              {mood.label}
            </>
          ) : (
            <span className="muted">未選択</span>
          )}
        </div>
      </div>
      <div className="summary-row">
        <span className="tag mint">今日の一言</span>
        <p className="value">{diary.oneLiner || <span className="muted">なし</span>}</p>
      </div>
      <div className="divider" />
      <span className="ribbon yellow">できごと</span>
      {diary.entries.length === 0 ? (
        <p className="muted">なし</p>
      ) : (
        <div className="timeline">
          {diary.entries.map((e, i) => (
            <div key={i} className="timeline-item">
              <span className="tag cream">{e.time ?? '－'}</span>
              <div className="stack tight">
                {e.text.length > 0 && <p className="value">{e.text.join('\n')}</p>}
                <EntryChips entry={e} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
