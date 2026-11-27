import { useMemo, useState } from 'react'
import { fromDateString } from '../lib/date'
import { KIND_LABEL } from '../vault/labels'
import { ListField, TextField } from '../ui/Fields'
import { Glyph } from '../ui/Icon'
import { reloadDirectory, type Place } from '../vault/directory'
import { updateNote } from '../vault/notes'
import { applyPlace, mapUrl, parsePlace, type PlaceNote } from '../vault/place'
import { useDirectory } from '../vault/useDirectory'
import { useNote } from '../vault/useNote'

function shortDate(s: string): string {
  const d = fromDateString(s)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

export default function PlaceEdit({ place }: { place: Place }) {
  const dir = useDirectory()
  const { found, error, reload } = useNote(place.path)
  const note = useMemo(() => (found ? parsePlace(found.text, place.name) : null), [found, place.name])
  const [edit, setEdit] = useState<{ base: PlaceNote; value: PlaceNote } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const draft = edit && edit.base === note ? edit.value : note
  const categories = useMemo(() => [...new Set(dir.places.map((p) => p.category ?? '').filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja')), [dir.places])
  const usage = dir.usage.get(place.name)

  if (!draft || !note || !found) {
    return error ? <p className="error">{error}</p> : <p className="muted center">読み込んでいます…</p>
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(note)
  const set = <K extends keyof PlaceNote>(key: K, value: PlaceNote[K]) => {
    setSaved(false)
    setEdit({ base: note, value: { ...draft, [key]: value } })
  }

  const save = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await updateNote(place.path, (t) => applyPlace(t, note, draft), found)
      setSaved(true)
      reload()
      void reloadDirectory()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const url = draft.url.trim()

  return (
    <div className="stack">
      <section className="card stack">
        <div className="stack tight">
          <span className="tag mint self-start">{KIND_LABEL[place.kind]}</span>
          <p className="profile-name">{place.name}</p>
          <p className="muted small">{usage ? `日記・イベントに${usage.count}回（最後は${shortDate(usage.last)}）` : 'まだ日記に出てきていません'}</p>
        </div>
        <div className="button-pair">
          <a className="btn soft" href={mapUrl(place.name, draft.address)} target="_blank" rel="noreferrer">
            <Glyph name="map" />
            地図で開く
          </a>
          {/^https?:\/\//.test(url) && (
            <a className="btn soft" href={url} target="_blank" rel="noreferrer">
              <Glyph name="link" />
              サイトを開く
            </a>
          )}
        </div>
      </section>

      <section className="card stack">
        <span className="ribbon">基本</span>
        <ListField label="別名（日記での表示）" values={draft.aliases} onChange={(v) => set('aliases', v)} />
        {place.kind === 'place' && <TextField label="種別" value={draft.category} suggestions={categories} placeholder="例：飲食店、カフェ" onChange={(v) => set('category', v)} />}
      </section>

      <section className="card stack">
        <span className="ribbon">住所・連絡先</span>
        <TextField label="郵便番号" value={draft.postal} placeholder="例：630-0000" onChange={(v) => set('postal', v)} />
        <TextField label="住所" value={draft.address} onChange={(v) => set('address', v)} />
        <TextField label="電話番号" type="tel" value={draft.phone} onChange={(v) => set('phone', v)} />
        <TextField label="URL" type="url" value={draft.url} placeholder="https://" onChange={(v) => set('url', v)} />
      </section>

      <section className="card stack">
        <span className="ribbon yellow">メモ</span>
        <textarea className="field lined" value={draft.memo} placeholder="おすすめ、気づいたことなど" onChange={(e) => set('memo', e.target.value)} />
      </section>

      {saveError && <p className="error">{saveError}</p>}
      <div className="save-bar">
        {saved && !dirty && (
          <p className="muted small center">
            <Glyph name="check" size={14} /> 保存しました
          </p>
        )}
        {dirty && <p className="muted small center">保存していない変更があります</p>}
        <button className="btn primary" disabled={!dirty || saving} onClick={save}>
          <Glyph name="check" />
          {saving ? '保存しています…' : '保存する'}
        </button>
      </div>
    </div>
  )
}
