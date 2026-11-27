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
  if (inline.startsWith('[') && inline.endsWith(']') && !inline.startsWith('[[')) {
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

export function yamlScalar(value: string): string {
  const v = value.trim()
  const plain = !/^[\s[\]{}!&*#|>'"%@`,?:-]|:\s|:$|\s#|^(true|false|null|yes|no|on|off|~)$/i.test(v) && !/^[+-]?\d+(\.\d+)?$/.test(v)
  if (plain || /^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function blockEnd(fm: string[], i: number): number {
  let end = i + 1
  while (end < fm.length && /^(\s+\S|\s*-(\s|$))/.test(fm[end]) && !/^\S[^:]*:/.test(fm[end])) end++
  return end
}

function insertAt(fm: string[], after: string[]): number {
  for (const key of after) {
    const i = keyIndex(fm, key)
    if (i >= 0) return blockEnd(fm, i)
  }
  return fm.length
}

function replaceKey(fm: string[], key: string, lines: string[], after: string[]) {
  const i = keyIndex(fm, key)
  if (i >= 0) fm.splice(i, blockEnd(fm, i) - i, ...lines)
  else fm.splice(insertAt(fm, after), 0, ...lines)
}

export function writeScalar(fm: string[], key: string, value: string | null, after: string[] = []) {
  const v = value?.trim() ?? ''
  replaceKey(fm, key, [v ? `${key}: ${yamlScalar(v)}` : `${key}:`], after)
}

export function writeList(fm: string[], key: string, values: string[], after: string[] = []) {
  const items = values.map((v) => v.trim()).filter((v) => v.length > 0)
  replaceKey(fm, key, items.length > 0 ? [`${key}:`, ...items.map((v) => `  - ${yamlScalar(v)}`)] : [`${key}:`], after)
}
