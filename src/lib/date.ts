export function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromDateString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, days: number): string {
  const d = fromDateString(s)
  d.setDate(d.getDate() + days)
  return toDateString(d)
}

export const LATE_NIGHT_UNTIL_HOUR = 4

export function defaultDiaryDate(now: Date): string {
  const today = toDateString(now)
  return now.getHours() < LATE_NIGHT_UNTIL_HOUR ? addDays(today, -1) : today
}

export function dateLabel(s: string, today: string): string {
  const base = fromDateString(s).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
  if (s === today) return `今日 ${base}`
  if (s === addDays(today, -1)) return `きのう ${base}`
  return base
}

export function streakDays(written: Set<string>, today: string): number {
  let cursor = written.has(today) ? today : addDays(today, -1)
  let n = 0
  while (written.has(cursor)) {
    n++
    cursor = addDays(cursor, -1)
  }
  return n
}
