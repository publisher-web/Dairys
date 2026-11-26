import { useEffect, useState } from 'react'
import { Glyph } from './Icon'

function format(now: Date) {
  return {
    date: now.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' }),
    time: now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
  }
}

export default function StatusBar({ connected }: { connected: boolean | null }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000)
    return () => window.clearInterval(id)
  }, [])

  const { date, time } = format(now)
  return (
    <div className="statusbar">
      <span>{date}</span>
      <span className="time">{time}</span>
      <span className={`right ${connected ? 'ok' : ''}`} title={connected ? '保管庫に接続中' : '未接続'}>
        <Glyph name="leaf" size={16} />
      </span>
    </div>
  )
}
