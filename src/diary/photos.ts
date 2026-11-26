import { DropboxError } from '../dropbox/api'
import { ATTACHMENTS_FOLDER } from '../dropbox/guard'
import { resolveVaultRoot, writeVaultFile } from '../dropbox/vault'
import { readJpegTakenAt, type TakenAt } from '../lib/exif'

export const MAX_EDGE = 500
export const JPEG_QUALITY = 0.85
export const GROUP_MINUTES = 30

export type PendingPhoto = {
  id: string
  blob: Blob
  width: number
  height: number
  taken: TakenAt | null
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('この写真は読み込めませんでした'))
    }
    img.src = url
  })
}

export async function preparePhoto(file: File, id: string): Promise<PendingPhoto> {
  const taken = file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name) ? readJpegTakenAt(await file.slice(0, 256 * 1024).arrayBuffer()) : null
  const img = await loadImage(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('写真を縮小できませんでした')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  if (!blob) throw new Error('写真を縮小できませんでした')
  return { id, blob, width, height, taken }
}

function minutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function groupPhotos(photos: PendingPhoto[]): PendingPhoto[][] {
  const timed = photos.filter((p) => p.taken).sort((a, b) => `${a.taken!.date} ${a.taken!.time}`.localeCompare(`${b.taken!.date} ${b.taken!.time}`))
  const groups: PendingPhoto[][] = []
  for (const p of timed) {
    const last = groups[groups.length - 1]?.at(-1)
    const close = last?.taken && last.taken.date === p.taken!.date && minutes(p.taken!.time) - minutes(last.taken.time) <= GROUP_MINUTES
    if (close) groups[groups.length - 1].push(p)
    else groups.push([p])
  }
  return [...groups, ...photos.filter((p) => !p.taken).map((p) => [p])]
}

let lastStamp = 0

function nextStamp(): number {
  lastStamp = Math.max(Date.now(), lastStamp + 1)
  return lastStamp
}

export async function uploadPhoto(photo: PendingPhoto): Promise<string> {
  const root = await resolveVaultRoot()
  for (let attempt = 0; attempt < 3; attempt++) {
    const name = `photo-${nextStamp()}.jpg`
    try {
      await writeVaultFile(`${root}/${ATTACHMENTS_FOLDER}/${name}`, photo.blob, { kind: 'add' })
      return `${ATTACHMENTS_FOLDER}/${name}`
    } catch (e) {
      if (!(e instanceof DropboxError && e.isConflict)) throw e
    }
  }
  throw new Error('写真の保存に失敗しました')
}
