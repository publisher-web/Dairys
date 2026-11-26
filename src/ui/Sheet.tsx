import { useEffect, useState, type ReactNode } from 'react'

type Viewport = { top: number; height: number }

function readViewport(): Viewport {
  const v = window.visualViewport
  return v ? { top: v.offsetTop, height: v.height } : { top: 0, height: window.innerHeight }
}

function useVisualViewport(): Viewport {
  const [vp, setVp] = useState(readViewport)
  useEffect(() => {
    const v = window.visualViewport
    if (!v) return
    const update = () => setVp(readViewport())
    v.addEventListener('resize', update)
    v.addEventListener('scroll', update)
    return () => {
      v.removeEventListener('resize', update)
      v.removeEventListener('scroll', update)
    }
  }, [])
  return vp
}

type Props = {
  label: string
  onClose: () => void
  className?: string
  children: ReactNode
}

export default function Sheet({ label, onClose, className, children }: Props) {
  const vp = useVisualViewport()

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div className="sheet-backdrop" style={{ top: vp.top, height: vp.height }} onClick={onClose}>
      <div className={`sheet ${className ?? ''}`} style={{ maxHeight: Math.round(vp.height * 0.88) }} role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
