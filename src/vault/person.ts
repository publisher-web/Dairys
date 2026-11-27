import { parseDocument, serializeDocument, type DiaryParts, type Section } from '../diary/markdown'
import { readList, readScalar, writeList, writeScalar, yamlScalar } from './frontmatter'
import { dataviewBlock, PEOPLE_QUERY } from './queries'

export const RELATIONS = ['家族', '友達', '学校', '仕事', 'その他'] as const
export type Relation = (typeof RELATIONS)[number]

export const FAMILY_KEYS = ['配偶者', '結婚記念日', '息子', '娘', '両親', '兄弟姉妹', 'ペット'] as const
export type FamilyKey = (typeof FAMILY_KEYS)[number]
export const FAMILY_LINK_KEYS: FamilyKey[] = ['配偶者', '息子', '娘', '両親', '兄弟姉妹', 'ペット']

export const FAMILY_HEADING = '## 👨‍👩‍👧‍👦 人間関係・家族'
const FAMILY_RE = /^##\s.*人間関係・家族/
const RECENT_HEADING = '## 🤝 最近の接点'
const RECENT_RE = /^##\s.*最近の接点/
const PHOTO_LINE_RE = /^!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]\s*$/

type ScalarKey = 'reading' | 'relation' | 'birthDate' | 'metHow' | 'school' | 'company' | 'position'
type ListKey = 'aliases' | 'likes' | 'dislikes'

const FIELD_ORDER: (ScalarKey | ListKey)[] = ['reading', 'aliases', 'relation', 'birthDate', 'likes', 'dislikes', 'metHow', 'school', 'company', 'position']
const LIST_KEYS = new Set<string>(['aliases', 'likes', 'dislikes'])

export type PersonNote = {
  name: string
  reading: string
  aliases: string[]
  relation: string
  birthDate: string
  likes: string[]
  dislikes: string[]
  metHow: string
  school: string
  company: string
  position: string
  photo: string | null
  memo: string
  family: Record<FamilyKey, string>
}

function emptyFamily(): Record<FamilyKey, string> {
  return Object.fromEntries(FAMILY_KEYS.map((k) => [k, ''])) as Record<FamilyKey, string>
}

export function familyLineRe(key: string): RegExp {
  return new RegExp(`^\\s*[-*]\\s+${key}::\\s?(.*)$`)
}

function preambleView(preamble: string[]): { h1: number; photo: number; memo: string } {
  const h1 = preamble.findIndex((l) => /^#\s/.test(l))
  const photo = preamble.findIndex((l) => PHOTO_LINE_RE.test(l.trim()))
  const rest = preamble.filter((_, i) => i !== h1 && i !== photo)
  while (rest.length > 0 && rest[0].trim() === '') rest.shift()
  while (rest.length > 0 && rest[rest.length - 1].trim() === '') rest.pop()
  return { h1, photo, memo: rest.join('\n') }
}

export function photoOf(text: string): string | null {
  const preamble = parseDocument(text).preamble
  const i = preambleView(preamble).photo
  return i >= 0 ? PHOTO_LINE_RE.exec(preamble[i].trim())![1] : null
}

export function parsePerson(text: string, name: string): PersonNote {
  const parts = parseDocument(text)
  const fm = parts.frontmatter ?? []
  const view = preambleView(parts.preamble)
  const family = emptyFamily()
  const section = parts.sections.find((s) => FAMILY_RE.test(s.heading))
  if (section) {
    for (const key of FAMILY_KEYS) {
      const line = section.lines.find((l) => familyLineRe(key).test(l))
      if (line) family[key] = familyLineRe(key).exec(line)![1].trim()
    }
  }
  return {
    name,
    reading: readScalar(fm, 'reading') ?? '',
    aliases: readList(fm, 'aliases'),
    relation: readScalar(fm, 'relation') ?? '',
    birthDate: readScalar(fm, 'birthDate') ?? '',
    likes: readList(fm, 'likes'),
    dislikes: readList(fm, 'dislikes'),
    metHow: readScalar(fm, 'metHow') ?? '',
    school: readScalar(fm, 'school') ?? '',
    company: readScalar(fm, 'company') ?? '',
    position: readScalar(fm, 'position') ?? '',
    photo: view.photo >= 0 ? PHOTO_LINE_RE.exec(parts.preamble[view.photo].trim())![1] : null,
    memo: view.memo,
    family,
  }
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

function writeFields(parts: DiaryParts, before: PersonNote, after: PersonNote) {
  if (!parts.frontmatter) parts.frontmatter = []
  const fm = parts.frontmatter
  FIELD_ORDER.forEach((key, i) => {
    const anchors: string[] = [...FIELD_ORDER.slice(0, i).reverse(), 'name', 'tags', 'type']
    if (LIST_KEYS.has(key)) {
      const k = key as ListKey
      if (!sameList(before[k], after[k])) writeList(fm, k, after[k], anchors)
    } else {
      const k = key as ScalarKey
      if (before[k].trim() !== after[k].trim()) writeScalar(fm, k, after[k], anchors)
    }
  })
}

function writePreamble(parts: DiaryParts, before: PersonNote, after: PersonNote) {
  if (before.photo === after.photo && before.memo.trim() === after.memo.trim()) return
  const view = preambleView(parts.preamble)
  const h1 = view.h1 >= 0 ? parts.preamble[view.h1] : `# ${after.name}`
  const lines = ['', h1, '']
  if (after.photo) lines.push(`![[${after.photo}]]`, '')
  const memo = after.memo.replace(/\r\n/g, '\n').trim()
  if (memo) lines.push(...memo.split('\n'), '')
  parts.preamble = lines
}

function ensureSection(parts: DiaryParts, heading: string, beforeRe: RegExp): Section {
  const existing = parts.sections.find((s) => FAMILY_RE.test(s.heading))
  if (existing) return existing
  const section: Section = { heading, lines: [''] }
  const at = parts.sections.findIndex((s) => beforeRe.test(s.heading))
  if (at >= 0) parts.sections.splice(at, 0, section)
  else {
    const last = parts.sections[parts.sections.length - 1]
    const tail = last ? last.lines : parts.preamble
    if (tail.length === 0 || tail[tail.length - 1].trim() !== '') tail.push('')
    parts.sections.push(section)
  }
  return section
}

function writeFamily(parts: DiaryParts, before: PersonNote, after: PersonNote) {
  const changed = FAMILY_KEYS.filter((k) => before.family[k].trim() !== after.family[k].trim())
  if (changed.length === 0) return
  const section = ensureSection(parts, FAMILY_HEADING, RECENT_RE)
  for (const key of changed) {
    const line = `- ${key}:: ${after.family[key].trim()}`
    const i = section.lines.findIndex((l) => familyLineRe(key).test(l))
    if (i >= 0) {
      section.lines[i] = line
      continue
    }
    let last = -1
    section.lines.forEach((l, j) => {
      if (/^\s*[-*]\s+[^:]+::/.test(l)) last = j
    })
    if (last >= 0) section.lines.splice(last + 1, 0, line)
    else {
      const firstContent = section.lines.findIndex((l) => l.trim() !== '')
      section.lines.splice(firstContent >= 0 ? firstContent : section.lines.length, 0, line)
      if (firstContent < 0) section.lines.push('')
    }
  }
  if (section.lines[0]?.trim() !== '') section.lines.unshift('')
  if (section.lines[section.lines.length - 1]?.trim() !== '') section.lines.push('')
}

export function applyPerson(text: string, before: PersonNote, after: PersonNote): string {
  const parts = parseDocument(text)
  writeFields(parts, before, after)
  writePreamble(parts, before, after)
  writeFamily(parts, before, after)
  return serializeDocument(parts)
}

export function personSkeleton(name: string): string {
  return [
    '---',
    'type: person',
    'tags:',
    '  - 人物',
    `name: ${yamlScalar(name)}`,
    ...FIELD_ORDER.map((k) => `${k}:`),
    '---',
    '',
    `# ${name}`,
    '',
    FAMILY_HEADING,
    '',
    ...FAMILY_KEYS.map((k) => `- ${k}:: `),
    '',
    RECENT_HEADING,
    ...dataviewBlock(PEOPLE_QUERY),
    '',
  ].join('\n')
}

export function newPersonText(note: PersonNote): string {
  const skeleton = personSkeleton(note.name)
  return applyPerson(skeleton, parsePerson(skeleton, note.name), note)
}

export function emptyPerson(name: string): PersonNote {
  return parsePerson(personSkeleton(name), name)
}

export function setRelationIfEmpty(text: string, relation: Relation): string {
  const parts = parseDocument(text)
  const fm = parts.frontmatter ?? []
  if (!parts.frontmatter || readScalar(fm, 'relation')) return text
  writeScalar(fm, 'relation', relation, ['aliases', 'reading', 'name', 'tags', 'type'])
  return serializeDocument(parts)
}
