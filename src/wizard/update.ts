import { applyDiary, sortEntries, type DiaryUpdate } from '../diary/markdown'
import type { PendingPhoto } from '../diary/photos'
import type { LoadedDiary } from '../diary/store'
import { weatherAt, type WeatherData } from '../diary/weather'
import type { Draft } from './draft'

export const PENDING_PREFIX = 'pending:'

export function previewPath(p: PendingPhoto): string {
  return `${PENDING_PREFIX}${p.id}`
}

export function buildUpdate(draft: Draft, loaded: LoadedDiary, photoPath: (p: PendingPhoto) => string = previewPath, weather: WeatherData | null = null): DiaryUpdate {
  const update: DiaryUpdate = {}
  if (draft.moodTouched && draft.mood !== loaded.diary.mood) update.mood = draft.mood
  if (draft.oneLinerTouched && draft.oneLiner.trim() !== loaded.diary.oneLiner.trim()) update.oneLiner = draft.oneLiner
  if (draft.entriesTouched)
    update.entries = sortEntries(
      draft.entries.map(({ key: _key, pendingPhotos, ...e }) => {
        void _key
        const withPhotos = pendingPhotos && pendingPhotos.length > 0 ? { ...e, photos: [...e.photos, ...pendingPhotos.map(photoPath)], raw: null } : e
        return withPhotos.raw === null && !withPhotos.weather && withPhotos.time ? { ...withPhotos, weather: weatherAt(weather, withPhotos.time) } : withPhotos
      }),
    )
  if (Object.keys(update).length > 0 && weather?.daily && !loaded.diary.weather) update.weather = weather.daily
  return update
}

export function hasRealChanges(draft: Draft, loaded: LoadedDiary): boolean {
  return applyDiary(loaded.text, loaded.date, buildUpdate(draft, loaded)) !== applyDiary(loaded.text, loaded.date, {})
}
