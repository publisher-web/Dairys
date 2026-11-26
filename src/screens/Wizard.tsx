import { useEffect, useRef, useState } from 'react'
import { applyDiary, formatAmount, mergeExternalEntries, sortEntries, type DiaryUpdate, type Entry } from '../diary/markdown'
import { loadDiary, saveDiary, type LoadedDiary } from '../diary/store'
import { dateLabel, toDateString } from '../lib/date'
import { clearDraft, loadDraft, newKey, STEPS, storeDraft, type Draft, type EditableEntry, type StepId } from '../wizard/draft'

const MOODS = ['😆', '😃', '🙂', '😐', '🙁']

const STEP_META: Record<StepId, { emoji: string; title: string; hint: string }> = {
  entries: { emoji: '🕒', title: 'できごと', hint: '今日あったことを、ひとつずつ。なくても大丈夫' },
  mood: { emoji: '🌈', title: 'きぶん', hint: '今日はどんな日だった？' },
  oneLiner: { emoji: '📝', title: '今日の一言', hint: '1日をひとことで。音声入力でもOK' },
  confirm: { emoji: '📔', title: 'かくにん', hint: 'Obsidian ではこう見えるよ' },
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
        if (saved && (saved.moodTouched || saved.oneLinerTouched || saved.entriesTouched)) setPhase({ kind: 'resume', loaded, draft: saved })
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
    if (!draft || phase.kind !== 'editing') return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => storeDraft(draft), 400)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [draft, phase.kind])

  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d))
  const updateEntries = (fn: (entries: EditableEntry[]) => EditableEntry[]) => setDraft((d) => (d ? { ...d, entries: fn(d.entries), entriesTouched: true } : d))

  if (phase.kind === 'loading') return <Centered emoji="🍃" text="日記をひらいています…" />
  if (phase.kind === 'error')
    return (
      <section className="card stack">
        <p className="error">{phase.message}</p>
        <button className="btn ghost" onClick={onExit}>
          ホームへ
        </button>
      </section>
    )
  if (phase.kind === 'resume')
    return (
      <section className="card stack">
        <h2>✏️ 書きかけがあるよ</h2>
        <p className="muted">{new Date(phase.draft.savedAt).toLocaleString('ja-JP')} の下書き</p>
        <button
          className="btn"
          onClick={() => {
            setDraft(resumeDraft(phase.draft, phase.loaded))
            setPhase({ kind: 'editing', loaded: phase.loaded })
          }}
        >
          つづきから
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            clearDraft(date)
            setDraft(freshDraft(phase.loaded))
            setPhase({ kind: 'editing', loaded: phase.loaded })
          }}
        >
          さいしょから
        </button>
      </section>
    )
  if (phase.kind === 'done')
    return (
      <section className="card hero stack">
        <span className="hero-emoji" aria-hidden="true">
          🎉
        </span>
        <p className="hero-title">かけたね！</p>
        <p className="muted">Obsidian で同期すると見られるよ</p>
        {phase.merged > 0 && <p className="muted">Obsidian で増えていたできごと {phase.merged} 件も、いっしょに残したよ</p>}
        <button className="btn" onClick={onExit}>
          ホームへ
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
      setSaveError(`保存できなかったよ：${errorText(e)}。下書きは残してあるので、もう一度ためしてね`)
    }
  }

  return (
    <div className="stack">
      <div className="wizard-head">
        <p className="muted">{dateLabel(date, today)}</p>
        <div className="dots" aria-label={`${stepIndex + 1} / ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <span key={s} className={i < stepIndex ? 'dot past' : i === stepIndex ? 'dot now' : 'dot'} />
          ))}
        </div>
      </div>

      <section className="card stack">
        <h2>
          {meta.emoji} {meta.title}
        </h2>
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
              className="btn ghost"
              onClick={() => updateEntries((list) => [...list, { key: newKey(), time: null, weather: null, place: null, people: [], amount: null, text: [], photos: [], raw: null }])}
            >
              ＋ できごとを追加
            </button>
          </div>
        )}

        {draft.step === 'mood' && (
          <div className="mood-grid">
            {MOODS.map((m) => (
              <button
                key={m}
                className={`mood ${draft.mood === m ? 'on' : ''}`}
                aria-pressed={draft.mood === m}
                onClick={() => {
                  update({ mood: m, moodTouched: true })
                  window.setTimeout(() => setDraft((d) => (d && d.step === 'mood' ? { ...d, step: 'oneLiner' } : d)), 280)
                }}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {draft.step === 'oneLiner' && (
          <textarea className="field" rows={5} placeholder="今日をひとことで…" value={draft.oneLiner} onChange={(e) => update({ oneLiner: e.target.value, oneLinerTouched: true })} />
        )}

        {draft.step === 'confirm' && (
          <div className="stack">
            {hasChanges ? <pre className="preview">{applyDiary(loaded.text, date, diaryUpdate)}</pre> : <p>まだなにも書いてないよ。もどって書いてみよう</p>}
            {saveError && <p className="error">{saveError}</p>}
          </div>
        )}
      </section>

      <div className="nav-row">
        <button className="btn ghost" onClick={() => go(-1)} disabled={phase.kind === 'saving'}>
          {stepIndex === 0 ? 'やめる' : 'もどる'}
        </button>
        {draft.step === 'confirm' ? (
          <button className="btn" onClick={save} disabled={!hasChanges || phase.kind === 'saving'}>
            {phase.kind === 'saving' ? 'ほぞん中…' : '💾 ほぞん'}
          </button>
        ) : (
          <button className="btn" onClick={() => go(1)}>
            {draft.step === 'mood' && !draft.mood ? 'スキップ' : 'つぎへ'}
          </button>
        )}
      </div>
    </div>
  )
}

function EntryCard({ entry, onChange, onDelete }: { entry: EditableEntry; onChange: (patch: Partial<Entry>) => void; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const chips = [
    entry.weather,
    entry.place ? `📍${entry.place.alias ?? entry.place.target}` : null,
    ...entry.people.map((p) => `👥${p.alias ?? p.target}`),
    entry.amount ? `💴${formatAmount(entry.amount)}` : null,
    entry.photos.length > 0 ? `📷×${entry.photos.length}` : null,
  ].filter((c): c is string => !!c)

  return (
    <div className="entry-card">
      <div className="row between">
        <label className="time-field">
          🕒
          <input type="time" value={entry.time ?? ''} onChange={(e) => onChange({ time: e.target.value || null })} />
        </label>
        {confirmDelete ? (
          <span className="row">
            <button className="mini danger" onClick={onDelete}>
              けす
            </button>
            <button className="mini" onClick={() => setConfirmDelete(false)}>
              やめる
            </button>
          </span>
        ) : (
          <button className="mini" aria-label="けす" onClick={() => setConfirmDelete(true)}>
            🗑️
          </button>
        )}
      </div>
      <textarea className="field" rows={2} placeholder="なにがあった？" value={entry.text.join('\n')} onChange={(e) => onChange({ text: e.target.value.split('\n') })} />
      {chips.length > 0 && (
        <div className="chips">
          {chips.map((c, i) => (
            <span key={i} className="chip">
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function Centered({ emoji, text }: { emoji: string; text: string }) {
  return (
    <section className="card hero">
      <span className="hero-emoji" aria-hidden="true">
        {emoji}
      </span>
      <p className="muted">{text}</p>
    </section>
  )
}
