import { useEffect, useState } from 'react'

function format(now: Date) {
  return {
    date: now.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' }),
    time: now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
  }
}

export default function StatusBar() {
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
      <span />
    </div>
  )
}
