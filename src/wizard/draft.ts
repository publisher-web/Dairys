import type { Entry } from '../diary/markdown'
import { kvDelete, kvGet, kvSet } from '../storage/kv'

export type StepId = 'entries' | 'mood' | 'oneLiner' | 'confirm'

export const STEPS: StepId[] = ['entries', 'mood', 'oneLiner', 'confirm']

export type EditableEntry = Entry & { key: string }

export type Draft = {
  date: string
  baseRev: string | null
  step: StepId
  mood: string | null
  oneLiner: string
  entries: EditableEntry[]
  baseEntries: Entry[]
  moodTouched: boolean
  oneLinerTouched: boolean
  entriesTouched: boolean
  savedAt: number
}

export function isTouched(draft: Draft | undefined | null): boolean {
  return !!draft && (draft.moodTouched || draft.oneLinerTouched || draft.entriesTouched)
}

const key = (date: string) => `draft:${date}`

export async function loadDraft(date: string): Promise<Draft | undefined> {
  try {
    return await kvGet<Draft>(key(date))
  } catch {
    return undefined
  }
}

export async function storeDraft(draft: Draft): Promise<void> {
  try {
    await kvSet(key(draft.date), { ...draft, savedAt: Date.now() })
  } catch {
    void 0
  }
}

export async function clearDraft(date: string): Promise<void> {
  try {
    await kvDelete(key(date))
  } catch {
    void 0
  }
}

export function newKey(): string {
  return Math.random().toString(36).slice(2, 10)
}
