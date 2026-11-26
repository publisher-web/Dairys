const LINK_RE = /(!?)\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g

export function extractLinkTargets(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(LINK_RE)) {
    if (m[1] === '!') continue
    const target = m[2].trim()
    if (target) out.push(target)
  }
  return out
}

export type LinkUsage = { count: number; last: string }

export type UsageSource = { date: string; targets: string[] }

export function buildUsage(sources: UsageSource[]): Map<string, LinkUsage> {
  const usage = new Map<string, LinkUsage>()
  for (const { date, targets } of sources) {
    for (const t of new Set(targets)) {
      const u = usage.get(t)
      if (!u) usage.set(t, { count: 1, last: date })
      else usage.set(t, { count: u.count + 1, last: date > u.last ? date : u.last })
    }
  }
  return usage
}

export function rankByUsage<T extends { name: string }>(items: T[], usage: Map<string, LinkUsage>): T[] {
  return items
    .filter((i) => usage.has(i.name))
    .sort((a, b) => {
      const ua = usage.get(a.name)!
      const ub = usage.get(b.name)!
      return ub.last.localeCompare(ua.last) || ub.count - ua.count
    })
}

export type Unresolved = { name: string; count: number; last: string }

export function unresolvedLinks(usage: Map<string, LinkUsage>, existing: Set<string>): Unresolved[] {
  const known = new Set([...existing].map((n) => n.toLowerCase()))
  return [...usage.entries()]
    .filter(([name]) => !known.has((name.split('/').pop() ?? name).toLowerCase()) && !/\.(png|jpe?g|gif|webp|pdf|heic|md)$/i.test(name))
    .map(([name, u]) => ({ name, count: u.count, last: u.last }))
    .sort((a, b) => b.last.localeCompare(a.last) || b.count - a.count)
}
