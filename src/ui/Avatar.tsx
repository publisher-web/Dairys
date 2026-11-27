import type { Person, Place, PlaceKind } from '../vault/directory'
import { displayName } from '../vault/search'
import { Glyph } from './Icon'

type Item = Person | Place

const AVATAR_COLORS = ['#f6b99b', '#9fddc0', '#a9d6ee', '#cbc2ec', '#ffe08f', '#f7c3cd']
const PLACE_COLORS: Record<PlaceKind, string> = { place: '#f7c9a8', school: '#a9d6ee', company: '#cbc2ec' }

function hash(s: string): number {
  let h = 0
  for (const ch of s) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0
  return h
}

export default function Avatar({ item }: { item: Item }) {
  if (item.kind !== 'person')
    return (
      <span className="avatar" style={{ background: PLACE_COLORS[item.kind] }}>
        <Glyph name="pin" size={18} />
      </span>
    )
  const label = displayName(item)
  return (
    <span className="avatar" style={{ background: AVATAR_COLORS[hash(item.name) % AVATAR_COLORS.length] }}>
      {[...label][0]}
    </span>
  )
}
