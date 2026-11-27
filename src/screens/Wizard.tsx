import { useEffect, useRef, useState } from 'react'
import { applyDiary, mergeExternalEntries, parseDiary, sortEntries, type Entry } from '../diary/markdown'
import { MOODS, moodFromEmoji } from '../diary/mood'
import { groupPhotos, preparePhoto, uploadPhoto, type PendingPhoto } from '../diary/photos'
import { fetchWeather, getPosition, isWeatherEnabled, weatherAt, type WeatherData } from '../diary/weather'
import { formatYen } from '../lib/money'
import AmountSheet from '../ui/AmountSheet'
import { loadDiary, saveDiary, type LoadedDiary } from '../diary/store'
import { dateLabel, toDateString } from '../lib/date'
import { Glyph, MoodIcon, TileIcon, WeatherIcon, type TileName } from '../ui/Icon'
import PhotoViewer from '../ui/PhotoViewer'
import Picker from '../ui/Picker'
import { isKnownWeather, WEATHER_LABEL, weatherKind } from '../ui/weather'
import { linkLabel } from '../vault/refs'
import { buildUpdate, hasRealChanges, PENDING_PREFIX, previewPath } from '../wizard/update'
import { clearDraft, isTouched, loadDraft, newKey, STEPS, storeDraft, type Draft, type EditableEntry, type StepId } from '../wizard/draft'

const STEP_META: Record<StepId, { icon: TileName; title: string; hint: string }> = {
  photos: { icon: 'camera', title: '写真', hint: '今日撮った写真を選ぶと、できごとの下書きを作ります。写真がなければそのまま次へ進めます。' },
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
    step: 'photos',
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

type WeatherState = { status: 'off' | 'loading' | 'ok' | 'error'; data: WeatherData | null; message: string | null }

function isEmptyEntry(e: EditableEntry): boolean {
  return !e.raw && e.text.every((t) => !t.trim()) && e.photos.length === 0 && !(e.pendingPhotos?.length ?? 0) && !e.place && e.people.length === 0 && !e.amount && !e.time
}

function blankEntry(): EditableEntry {
  return { key: newKey(), time: null, weather: null, place: null, people: [], amount: null, text: [], photos: [], raw: null }
}

async function prepareAll(files: File[], onProgress: (done: number, total: number) => void): Promise<{ photos: PendingPhoto[]; failed: number }> {
  const photos: PendingPhoto[] = []
  let failed = 0
  for (let i = 0; i < files.length; i++) {
    onProgress(i, files.length)
    try {
      photos.push(await preparePhoto(files[i], newKey()))
    } catch {
      failed++
    }
  }
  onProgress(files.length, files.length)
  return { photos, failed }
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export default function Wizard({ date, onExit }: { date: string; onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [photoStatus, setPhotoStatus] = useState<{ done: number; total: number; failed: number } | null>(null)
  const [saveProgress, setSaveProgress] = useState<string | null>(null)
  const [weather, setWeather] = useState<WeatherState>(() => ({ status: isWeatherEnabled() ? 'loading' : 'off', data: null, message: null }))

  useEffect(() => {
    if (!isWeatherEnabled() || date > toDateString(new Date())) return
    let alive = true
    getPosition()
      .then((pos) => fetchWeather(date, pos))
      .then((data) => alive && setWeather({ status: 'ok', data, message: null }))
      .catch((e: unknown) => alive && setWeather({ status: 'error', data: null, message: errorText(e) }))
    return () => {
      alive = false
    }
  }, [date])
  const [today] = useState(() => toDateString(new Date()))
  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([loadDiary(date), loadDraft(date)])
      .then(([loaded, saved]) => {
        if (!alive) return
        if (saved && isTouched(saved) && hasRealChanges(resumeDraft(saved, loaded), loaded)) {
          setPhase({ kind: 'resume', loaded, draft: saved })
          return
        }
        if (saved) clearDraft(date)
        setDraft(freshDraft(loaded))
        setPhase({ kind: 'editing', loaded })
      })
      .catch((e: unknown) => alive && setPhase({ kind: 'error', message: errorText(e) }))
    return () => {
      alive = false
    }
  }, [date])

  useEffect(() => {
    if (!draft || phase.kind !== 'editing' || !isTouched(draft)) return
    const base = phase.loaded
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => (hasRealChanges(draft, base) ? storeDraft(draft) : clearDraft(draft.date)), 400)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [draft, phase])

  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d))
  const updateEntries = (fn: (entries: EditableEntry[]) => EditableEntry[]) => setDraft((d) => (d ? { ...d, entries: fn(d.entries), entriesTouched: true } : d))

  const loadFiles = async (files: File[]) => {
    if (files.length === 0) return null
    const result = await prepareAll(files, (done, total) => setPhotoStatus({ done, total, failed: 0 }))
    setPhotoStatus(result.failed > 0 ? { done: files.length, total: files.length, failed: result.failed } : null)
    return result.photos
  }

  const addPhotosAsEntries = async (files: File[]) => {
    const photos = await loadFiles(files)
    if (!photos || photos.length === 0) return
    const cards = groupPhotos(photos).map((group) => ({ ...blankEntry(), time: group[0].taken?.time ?? null, pendingPhotos: group }))
    updateEntries((list) => sortEntries([...list, ...cards]))
  }

  const addPhotosToEntry = async (key: string, files: File[]) => {
    const photos = await loadFiles(files)
    if (!photos || photos.length === 0) return
    updateEntries((list) =>
      list.map((x) => (x.key === key ? { ...x, time: x.time ?? photos.find((p) => p.taken)?.taken?.time ?? null, pendingPhotos: [...(x.pendingPhotos ?? []), ...photos], raw: null } : x)),
    )
  }

  const removePhoto = (key: string, id: string) =>
    updateEntries((list) =>
      list
        .map((x) => (x.key === key ? { ...x, pendingPhotos: (x.pendingPhotos ?? []).filter((p) => p.id !== id) } : x))
        .filter((x) => x.key !== key || !isEmptyEntry(x)),
    )

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
  const hasChanges = hasRealChanges(draft, loaded)
  const diaryUpdate = buildUpdate(draft, loaded, previewPath, weather.data)
  const saving = phase.kind === 'saving'

  const pendingPhotos = draft.entries.flatMap((e) => e.pendingPhotos ?? [])
  const photoBlobs = new Map(pendingPhotos.map((p) => [`${PENDING_PREFIX}${p.id}`, p.blob]))

  const save = async () => {
    setPhase({ kind: 'saving', loaded })
    setSaveError(null)
    const uploaded: Record<string, string> = { ...(draft.uploaded ?? {}) }
    try {
      for (let i = 0; i < pendingPhotos.length; i++) {
        const p = pendingPhotos[i]
        if (uploaded[p.id]) continue
        setSaveProgress(`写真を保存しています（${i + 1} / ${pendingPhotos.length}）`)
        uploaded[p.id] = await uploadPhoto(p)
        await storeDraft({ ...draft, uploaded })
      }
      setSaveProgress('日記を保存しています…')
      const result = await saveDiary(loaded, buildUpdate(draft, loaded, (p) => uploaded[p.id], weather.data))
      await clearDraft(date)
      setPhase({ kind: 'done', merged: result.merged })
    } catch (e) {
      setDraft({ ...draft, uploaded })
      await storeDraft({ ...draft, uploaded })
      setPhase({ kind: 'editing', loaded })
      setSaveError(
        e instanceof TypeError
          ? '通信できなかったため保存できませんでした。下書きはこの端末に残っています。電波の良いところで「保存する」をもう一度押してください。'
          : `保存できませんでした（${errorText(e)}）。下書きはこの端末に残っているので、もう一度お試しください。`,
      )
    } finally {
      setSaveProgress(null)
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
          <div className="progress">
            {STEPS.map((s, i) => (
              <button
                key={s}
                className={i < stepIndex ? 'done' : i === stepIndex ? 'now' : ''}
                aria-label={`${STEP_META[s].title}へ`}
                aria-current={i === stepIndex ? 'step' : undefined}
                onClick={() => !saving && update({ step: s })}
              />
            ))}
          </div>
        </div>

        <div className="panel-body">
          <p className="muted">{meta.hint}</p>

          {draft.step === 'photos' && (
            <div className="stack">
              <label className="photo-drop">
                <TileIcon name="camera" size={60} />
                <span className="photo-drop-title">写真を選ぶ</span>
                <span className="muted small">何枚でもまとめて選べます</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="visually-hidden"
                  onChange={(e) => {
                    const files = [...(e.target.files ?? [])]
                    e.target.value = ''
                    addPhotosAsEntries(files)
                  }}
                />
              </label>
              <PhotoStatus status={photoStatus} />
              {pendingPhotos.length > 0 && (
                <>
                  <div className="photo-grid">
                    {draft.entries.flatMap((e) =>
                      (e.pendingPhotos ?? []).map((p) => (
                        <div key={p.id} className="photo-cell">
                          <Thumb blob={p.blob} />
                          <span className="tag cream photo-time">{p.taken?.time ?? '時刻なし'}</span>
                          <button className="photo-remove" aria-label="この写真を外す" onClick={() => removePhoto(e.key, p.id)}>
                            <Glyph name="close" size={14} />
                          </button>
                        </div>
                      )),
                    )}
                  </div>
                  <p className="muted small">次の画面で、写真ごとにできごとを書き足せます。</p>
                </>
              )}
            </div>
          )}

          {draft.step === 'entries' && (
            <div className="stack">
              <PhotoStatus status={photoStatus} />
              {draft.entries.map((e) => (
                <EntryCard
                  key={e.key}
                  entry={e}
                  onChange={(patch) => updateEntries((list) => list.map((x) => (x.key === e.key ? { ...x, ...patch, raw: null } : x)))}
                  onDelete={() => updateEntries((list) => list.filter((x) => x.key !== e.key))}
                  onAddPhotos={(files) => addPhotosToEntry(e.key, files)}
                  onRemovePhoto={(id) => removePhoto(e.key, id)}
                  autoWeather={e.raw || e.weather ? null : weatherAt(weather.data, e.time)}
                />
              ))}
              <button className="add-button" onClick={() => updateEntries((list) => [...list, blankEntry()])}>
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
            <textarea className="field lined" rows={8} placeholder="今日をひとことで" value={draft.oneLiner} onChange={(e) => update({ oneLiner: e.target.value, oneLinerTouched: true })} />
          )}

          {draft.step === 'confirm' && (hasChanges ? <Summary text={applyDiary(loaded.text, date, diaryUpdate)} date={date} photoBlobs={photoBlobs} /> : <p>まだ何も書かれていません。前の画面に戻って書いてみましょう。</p>)}

          {draft.step === 'confirm' && hasChanges && weather.status === 'loading' && <p className="muted small">天気を取得しています…</p>}
          {draft.step === 'confirm' && hasChanges && weather.status === 'error' && <p className="muted small">天気は記録しません（{weather.message}）</p>}
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
            {saving ? (saveProgress ?? '保存しています…') : '保存する'}
          </button>
        ) : (
          <button className="btn primary" onClick={() => go(1)}>
            {(draft.step === 'mood' && !draft.mood) || (draft.step === 'photos' && pendingPhotos.length === 0) ? 'スキップ' : '次へ'}
            <Glyph name="chevronRight" />
          </button>
        )}
      </div>
    </div>
  )
}

function SavedPhotosChip({ paths }: { paths: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="tag plain tag-button" onClick={() => setOpen(true)}>
        <Glyph name="photo" size={15} />
        保存済みの写真 {paths.length}枚
        <Glyph name="chevronRight" size={14} />
      </button>
      {open && <PhotoViewer paths={paths} onClose={() => setOpen(false)} />}
    </>
  )
}

function savedPhotoCount(entry: Entry): number {
  return entry.photos.filter((p) => !p.startsWith(PENDING_PREFIX)).length
}

function EntryChips({ entry, linksEditable = false, autoWeather = null }: { entry: Entry; linksEditable?: boolean; autoWeather?: string | null }) {
  const weather = entry.weather ?? autoWeather
  const chips = [
    weather && isKnownWeather(weather) ? (
      <span key="w" className="tag plain" title={entry.weather ? undefined : '保存時に自動で記録します'}>
        <WeatherIcon emoji={weather} size={18} />
        {WEATHER_LABEL[weatherKind(weather)!]}
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
    entry.amount && !linksEditable ? (
      <span key="a" className={`tag ${entry.amount > 0 ? 'mint' : 'cream'}`}>
        <Glyph name="yen" size={15} />
        {formatYen(entry.amount)}
      </span>
    ) : null,
    savedPhotoCount(entry) > 0 ? <SavedPhotosChip key="ph" paths={entry.photos.filter((p) => !p.startsWith(PENDING_PREFIX))} /> : null,
  ].filter(Boolean)
  return chips.length > 0 ? <div className="chips">{chips}</div> : null
}

type EntryCardProps = {
  entry: EditableEntry
  onChange: (patch: Partial<Entry>) => void
  onDelete: () => void
  onAddPhotos: (files: File[]) => void
  onRemovePhoto: (id: string) => void
  autoWeather: string | null
}

function EntryCard({ entry, onChange, onDelete, onAddPhotos, onRemovePhoto, autoWeather }: EntryCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [picker, setPicker] = useState<'people' | 'place' | null>(null)
  const [amountOpen, setAmountOpen] = useState(false)

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
      {(entry.pendingPhotos?.length ?? 0) > 0 && (
        <div className="photo-strip">
          {entry.pendingPhotos!.map((p) => (
            <div key={p.id} className="photo-cell small">
              <Thumb blob={p.blob} />
              <button className="photo-remove" aria-label="この写真を外す" onClick={() => onRemovePhoto(p.id)}>
                <Glyph name="close" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <textarea className="field entry-text" rows={6} placeholder="何がありましたか？" value={entry.text.join('\n')} onChange={(e) => onChange({ text: e.target.value.split('\n') })} />
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
        {entry.amount ? (
          <span className={`tag removable ${entry.amount > 0 ? 'mint' : 'cream'}`}>
            <button className="tag-edit" onClick={() => setAmountOpen(true)}>
              <Glyph name="yen" size={15} />
              {formatYen(entry.amount)}
            </button>
            <button aria-label="金額を外す" onClick={() => onChange({ amount: null })}>
              <Glyph name="close" size={13} />
            </button>
          </span>
        ) : (
          <button className="chip-add" onClick={() => setAmountOpen(true)}>
            <Glyph name="yen" size={15} />
            金額
          </button>
        )}
        <label className="chip-add">
          <Glyph name="photo" size={15} />
          写真
          <input
            type="file"
            accept="image/*"
            multiple
            className="visually-hidden"
            onChange={(e) => {
              const files = [...(e.target.files ?? [])]
              e.target.value = ''
              onAddPhotos(files)
            }}
          />
        </label>
      </div>
      <EntryChips entry={entry} linksEditable autoWeather={autoWeather} />
      {amountOpen && (
        <AmountSheet
          amount={entry.amount}
          onClose={() => setAmountOpen(false)}
          onDone={(amount) => {
            onChange({ amount })
            setAmountOpen(false)
          }}
        />
      )}
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

const blobUrls = new WeakMap<Blob, string>()

function blobUrl(blob: Blob): string {
  const cached = blobUrls.get(blob)
  if (cached) return cached
  const url = URL.createObjectURL(blob)
  blobUrls.set(blob, url)
  return url
}

function Thumb({ blob }: { blob: Blob }) {
  return <img className="thumb" src={blobUrl(blob)} alt="" />
}

function PhotoStatus({ status }: { status: { done: number; total: number; failed: number } | null }) {
  if (!status) return null
  if (status.failed > 0) return <p className="error">読み込めなかった写真が {status.failed} 枚ありました。</p>
  return (
    <p className="muted small center">
      写真を読み込んでいます（{status.done} / {status.total}）
    </p>
  )
}

function Summary({ text, date, photoBlobs }: { text: string; date: string; photoBlobs: Map<string, Blob> }) {
  const diary = parseDiary(text, date)
  const mood = moodFromEmoji(diary.mood)
  const amounts = diary.entries.map((e) => e.amount ?? 0).filter((a) => a !== 0)
  const expense = amounts.filter((a) => a < 0).reduce((a, b) => a + b, 0)
  const income = amounts.filter((a) => a > 0).reduce((a, b) => a + b, 0)
  const dayWeather = diary.weather && isKnownWeather(diary.weather) ? diary.weather : null
  return (
    <div className="stack">
      {dayWeather && (
        <div className="summary-row">
          <span className="tag mint">天気</span>
          <div className="value row">
            <WeatherIcon emoji={dayWeather} size={24} />
            {WEATHER_LABEL[weatherKind(dayWeather)!]}
          </div>
        </div>
      )}
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
      {amounts.length > 0 && (
        <div className="summary-row">
          <span className="tag mint">お金</span>
          <div className="value stack tight">
            {expense < 0 && <span>{formatYen(expense)}</span>}
            {income > 0 && <span>{formatYen(income)}</span>}
          </div>
        </div>
      )}
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
                {e.photos.some((p) => photoBlobs.has(p)) && (
                  <div className="photo-strip">
                    {e.photos
                      .filter((p) => photoBlobs.has(p))
                      .map((p) => (
                        <div key={p} className="photo-cell small">
                          <Thumb blob={photoBlobs.get(p)!} />
                        </div>
                      ))}
                  </div>
                )}
                <EntryChips entry={e} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
