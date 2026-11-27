import { parseDocument } from '../diary/markdown'
import { readScalar } from './frontmatter'
import { extractLinkTargets } from './links'
import { FAMILY_LINK_KEYS, familyLineRe, type Relation } from './person'

export type RelationSource = { name: string; text: string }

type Facts = { familyLinks: string[]; schoolField: string[]; affiliations: string[]; company: string; metHow: string[] }

function factsOf(text: string): Facts {
  const parts = parseDocument(text)
  const fm = parts.frontmatter ?? []
  const familyLinks: string[] = []
  for (const s of parts.sections.filter((s) => /^##\s.*人間関係・家族/.test(s.heading))) {
    for (const line of s.lines) {
      for (const key of FAMILY_LINK_KEYS) {
        const m = familyLineRe(key).exec(line)
        if (m) familyLinks.push(...extractLinkTargets(m[1]))
      }
    }
  }
  const affiliations = [...text.matchAll(/\[名称::\s*([^\]]*\]\])/g)].flatMap((m) => extractLinkTargets(m[1]))
  return {
    familyLinks,
    schoolField: extractLinkTargets(readScalar(fm, 'school') ?? ''),
    affiliations,
    company: (readScalar(fm, 'company') ?? '').trim(),
    metHow: extractLinkTargets(readScalar(fm, 'metHow') ?? ''),
  }
}

export function draftRelations(notes: RelationSource[], schools: Set<string>): Map<string, Relation> {
  const facts = new Map(notes.map((n) => [n.name, factsOf(n.text)]))
  const family = new Set<string>()
  for (const [name, f] of facts) {
    if (f.familyLinks.length === 0) continue
    family.add(name)
    f.familyLinks.forEach((t) => family.add(t))
  }
  const result = new Map<string, Relation>()
  for (const [name, f] of facts) {
    if (family.has(name)) result.set(name, '家族')
    else if (f.schoolField.length > 0 || f.affiliations.some((a) => schools.has(a))) result.set(name, '学校')
    else if (f.company) result.set(name, '仕事')
    else if (f.metHow.some((a) => schools.has(a))) result.set(name, '学校')
    else result.set(name, 'その他')
  }
  return result
}
