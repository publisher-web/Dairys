import { describe, expect, it } from 'vitest'
import { assertWritablePath, diaryPath, UnsafePathError } from './guard'

const ROOT = '/アプリ/remotely-save/Diary'

describe('assertWritablePath', () => {
  it.each([`${ROOT}/40_Diary/2026-11-27.md`, `${ROOT}/40_diary/2026-11-27.md`, `${ROOT}/attachments/photo-1795700000000.jpg`, `${ROOT}/attachments/a.PNG`])('allows %s', (path) => {
    expect(() => assertWritablePath(ROOT, path)).not.toThrow()
  })

  it.each([
    `${ROOT}/30_HumanNetwork/10_People/a.md`,
    `${ROOT}/40_Diary/sub/2026-11-27.md`,
    `${ROOT}/40_Diary/_hidden.md`,
    `${ROOT}/40_Diary/.hidden.md`,
    `${ROOT}/40_Diary/../x.md`,
    `${ROOT}/attachments/x.md`,
    `${ROOT}/.obsidian/app.json`,
    `/Apps/remotely-save/Diary/40_Diary/2026-11-27.md`,
    `${ROOT}//40_Diary/2026-11-27.md`,
  ])('rejects %s', (path) => {
    expect(() => assertWritablePath(ROOT, path)).toThrow(UnsafePathError)
  })

  it('rejects a malformed root', () => {
    expect(() => assertWritablePath('', `/40_Diary/2026-11-27.md`)).toThrow(UnsafePathError)
  })
})

describe('diaryPath', () => {
  it('builds the dated path', () => {
    expect(diaryPath(ROOT, '2026-11-27')).toBe(`${ROOT}/40_Diary/2026-11-27.md`)
  })

  it('rejects bad dates', () => {
    expect(() => diaryPath(ROOT, '2026-11-27/../x')).toThrow(UnsafePathError)
  })
})
