import { describe, expect, it } from 'vitest'
import { assertDeletablePath, assertWritablePath, diaryPath, noteNameProblem, notePath, UnsafePathError } from './guard'

const ROOT = '/アプリ/remotely-save/Diary'

describe('assertWritablePath', () => {
  it.each([`${ROOT}/40_Diary/2026-11-27.md`, `${ROOT}/40_diary/2026-11-27.md`, `${ROOT}/attachments/photo-1795700000000.jpg`, `${ROOT}/attachments/a.PNG`,
    `${ROOT}/30_HumanNetwork/10_People/姓 名.md`,
    `${ROOT}/30_HumanNetwork/40_Places/店.md`,
    `${ROOT}/30_HumanNetwork/15_Schools/学校.md`,
    `${ROOT}/30_HumanNetwork/20_Companies/会社.md`,
    `${ROOT}/30_HumanNetwork/30_Events/2026-01-01_x.md`,
    `${ROOT}/90_Templates/Person Template.md`,
    `${ROOT}/90_Templates/Place Template.md`,
  ])('allows %s', (path) => {
    expect(() => assertWritablePath(ROOT, path)).not.toThrow()
  })

  it.each([
    `${ROOT}/30_HumanNetwork/10_People/sub/a.md`,
    `${ROOT}/30_HumanNetwork/10_People/_a.md`,
    `${ROOT}/30_HumanNetwork/10_People/a.txt`,
    `${ROOT}/30_HumanNetwork/21_Offices/a.md`,
    `${ROOT}/90_Templates/Event Template Own.md`,
    `${ROOT}/a.md`,
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

describe('note names', () => {
  it('accepts normal names', () => {
    expect(noteNameProblem('姓 名')).toBeNull()
    expect(notePath(ROOT, '30_HumanNetwork/10_People', ' 姓 名 ')).toBe(`${ROOT}/30_HumanNetwork/10_People/姓 名.md`)
  })

  it.each(['', '  ', 'a/b', 'a|b', '[[a]]', '_a', '.a', 'a#b'])('rejects %j', (name) => {
    expect(noteNameProblem(name)).not.toBeNull()
  })
})

describe('assertDeletablePath', () => {
  it.each([`${ROOT}/30_HumanNetwork/10_People/姓 名.md`, `${ROOT}/30_HumanNetwork/40_Places/店.md`])('allows %s', (path) => {
    expect(() => assertDeletablePath(ROOT, path)).not.toThrow()
  })

  it.each([`${ROOT}/40_Diary/2026-11-27.md`, `${ROOT}/30_HumanNetwork/30_Events/x.md`, `${ROOT}/90_Templates/Person Template.md`, `${ROOT}/attachments/a.jpg`, `${ROOT}/30_HumanNetwork/10_People/../a.md`])('rejects %s', (path) => {
    expect(() => assertDeletablePath(ROOT, path)).toThrow(UnsafePathError)
  })
})
