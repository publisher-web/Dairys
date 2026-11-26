import { describe, expect, it } from 'vitest'
import { readJpegTakenAt } from './exif'

function u16(v: number, little: boolean): number[] {
  return little ? [v & 0xff, v >> 8] : [v >> 8, v & 0xff]
}

function u32(v: number, little: boolean): number[] {
  const b = [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff]
  return little ? b.reverse() : b
}

function ascii(s: string): number[] {
  return [...s].map((c) => c.charCodeAt(0))
}

function jpegWithExif(dateTime: string, little: boolean, useOriginal = true): ArrayBuffer {
  const value = [...ascii(dateTime), 0]
  const ifd0Offset = 8
  const ifd0Size = 2 + 12 + 4
  const exifOffset = ifd0Offset + ifd0Size
  const exifSize = 2 + 12 + 4
  const valueOffset = exifOffset + exifSize
  const tiff = [
    ...(little ? ascii('II') : ascii('MM')),
    ...u16(42, little),
    ...u32(ifd0Offset, little),
    ...u16(1, little),
    ...(useOriginal ? [...u16(0x8769, little), ...u16(4, little), ...u32(1, little), ...u32(exifOffset, little)] : [...u16(0x0132, little), ...u16(2, little), ...u32(value.length, little), ...u32(valueOffset, little)]),
    ...u32(0, little),
    ...u16(1, little),
    ...u16(0x9003, little),
    ...u16(2, little),
    ...u32(value.length, little),
    ...u32(valueOffset, little),
    ...u32(0, little),
    ...value,
  ]
  const app1 = [...ascii('Exif'), 0, 0, ...tiff]
  const bytes = [0xff, 0xd8, 0xff, 0xe1, ...u16(app1.length + 2, false), ...app1, 0xff, 0xda, 0, 2, 0xff, 0xd9]
  return new Uint8Array(bytes).buffer
}

describe('readJpegTakenAt', () => {
  it('reads DateTimeOriginal in big endian', () => {
    expect(readJpegTakenAt(jpegWithExif('2026:11:27 18:45:12', false))).toEqual({ date: '2026-11-27', time: '18:45' })
  })

  it('reads DateTimeOriginal in little endian', () => {
    expect(readJpegTakenAt(jpegWithExif('2026:01:02 07:05:00', true))).toEqual({ date: '2026-01-02', time: '07:05' })
  })

  it('falls back to DateTime in IFD0', () => {
    expect(readJpegTakenAt(jpegWithExif('2025:12:31 23:59:59', false, false))).toEqual({ date: '2025-12-31', time: '23:59' })
  })

  it('returns null for non-JPEG or missing EXIF', () => {
    expect(readJpegTakenAt(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBeNull()
    expect(readJpegTakenAt(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]).buffer)).toBeNull()
  })

  it('ignores zeroed dates', () => {
    expect(readJpegTakenAt(jpegWithExif('0000:00:00 00:00:00', false))).toBeNull()
  })
})
