import { parseDocument } from '../diary/markdown'

function unquote(value: string): string {
  const v = value.trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1).trim()
  return v
}

export function frontmatterOf(text: string): string[] {
  return parseDocument(text).frontmatter ?? []
}

function keyIndex(fm: string[], key: string): number {
  return fm.findIndex((l) => l.startsWith(`${key}:`))
}

export function readScalar(fm: string[], key: string): string | null {
  const i = keyIndex(fm, key)
  if (i < 0) return null
  const value = unquote(fm[i].slice(key.length + 1))
  return value.length > 0 ? value : null
}

export function readList(fm: string[], key: string): string[] {
  const i = keyIndex(fm, key)
  if (i < 0) return []
  const inline = fm[i].slice(key.length + 1).trim()
  if (inline.startsWith('[') && inline.endsWith(']')) {
    return inline
      .slice(1, -1)
      .split(',')
      .map(unquote)
      .filter((v) => v.length > 0)
  }
  if (inline.length > 0) {
    const v = unquote(inline)
    return v ? [v] : []
  }
  const out: string[] = []
  for (let j = i + 1; j < fm.length && /^\s*-(\s|$)/.test(fm[j]); j++) {
    const v = unquote(fm[j].replace(/^\s*-\s?/, ''))
    if (v) out.push(v)
  }
  return out
}
