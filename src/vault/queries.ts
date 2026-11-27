import { DIARY_FOLDER, EVENTS_FOLDER } from '../config'

export const PEOPLE_QUERY = [
  'TABLE WITHOUT ID link(file.link, default(file.aliases[0], file.name)) as "記録", date as "日付", place as "場所"',
  `FROM "${EVENTS_FOLDER}" OR "${DIARY_FOLDER}"`,
  'WHERE contains(default(human, []), this.file.link) OR contains(file.outlinks, this.file.link)',
  'SORT date DESC, file.name DESC',
]

export const PLACE_QUERY = [
  'TABLE WITHOUT ID link(file.link, default(file.aliases[0], file.name)) as "記録", date as "日付", human as "人物", category as "種類"',
  `FROM "${EVENTS_FOLDER}" OR "${DIARY_FOLDER}"`,
  'WHERE contains(default(place, []), this.file.link) OR contains(file.outlinks, this.file.link)',
  'SORT date DESC',
]

export function dataviewBlock(query: string[]): string[] {
  return ['```dataview', ...query, '```']
}

const BLOCK_RE = /```dataview(\r?\n)([\s\S]*?)```/g

export function upgradeDataview(text: string): string {
  return text.replace(BLOCK_RE, (whole, eol: string, body: string) => {
    if (!body.includes(`FROM "${EVENTS_FOLDER}"`) || body.includes(`"${DIARY_FOLDER}"`)) return whole
    const query = /contains\(human,\s*this\.file\.link\)/.test(body) ? PEOPLE_QUERY : /contains\(place,\s*this\.file\.link\)/.test(body) ? PLACE_QUERY : null
    return query ? ['```dataview', ...query, '```'].join(eol) : whole
  })
}

export function needsDataviewUpgrade(text: string): boolean {
  return upgradeDataview(text) !== text
}
