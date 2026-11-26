export type MoodId = 'great' | 'good' | 'okay' | 'meh' | 'down'

export type Mood = { id: MoodId; emoji: string; label: string }

export const MOODS: Mood[] = [
  { id: 'great', emoji: '😆', label: '最高' },
  { id: 'good', emoji: '😃', label: 'いい日' },
  { id: 'okay', emoji: '🙂', label: 'ふつう' },
  { id: 'meh', emoji: '😐', label: 'いまいち' },
  { id: 'down', emoji: '🙁', label: 'しんどい' },
]

const LEGACY: Record<string, MoodId> = {
  '🤣': 'great',
  '😁': 'great',
  '😄': 'good',
  '🤤': 'good',
  '😊': 'good',
  '😌': 'okay',
  '😑': 'meh',
  '😤': 'meh',
  '😢': 'down',
  '😞': 'down',
}

export function moodFromEmoji(emoji: string | null): Mood | null {
  if (!emoji) return null
  const direct = MOODS.find((m) => m.emoji === emoji)
  if (direct) return direct
  const legacy = LEGACY[emoji]
  return legacy ? (MOODS.find((m) => m.id === legacy) ?? null) : null
}
