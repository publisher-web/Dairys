import type { LinkRef } from '../diary/markdown'

export function linkOf(item: { name: string; aliases: string[] }): LinkRef {
  return { target: item.name, alias: item.aliases[0] ?? null }
}

export function linkLabel(ref: LinkRef): string {
  return ref.alias ?? ref.target
}
