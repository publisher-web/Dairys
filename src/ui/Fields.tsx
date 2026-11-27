import { useId, useState, type ReactNode } from 'react'
import type { LinkRef } from '../diary/markdown'
import { Glyph } from './Icon'
import Picker from './Picker'

export function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="form-row">
      <span className="form-label">{label}</span>
      {children}
    </label>
  )
}

export function TextField({ label, value, onChange, type = 'text', placeholder, suggestions }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; suggestions?: string[] }) {
  const listId = useId()
  return (
    <FieldRow label={label}>
      <input className="field" type={type} value={value} placeholder={placeholder} list={suggestions ? listId : undefined} onChange={(e) => onChange(e.target.value)} />
      {suggestions && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </FieldRow>
  )
}

const LINK_ONLY_RE = /^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]$/

function unlink(raw: string): string {
  const m = LINK_ONLY_RE.exec(raw.trim())
  return m ? m[1].trim() : raw
}

export function LinkTextField({ label, value, onChange, names, placeholder }: { label: string; value: string; onChange: (v: string) => void; names: string[]; placeholder?: string }) {
  const known = new Set(names)
  const isLink = LINK_ONLY_RE.test(value.trim())
  return (
    <div className="stack tight">
      <TextField
        label={label}
        value={unlink(value)}
        placeholder={placeholder}
        suggestions={names}
        onChange={(text) => onChange(known.has(text.trim()) ? `[[${text.trim()}]]` : text)}
      />
      {isLink && <span className="form-note">ノートにリンクします</span>}
    </div>
  )
}

export function ListField({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setDraft('')
  }
  return (
    <div className="form-row">
      <span className="form-label">{label}</span>
      {values.length > 0 && (
        <div className="chips">
          {values.map((v) => (
            <span key={v} className="tag mint removable">
              {v}
              <button type="button" aria-label={`${v}を外す`} onClick={() => onChange(values.filter((x) => x !== v))}>
                <Glyph name="close" size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="inline-add">
        <input
          className="field"
          type="text"
          value={draft}
          placeholder={placeholder ?? '入力して追加'}
          enterKeyHint="done"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              add()
            }
          }}
          onBlur={add}
        />
      </div>
    </div>
  )
}

export function Segments({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="form-row">
      <span className="form-label">{label}</span>
      <div className="chips" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={value === o} className={`tag tag-button ${value === o ? 'mint' : 'plain'}`} onClick={() => onChange(value === o ? '' : o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

type Token = { link: LinkRef | null; text: string }

function splitTokens(raw: string): Token[] {
  return raw
    .split(/\s*[,、]\s*/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((text) => {
      const m = LINK_ONLY_RE.exec(text)
      return { link: m ? { target: m[1].trim(), alias: m[2]?.trim() || null } : null, text }
    })
}

function joinTokens(tokens: Token[]): string {
  return tokens.map((t) => (t.link ? `[[${t.link.target}${t.link.alias ? `|${t.link.alias}` : ''}]]` : t.text)).join(', ')
}

export function FamilyField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [picking, setPicking] = useState(false)
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const tokens = splitTokens(value)
  const addText = () => {
    const v = draft.trim().replace(/[,、]/g, ' ')
    if (v) onChange(joinTokens([...tokens, { link: null, text: v }]))
    setDraft('')
    setTyping(false)
  }
  return (
    <div className="form-row">
      <span className="form-label">{label}</span>
      <div className="chips">
        {tokens.map((t, i) => (
          <span key={`${t.text}-${i}`} className={`tag removable ${t.link ? 'mint' : 'cream'}`}>
            {t.link ? (t.link.alias ?? t.link.target) : t.text}
            <button type="button" aria-label={`${t.text}を外す`} onClick={() => onChange(joinTokens(tokens.filter((_, j) => j !== i)))}>
              <Glyph name="close" size={13} />
            </button>
          </span>
        ))}
        <button type="button" className="chip-add" onClick={() => setPicking(true)}>
          <Glyph name="plus" size={14} />
          人物から選ぶ
        </button>
        {!typing && (
          <button type="button" className="chip-add" onClick={() => setTyping(true)}>
            <Glyph name="pencil" size={14} />
            文字で追加
          </button>
        )}
      </div>
      {typing && (
      <div className="inline-add">
        <input
          className="field"
          type="text"
          value={draft}
          placeholder="例：犬(ポチ)"
          autoFocus
          enterKeyHint="done"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              addText()
            }
          }}
          onBlur={addText}
        />
      </div>
      )}
      {picking && (
        <Picker
          mode="people"
          title={label}
          selected={tokens.flatMap((t) => (t.link ? [t.link] : []))}
          onClose={() => setPicking(false)}
          onDone={(refs) => {
            const texts = tokens.filter((t) => !t.link)
            onChange(joinTokens([...refs.map((r) => ({ link: { target: r.target, alias: null }, text: r.target })), ...texts]))
            setPicking(false)
          }}
        />
      )}
    </div>
  )
}
