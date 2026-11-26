export type TakenAt = { date: string; time: string }

const TAG_EXIF_IFD = 0x8769
const TAG_DATETIME_ORIGINAL = 0x9003
const TAG_DATETIME = 0x0132

function readAscii(view: DataView, offset: number, length: number): string {
  let s = ''
  for (let i = 0; i < length && offset + i < view.byteLength; i++) {
    const c = view.getUint8(offset + i)
    if (c === 0) break
    s += String.fromCharCode(c)
  }
  return s
}

function parseIfd(view: DataView, tiff: number, ifd: number, little: boolean): Map<number, { type: number; count: number; valueOffset: number }> {
  const entries = new Map<number, { type: number; count: number; valueOffset: number }>()
  if (tiff + ifd + 2 > view.byteLength) return entries
  const n = view.getUint16(tiff + ifd, little)
  for (let i = 0; i < n; i++) {
    const at = tiff + ifd + 2 + i * 12
    if (at + 12 > view.byteLength) break
    entries.set(view.getUint16(at, little), { type: view.getUint16(at + 2, little), count: view.getUint32(at + 4, little), valueOffset: at + 8 })
  }
  return entries
}

function asciiValue(view: DataView, tiff: number, entry: { type: number; count: number; valueOffset: number }, little: boolean): string | null {
  if (entry.type !== 2) return null
  const offset = entry.count <= 4 ? entry.valueOffset : tiff + view.getUint32(entry.valueOffset, little)
  return readAscii(view, offset, entry.count)
}

function toTakenAt(raw: string | null): TakenAt | null {
  const m = raw ? /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})/.exec(raw) : null
  if (!m || m[1] === '0000') return null
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` }
}

function readTiff(view: DataView, tiff: number): TakenAt | null {
  const order = view.getUint16(tiff)
  const little = order === 0x4949
  if (!little && order !== 0x4d4d) return null
  const ifd0 = parseIfd(view, tiff, view.getUint32(tiff + 4, little), little)
  const exifPointer = ifd0.get(TAG_EXIF_IFD)
  if (exifPointer) {
    const exif = parseIfd(view, tiff, view.getUint32(exifPointer.valueOffset, little), little)
    const original = exif.get(TAG_DATETIME_ORIGINAL)
    const found = original ? toTakenAt(asciiValue(view, tiff, original, little)) : null
    if (found) return found
  }
  const fallback = ifd0.get(TAG_DATETIME)
  return fallback ? toTakenAt(asciiValue(view, tiff, fallback, little)) : null
}

export function readJpegTakenAt(buffer: ArrayBuffer): TakenAt | null {
  const view = new DataView(buffer)
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null
  let offset = 2
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset)
    if ((marker & 0xff00) !== 0xff00) return null
    const length = view.getUint16(offset + 2)
    if (marker === 0xffe1 && readAscii(view, offset + 4, 4) === 'Exif') {
      try {
        return readTiff(view, offset + 10)
      } catch {
        return null
      }
    }
    if (marker === 0xffda) return null
    offset += 2 + length
  }
  return null
}
