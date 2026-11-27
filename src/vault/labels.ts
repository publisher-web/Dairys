import type { Person, Place } from './directory'
import { displayName } from './search'

type Item = Person | Place

export const KIND_LABEL: Record<Item['kind'], string> = { person: '人物', place: '場所', school: '学校', company: '会社' }

export function subText(item: Item): string {
  const display = displayName(item)
  if (item.kind === 'person') return display !== item.name ? item.name : (item.reading ?? '')
  return [KIND_LABEL[item.kind], display !== item.name ? item.name : null].filter(Boolean).join('・')
}

