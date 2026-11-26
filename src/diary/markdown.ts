export type LinkRef = { target: string; alias: string | null }

export type Entry = {
  time: string | null
  weather: string | null
  place: LinkRef | null
  people: LinkRef[]
  amount: number | null
  text: string[]
  photos: string[]
  raw: string[] | null
}

export type Section = { heading: string; lines: string[] }

export type DiaryParts = {
  eol: '\n' | '\r\n'
  frontmatter: string[] | null
  preamble: string[]
  sections: Section[]
}

export type Diary = {
  date: string
  mood: string | null
  weather: string | null
  oneLiner: string
  entries: Entry[]
}

export type DiaryUpdate = {
  mood?: string | null
  weather?: string | null
  oneLiner?: string
  entries?: Entry[]
}

export const ONE_LINER_HEADING = '## 📝 今日の一言'
export const EVENTS_HEADING = '## 🕒 できごと'

const ONE_LINER_RE = /^##\s.*今日の一言/
const EVENTS_RE = /^##\s.*できごと/
const BULLET_RE = /^[-*+](\s|$)/
const PHOTO_RE = /^!\[\[([^\]|]+)(\|[^\]]*)?\]\]$/
const LINK_RE = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/

export const WEATHER_EMOJIS = ['☀️', '🌤️', '⛅️', '⛅', '🌥️', '☁️', '🌫️', '🌦️', '🌧️', '☔️', '☔', '❄️', '🌨️', '⛈️', '🌩️']

export function parseDocument(text: string): DiaryParts {
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text.split(/\r?\n/)
  let frontmatter: string[] | null = null
  let rest = lines
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1)
    if (end > 0) {
      frontmatter = lines.slice(1, end)
      rest = lines.slice(end + 1)
    }
  }
  const preamble: string[] = []
  const sections: Section[] = []
  for (const line of rest) {
    if (/^##\s/.test(line)) sections.push({ heading: line, lines: [] })
    else if (sections.length > 0) sections[sections.length - 1].lines.push(line)
    else preamble.push(line)
  }
  return { eol, frontmatter, preamble, sections }
}

export function serializeDocument(parts: DiaryParts): string {
  const out: string[] = []
  if (parts.frontmatter) out.push('---', ...parts.frontmatter, '---')
  out.push(...parts.preamble)
  for (const s of parts.sections) out.push(s.heading, ...s.lines)
  return out.join(parts.eol)
}

function unquote(value: string): string {
  const v = value.trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1)
  return v
}

function keyIndex(fm: string[], key: string): number {
  return fm.findIndex((l) => l.startsWith(`${key}:`))
}

export function getFrontmatter(parts: DiaryParts, key: string): string | null {
  if (!parts.frontmatter) return null
  const i = keyIndex(parts.frontmatter, key)
  if (i < 0) return null
  const value = unquote(parts.frontmatter[i].slice(key.length + 1))
  return value.length > 0 ? value : null
}

export function setFrontmatter(parts: DiaryParts, key: string, yamlValue: string | null, removeWhenNull = true) {
  if (!parts.frontmatter) parts.frontmatter = []
  const fm = parts.frontmatter
  const i = keyIndex(fm, key)
  if (yamlValue === null && removeWhenNull) {
    if (i < 0) return
    let end = i + 1
    while (end < fm.length && /^\s+\S/.test(fm[end])) end++
    fm.splice(i, end - i)
    return
  }
  const line = yamlValue === null || yamlValue === '' ? `${key}:` : `${key}: ${yamlValue}`
  if (i >= 0) {
    let end = i + 1
    while (end < fm.length && /^\s+\S/.test(fm[end])) end++
    fm.splice(i, end - i, line)
  } else {
    fm.push(line)
  }
}

function findSection(parts: DiaryParts, re: RegExp): Section | undefined {
  return parts.sections.find((s) => re.test(s.heading))
}

function trailingBlankCount(lines: string[]): number {
  let n = 0
  for (let i = lines.length - 1; i >= 0 && lines[i].trim() === ''; i--) n++
  return n
}

function stripBullet(line: string): string {
  return line.replace(/^\s*[-*+]\s?/, '')
}

export function parseOneLiner(lines: string[]): string {
  const out = lines.map((l) => (BULLET_RE.test(l.trimStart()) ? stripBullet(l).trim() : l.trim()))
  while (out.length > 0 && out[out.length - 1] === '') out.pop()
  while (out.length > 0 && out[0] === '') out.shift()
  return out.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n')
}

export function oneLinerLines(text: string): string[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => `- ${l}`)
  return lines.length > 0 ? lines : ['- ']
}

function parseLink(s: string): { ref: LinkRef; rest: string } | null {
  const m = LINK_RE.exec(s)
  if (!m) return null
  return { ref: { target: m[1].trim(), alias: m[2]?.trim() ?? null }, rest: s.slice(m[0].length).trimStart() }
}

export function formatLink(ref: LinkRef): string {
  return ref.alias ? `[[${ref.target}|${ref.alias}]]` : `[[${ref.target}]]`
}

function parseEntryHead(head: string): Omit<Entry, 'text' | 'photos' | 'raw'> & { leftover: string } {
  const entry: Omit<Entry, 'text' | 'photos' | 'raw'> = { time: null, weather: null, place: null, people: [], amount: null }
  let s = head.trim()
  const time = /^(\d{1,2}:\d{2})(\s+|$)/.exec(s)
  if (time) {
    entry.time = time[1].padStart(5, '0')
    s = s.slice(time[0].length)
  }
  for (;;) {
    const weather = WEATHER_EMOJIS.find((w) => s.startsWith(w))
    if (weather && entry.weather === null) {
      entry.weather = weather
      s = s.slice(weather.length).trimStart()
      continue
    }
    if (s.startsWith('📍')) {
      s = s.slice('📍'.length).trimStart()
      const link = parseLink(s)
      if (link) {
        entry.place = link.ref
        s = link.rest
      } else {
        const name = /^\S+/.exec(s)?.[0] ?? ''
        entry.place = name ? { target: name, alias: null } : null
        s = s.slice(name.length).trimStart()
      }
      continue
    }
    if (s.startsWith('👥')) {
      s = s.slice('👥'.length).trimStart()
      for (let link = parseLink(s); link; link = parseLink(s)) {
        entry.people.push(link.ref)
        s = link.rest
      }
      continue
    }
    const money = /^💴\s*([+-]?)[¥￥]?([\d,]+)円?/.exec(s)
    if (money) {
      const value = Number(money[2].replace(/,/g, ''))
      entry.amount = money[1] === '+' ? value : -value
      s = s.slice(money[0].length).trimStart()
      continue
    }
    break
  }
  return { ...entry, leftover: s.trim() }
}

function dedent(line: string): string {
  return line.replace(/^( {1,4}|\t)/, '')
}

export function parseEntries(lines: string[]): { prefix: string[]; entries: Entry[] } {
  const prefix: string[] = []
  const blocks: string[][] = []
  for (const line of lines) {
    if (BULLET_RE.test(line)) blocks.push([line])
    else if (blocks.length > 0) blocks[blocks.length - 1].push(line)
    else prefix.push(line)
  }
  const entries = blocks.map((raw) => {
    const head = parseEntryHead(stripBullet(raw[0]))
    const text: string[] = []
    const photos: string[] = []
    const take = (value: string) => {
      const v = value.trim()
      if (!v) return
      const photo = PHOTO_RE.exec(v)
      if (photo) photos.push(photo[1])
      else text.push(v)
    }
    take(head.leftover)
    for (const line of raw.slice(1)) take(dedent(line))
    const { leftover: _leftover, ...meta } = head
    void _leftover
    return { ...meta, text, photos, raw }
  })
  return { prefix, entries }
}

export function formatAmount(amount: number): string {
  return `${amount > 0 ? '+' : '-'}${Math.abs(amount)}`
}

export function entryLines(entry: Entry): string[] {
  const meta = [
    entry.time,
    entry.weather,
    entry.place ? `📍${formatLink(entry.place)}` : null,
    entry.people.length > 0 ? `👥${entry.people.map(formatLink).join(' ')}` : null,
    entry.amount ? `💴${formatAmount(entry.amount)}` : null,
  ].filter((v): v is string => !!v)
  const text = entry.text.map((t) => t.trim()).filter((t) => t.length > 0)
  const photos = entry.photos.map((p) => `![[${p}]]`)
  const body = [...text, ...photos]
  if (meta.length > 0) return [`- ${meta.join(' ')}`, ...body.map((b) => `  ${b}`)]
  if (body.length > 0) return [`- ${body[0]}`, ...body.slice(1).map((b) => `  ${b}`)]
  return []
}

export function transactionTotal(entries: Entry[]): string | null {
  const amounts = entries.map((e) => e.amount).filter((a): a is number => typeof a === 'number' && a !== 0)
  if (amounts.length === 0) return null
  const total = amounts.reduce((a, b) => a + b, 0)
  return total === 0 ? '0' : formatAmount(total)
}

export function isWritten(text: string): boolean {
  const parts = parseDocument(text)
  if (getFrontmatter(parts, 'mood') !== null) return true
  const body = [...parts.preamble, ...parts.sections.flatMap((s) => s.lines)]
  return body.some((raw) => {
    const line = raw.trim()
    if (!line || /^#{1,6}(\s|$)/.test(line) || /^[-*+]$/.test(line)) return false
    return line.replace(/^[-*+]\s+/, '').replace(/^\[[ xX]\]\s*/, '').trim().length > 0
  })
}

function timeKey(e: Entry): number {
  if (!e.time) return Number.POSITIVE_INFINITY
  const [h, m] = e.time.split(':').map(Number)
  return h * 60 + m
}

export function sortEntries<T extends Entry>(entries: T[]): T[] {
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => timeKey(a.e) - timeKey(b.e) || a.i - b.i)
    .map(({ e }) => e)
}

function rawKey(e: Entry): string | null {
  return e.raw ? trimBlankEdges(e.raw).join('\n') : null
}

export function mergeExternalEntries(loaded: Entry[], latest: Entry[], ours: Entry[]): Entry[] {
  const known = new Set(loaded.map(rawKey).filter((k): k is string => k !== null))
  const added = latest.filter((e) => {
    const k = rawKey(e)
    return k !== null && !known.has(k)
  })
  return added.length > 0 ? [...ours, ...added] : ours
}

export function newDiaryText(date: string): string {
  return ['---', 'type: diary', `date: "${date}"`, 'mood:', '---', '', ONE_LINER_HEADING, '- ', '', EVENTS_HEADING, ''].join('\n')
}

export function parseDiary(text: string, date: string): Diary {
  const parts = parseDocument(text)
  const one = findSection(parts, ONE_LINER_RE)
  const events = findSection(parts, EVENTS_RE)
  return {
    date,
    mood: getFrontmatter(parts, 'mood'),
    weather: getFrontmatter(parts, 'weather'),
    oneLiner: one ? parseOneLiner(one.lines) : '',
    entries: events ? parseEntries(events.lines).entries : [],
  }
}

function replaceSectionBody(section: Section, body: string[]) {
  const blanks = trailingBlankCount(section.lines)
  section.lines = [...body, ...Array<string>(blanks).fill('')]
}

function ensureSection(parts: DiaryParts, kind: 'oneLiner' | 'events'): Section {
  const re = kind === 'oneLiner' ? ONE_LINER_RE : EVENTS_RE
  const existing = findSection(parts, re)
  if (existing) return existing
  const oneIndex = parts.sections.findIndex((s) => ONE_LINER_RE.test(s.heading))
  const eventsIndex = parts.sections.findIndex((s) => EVENTS_RE.test(s.heading))
  let index = parts.sections.length
  if (kind === 'oneLiner' && eventsIndex >= 0) index = eventsIndex
  if (kind === 'events' && oneIndex >= 0) index = oneIndex + 1
  const before = index > 0 ? parts.sections[index - 1].lines : parts.preamble
  if (before.length > 0 && before[before.length - 1].trim() !== '') before.push('')
  if (before.length === 0 && (index > 0 || parts.frontmatter)) before.push('')
  const section: Section = { heading: kind === 'oneLiner' ? ONE_LINER_HEADING : EVENTS_HEADING, lines: index < parts.sections.length ? [''] : [] }
  parts.sections.splice(index, 0, section)
  return section
}

function trimBlankEdges(lines: string[]): string[] {
  let start = 0
  let end = lines.length
  while (start < end && lines[start].trim() === '') start++
  while (end > start && lines[end - 1].trim() === '') end--
  return lines.slice(start, end)
}

export function applyDiary(original: string | null, date: string, update: DiaryUpdate): string {
  const parts = parseDocument(original ?? newDiaryText(date))
  if (getFrontmatter(parts, 'type') === null) setFrontmatter(parts, 'type', 'diary')
  if (getFrontmatter(parts, 'date') === null) setFrontmatter(parts, 'date', `"${date}"`)
  if (update.mood !== undefined) setFrontmatter(parts, 'mood', update.mood, false)
  if (update.weather !== undefined) setFrontmatter(parts, 'weather', update.weather)
  if (update.oneLiner !== undefined) {
    replaceSectionBody(ensureSection(parts, 'oneLiner'), oneLinerLines(update.oneLiner))
  }
  if (update.entries !== undefined) {
    const section = ensureSection(parts, 'events')
    const prefix = trimBlankEdges(parseEntries(section.lines).prefix)
    const body = update.entries.flatMap((e) => (e.raw ? trimBlankEdges(e.raw) : entryLines(e)))
    const content = prefix.length > 0 && body.length > 0 ? [...prefix, '', ...body] : [...prefix, ...body]
    section.lines = [...content, ...Array<string>(trailingBlankCount(section.lines)).fill('')]
    const total = transactionTotal(update.entries)
    setFrontmatter(parts, 'transaction', total === null ? null : `"${total}"`)
  }
  return serializeDocument(parts)
}
