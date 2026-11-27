import { describe, expect, it } from 'vitest'
import { extraBlocks } from './extras'
import { newDiaryText } from './markdown'

describe('extraBlocks', () => {
  it('ignores the app sections and an empty template', () => {
    expect(extraBlocks(newDiaryText('2026-11-27'))).toEqual([])
  })

  it('keeps free text and photos outside the app sections', () => {
    const text = ['---', 'type: diary', '---', 'メモ', '', '## 📝 今日の一言', '- 楽しかった', '', '## 振り返り', '- 早く寝る', '![[attachments/a.jpg]]', ''].join('\n')
    expect(extraBlocks(text)).toEqual([
      { heading: null, lines: ['メモ'], photos: [] },
      { heading: '振り返り', lines: ['- 早く寝る'], photos: ['attachments/a.jpg'] },
    ])
  })
})
