import { useEffect, useState } from 'react'
import { Glyph, TileIcon } from './Icon'

type Props = {
  amount: number | null
  onDone: (amount: number | null) => void
  onClose: () => void
}

export default function AmountSheet({ amount, onDone, onClose }: Props) {
  const [income, setIncome] = useState(amount !== null && amount > 0)
  const [value, setValue] = useState(amount ? String(Math.abs(amount)) : '')

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const digits = value.replace(/[^\d]/g, '')
  const number = digits ? Number(digits) : 0
  const submit = () => onDone(number > 0 ? (income ? number : -number) : null)

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet amount-sheet" role="dialog" aria-modal="true" aria-label="金額" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <TileIcon name="coin" size={36} />
          <p className="sheet-title grow">金額</p>
          <button className="round-button" aria-label="閉じる" onClick={onClose}>
            <Glyph name="close" />
          </button>
        </div>

        <div className="toggle" role="radiogroup" aria-label="支出か収入か">
          <button role="radio" aria-checked={!income} className={!income ? 'on expense' : ''} onPointerDown={(e) => e.preventDefault()} onClick={() => setIncome(false)}>
            支出
          </button>
          <button role="radio" aria-checked={income} className={income ? 'on income' : ''} onPointerDown={(e) => e.preventDefault()} onClick={() => setIncome(true)}>
            収入
          </button>
        </div>

        <label className={`amount-field ${income ? 'income' : 'expense'}`}>
          <span className="yen">¥</span>
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="0"
            aria-label="金額（円）"
            value={digits ? Number(digits).toLocaleString('ja-JP') : ''}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
          />
        </label>

        <div className="row">
          {amount !== null && (
            <button className="btn danger" onClick={() => onDone(null)}>
              <Glyph name="trash" />
              消す
            </button>
          )}
          <button className="btn primary" onClick={submit}>
            <Glyph name="check" />
            決定
          </button>
        </div>
      </div>
    </div>
  )
}
