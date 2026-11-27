import { parseDocument, serializeDocument, type DiaryParts } from '../diary/markdown'
import { readList, readScalar, writeList, writeScalar } from './frontmatter'
import { dataviewBlock, PLACE_QUERY } from './queries'

export type PlaceNote = {
  name: string
  aliases: string[]
  category: string
  postal: string
  address: string
  phone: string
  url: string
  memo: string
}

const SCALARS: { field: 'category' | 'postal' | 'address' | 'phone' | 'url'; key: string }[] = [
  { field: 'category', key: '種別' },
  { field: 'postal', key: '郵便番号' },
  { field: 'address', key: '住所' },
  { field: 'phone', key: '電話番号' },
  { field: 'url', key: 'URL' },
]

const MEMO_RE = /^##\s*(?:📝\s*)?メモ/
export const MEMO_HEADING = '## メモ'
const CATEGORY_TAG = 'カテゴリ/'

function memoOf(parts: DiaryParts): string {
  const section = parts.sections.find((s) => MEMO_RE.test(s.heading))
  if (!section) return ''
  const tail = section.heading.replace(MEMO_RE, '').trim()
  const lines = [...(tail ? [tail] : []), ...section.lines]
  while (lines.length > 0 && lines[0].trim() === '') lines.shift()
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()
  return lines.join('\n')
}

export function parsePlace(text: string, name: string): PlaceNote {
  const parts = parseDocument(text)
  const fm = parts.frontmatter ?? []
  const note: PlaceNote = { name, aliases: readList(fm, 'aliases'), category: '', postal: '', address: '', phone: '', url: '', memo: memoOf(parts) }
  for (const { field, key } of SCALARS) note[field] = readScalar(fm, key) ?? ''
  return note
}

export function categoryTags(tags: string[], category: string): string[] {
  const c = category.trim()
  const first = tags.findIndex((t) => t.startsWith(CATEGORY_TAG))
  const rest = tags.filter((t) => !t.startsWith(CATEGORY_TAG))
  if (!c) return rest
  const tag = `${CATEGORY_TAG}${c}`
  const at = first >= 0 ? first : 0
  return [...rest.slice(0, at), tag, ...rest.slice(at)]
}

export function applyPlace(text: string, before: PlaceNote, after: PlaceNote): string {
  const parts = parseDocument(text)
  if (!parts.frontmatter) parts.frontmatter = []
  const fm = parts.frontmatter
  if (before.aliases.join('\n') !== after.aliases.join('\n')) writeList(fm, 'aliases', after.aliases, ['type'])
  SCALARS.forEach(({ field, key }, i) => {
    const anchors = SCALARS.slice(0, i)
      .map((s) => s.key)
      .reverse()
      .concat(['aliases', 'type'])
    if (before[field].trim() !== after[field].trim()) writeScalar(fm, key, after[field], anchors)
  })
  const type = readScalar(fm, 'type')
  if (before.category.trim() !== after.category.trim() && (type === 'place' || type === null)) {
    writeList(fm, 'tags', categoryTags(readList(fm, 'tags'), after.category), ['URL', '電話番号', '住所'])
  }
  if (before.memo.trim() !== after.memo.trim()) {
    const memo = after.memo.replace(/\r\n/g, '\n').trim()
    const lines = memo ? ['', ...memo.split('\n'), ''] : ['']
    const section = parts.sections.find((s) => MEMO_RE.test(s.heading))
    if (section) {
      section.heading = MEMO_HEADING
      section.lines = lines
    } else {
      const last = parts.sections[parts.sections.length - 1]
      const tail = last ? last.lines : parts.preamble
      if (tail.length === 0 || tail[tail.length - 1].trim() !== '') tail.push('')
      parts.sections.push({ heading: MEMO_HEADING, lines })
    }
  }
  return serializeDocument(parts)
}

export function placeSkeleton(name: string): string {
  return ['---', 'type: place', 'aliases:', ...SCALARS.map((s) => `${s.key}:`), 'tags:', '---', '', `# ${name}`, '', '## 📅 訪問履歴', ...dataviewBlock(PLACE_QUERY), '', MEMO_HEADING, ''].join('\n')
}

export function emptyPlace(name: string): PlaceNote {
  return parsePlace(placeSkeleton(name), name)
}

export function newPlaceText(note: PlaceNote): string {
  const skeleton = placeSkeleton(note.name)
  return applyPlace(skeleton, parsePlace(skeleton, note.name), note)
}

export function mapUrl(name: string, address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, address.trim()].filter(Boolean).join(' '))}`
}
