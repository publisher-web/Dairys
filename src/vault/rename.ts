const LINK_RE = /(!?)\[\[([^\]|#]+)(#[^\]|]*)?(\|[^\]]*)?\]\]/g

export function renameLinks(text: string, from: string, to: string): string {
  if (from === to) return text
  return text.replace(LINK_RE, (whole, embed: string, target: string, hash: string | undefined, alias: string | undefined) => {
    if (embed || target.trim() !== from) return whole
    return `[[${to}${hash ?? ''}${alias ?? `|${from}`}]]`
  })
}

export function countLinks(text: string, name: string): number {
  let n = 0
  for (const m of text.matchAll(LINK_RE)) if (!m[1] && m[2].trim() === name) n++
  return n
}
