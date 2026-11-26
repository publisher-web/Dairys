import { describe, expect, it } from 'vitest'
import { groupPhotos, type PendingPhoto } from './photos'

function photo(id: string, date: string | null, time: string | null): PendingPhoto {
  return { id, blob: new Blob(), width: 1, height: 1, taken: date && time ? { date, time } : null }
}

describe('groupPhotos', () => {
  it('groups photos taken within 30 minutes and keeps untimed ones separate', () => {
    const groups = groupPhotos([
      photo('c', '2026-11-27', '19:20'),
      photo('a', '2026-11-27', '12:10'),
      photo('x', null, null),
      photo('b', '2026-11-27', '12:35'),
      photo('d', '2026-11-27', '19:55'),
      photo('y', null, null),
    ])
    expect(groups.map((g) => g.map((p) => p.id))).toEqual([['a', 'b'], ['c'], ['d'], ['x'], ['y']])
  })

  it('chains photos as long as each gap is short', () => {
    const groups = groupPhotos([photo('a', '2026-11-27', '10:00'), photo('b', '2026-11-27', '10:25'), photo('c', '2026-11-27', '10:50')])
    expect(groups).toHaveLength(1)
  })

  it('splits photos from different days', () => {
    const groups = groupPhotos([photo('a', '2026-11-26', '23:50'), photo('b', '2026-11-27', '00:05')])
    expect(groups).toHaveLength(2)
  })
})
