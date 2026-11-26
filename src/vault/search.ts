export function normalizeForSearch(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/[\s・･]/g, '')
}

export type Searchable = { name: string; reading: string | null; aliases: string[] }

export function matches(item: Searchable, query: string): boolean {
  const q = normalizeForSearch(query)
  if (!q) return true
  return [item.name, item.reading ?? '', ...item.aliases].some((v) => normalizeForSearch(v).includes(q))
}

export function hasExactName(items: Searchable[], query: string): boolean {
  const q = normalizeForSearch(query)
  return items.some((i) => normalizeForSearch(i.name) === q || i.aliases.some((a) => normalizeForSearch(a) === q))
}

export function displayName(item: Searchable): string {
  return item.aliases[0] ?? item.name
}
