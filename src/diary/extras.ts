import { parseDocument } from './markdown'

export type Extra = { heading: string | null; lines: string[]; photos: string[] }

const PHOTO_RE = /^!\[\[([^\]|]+)(\|[^\]]*)?\]\]$/
const KNOWN_SECTION_RE = /^##\s.*(今日の一言|できごと)/

function hasContent(line: string): boolean {
  const t = line.trim()
  return t.length > 0 && !/^#{1,6}(\s|$)/.test(t) && !/^[-*+]$/.test(t)
}

export function extraBlocks(text: string): Extra[] {
  const parts = parseDocument(text)
  const blocks = [{ heading: null as string | null, lines: parts.preamble }, ...parts.sections.filter((s) => !KNOWN_SECTION_RE.test(s.heading)).map((s) => ({ heading: s.heading.replace(/^##\s*/, ''), lines: s.lines }))]
  return blocks
    .map((b) => {
      const photos: string[] = []
      const lines: string[] = []
      for (const raw of b.lines) {
        const photo = PHOTO_RE.exec(raw.trim().replace(/^[-*+]\s+/, ''))
        if (photo) photos.push(photo[1])
        else lines.push(raw)
      }
      while (lines.length > 0 && lines[0].trim() === '') lines.shift()
      while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()
      return { heading: b.heading, lines, photos }
    })
    .filter((b) => b.lines.some(hasContent) || b.photos.length > 0)
}
