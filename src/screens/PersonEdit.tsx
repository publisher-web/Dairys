import { useEffect, useMemo, useRef, useState } from 'react'
import { preparePhoto, uploadPhoto, type PendingPhoto } from '../diary/photos'
import { fromDateString } from '../lib/date'
import { FamilyField, LinkTextField, ListField, Segments, TextField } from '../ui/Fields'
import DeleteNote from '../ui/DeleteNote'
import { Glyph, TileIcon } from '../ui/Icon'
import { reloadDirectory, type Person } from '../vault/directory'
import { deleteNote, updateNote } from '../vault/notes'
import { applyPerson, FAMILY_LINK_KEYS, parsePerson, RELATIONS, type PersonNote } from '../vault/person'
import { useDirectory } from '../vault/useDirectory'
import { useNote, useVaultImage } from '../vault/useNote'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function shortDate(s: string): string {
  const d = fromDateString(s)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

export default function PersonEdit({ person, onDeleted }: { person: Person; onDeleted: () => void }) {
  const dir = useDirectory()
  const { found, error, reload } = useNote(person.path)
  const note = useMemo(() => (found ? parsePerson(found.text, person.name) : null), [found, person.name])
  const [edit, setEdit] = useState<{ base: PersonNote; value: PersonNote } | null>(null)
  const [pending, setPending] = useState<PendingPhoto | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const draft = edit && edit.base === note ? edit.value : note
  const pendingUrl = useMemo(() => (pending ? URL.createObjectURL(pending.blob) : null), [pending])
  useEffect(
    () => () => {
      if (pendingUrl) URL.revokeObjectURL(pendingUrl)
    },
    [pendingUrl],
  )
  const storedUrl = useVaultImage(draft?.photo ?? null)
  const photoUrl = pendingUrl ?? storedUrl
  const linkNames = useMemo(() => [...dir.places].sort((a, b) => Number(a.kind === 'place') - Number(b.kind === 'place')).map((p) => p.name), [dir.places])
  const usage = dir.usage.get(person.name)

  if (!draft || !note || !found) {
    return error ? <p className="error">{error}</p> : <p className="muted center">読み込んでいます…</p>
  }

  const dirty = pending !== null || JSON.stringify(draft) !== JSON.stringify(note)
  const set = <K extends keyof PersonNote>(key: K, value: PersonNote[K]) => {
    setSaved(false)
    setEdit({ base: note, value: { ...draft, [key]: value } })
  }

  const save = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const photo = pending ? await uploadPhoto(pending) : draft.photo
      const next = { ...draft, photo }
      await updateNote(person.path, (t) => applyPerson(t, note, next), found)
      setPending(null)
      setSaved(true)
      reload()
      void reloadDirectory()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="stack">
      <section className="card stack">
        <div className="profile-head">
          <button className="profile-photo" aria-label="写真を選ぶ" onClick={() => fileRef.current?.click()}>
            {photoUrl ? <img src={photoUrl} alt="" /> : <TileIcon name="camera" size={56} />}
          </button>
          <div className="grow stack tight">
            <p className="profile-name">{person.name}</p>
            <p className="muted small">{usage ? `日記・イベントに${usage.count}回（最後は${shortDate(usage.last)}）` : 'まだ日記に出てきていません'}</p>
            <div className="chips">
              <button className="chip-add" onClick={() => fileRef.current?.click()}>
                <Glyph name="photo" size={14} />
                {draft.photo || pending ? '写真を変える' : '写真を選ぶ'}
              </button>
              {(draft.photo || pending) && (
                <button
                  className="chip-add"
                  onClick={() => {
                    setPending(null)
                    set('photo', null)
                  }}
                >
                  <Glyph name="close" size={14} />
                  外す
                </button>
              )}
            </div>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            try {
              setPending(await preparePhoto(file, 'profile'))
              setSaved(false)
            } catch (err) {
              setSaveError(err instanceof Error ? err.message : String(err))
            }
          }}
        />
      </section>

      <section className="card stack">
        <span className="ribbon">基本</span>
        <TextField label="読み" value={draft.reading} placeholder="ひらがなで" onChange={(v) => set('reading', v)} />
        <ListField label="呼び名（日記での表示）" values={draft.aliases} placeholder="例：たろちゃん" onChange={(v) => set('aliases', v)} />
        <Segments label="間柄" options={RELATIONS} value={draft.relation} onChange={(v) => set('relation', v)} />
        <TextField label="誕生日" type={!draft.birthDate || ISO_DATE.test(draft.birthDate) ? 'date' : 'text'} value={draft.birthDate} clearable onChange={(v) => set('birthDate', v)} />
      </section>

      <section className="card stack">
        <span className="ribbon">つながり</span>
        <LinkTextField label="出会ったきっかけ" value={draft.metHow} names={linkNames} onChange={(v) => set('metHow', v)} />
        <LinkTextField label="学校" value={draft.school} names={linkNames} onChange={(v) => set('school', v)} />
        <LinkTextField label="会社" value={draft.company} names={linkNames} onChange={(v) => set('company', v)} />
        <TextField label="役割" value={draft.position} placeholder="例：プランナー、部長" onChange={(v) => set('position', v)} />
      </section>

      <section className="card stack">
        <span className="ribbon">好きなもの・苦手なもの</span>
        <ListField label="好きなもの" values={draft.likes} onChange={(v) => set('likes', v)} />
        <ListField label="苦手なもの" values={draft.dislikes} onChange={(v) => set('dislikes', v)} />
      </section>

      <section className="card stack">
        <span className="ribbon">家族・人間関係</span>
        {FAMILY_LINK_KEYS.map((key) => (
          <FamilyField key={key} label={key} value={draft.family[key]} onChange={(v) => set('family', { ...draft.family, [key]: v })} />
        ))}
        <TextField label="結婚記念日" value={draft.family.結婚記念日} clearable onChange={(v) => set('family', { ...draft.family, 結婚記念日: v })} />
      </section>

      <section className="card stack">
        <span className="ribbon yellow">メモ</span>
        <textarea className="field lined" value={draft.memo} placeholder="どんな人か、話したことなど" onChange={(e) => set('memo', e.target.value)} />
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
      <DeleteNote
        kindLabel="人物"
        name={person.name}
        usageCount={usage?.count ?? 0}
        onDelete={async () => {
          await deleteNote(person.path, found.rev)
          await reloadDirectory()
          onDeleted()
        }}
      />
    </div>
  )
}
