import { PIC_MAX_BYTES, PIC_MAX_EDGE, sniffImage } from '../../santa'
import { clientId } from '../message/mail'
import { santaApi } from './season'

/** Getting a picture ready for a letter, in the browser, before anything is uploaded: */
export interface Picture {
  blob: Blob
  w: number
  h: number
  /** an object URL for the preview; revoke it when done */
  url: string
}

const NOT_A_PICTURE = 'that file isn’t a picture we can use'
const TOO_BIG = 'that picture is too big'

const encode = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob | null>((done) => c.toBlob(done, type, q))

async function decode(file: Blob): Promise<{ draw: CanvasImageSource; w: number; h: number; close(): void }> {
  try {
    const b = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { draw: b, w: b.width, h: b.height, close: () => b.close() }
  } catch {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.src = url
    try {
      await img.decode()
    } catch {
      URL.revokeObjectURL(url)
      throw new Error(NOT_A_PICTURE)
    }
    return { draw: img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
  }
}

export async function preparePicture(file: File): Promise<Picture> {
  if (file.size > 40 * 1024 * 1024) throw new Error(TOO_BIG)
  const type = sniffImage(new Uint8Array(await file.slice(0, 16).arrayBuffer()))
  if (!type) throw new Error(NOT_A_PICTURE)

  const src = await decode(file)
  if (!src.w || !src.h) {
    src.close()
    throw new Error(NOT_A_PICTURE)
  }

  if (type === 'image/gif') {
    src.close()
    if (file.size > PIC_MAX_BYTES) throw new Error(TOO_BIG)
    return { blob: file, w: src.w, h: src.h, url: URL.createObjectURL(file) }
  }

  const k = Math.min(1, PIC_MAX_EDGE / Math.max(src.w, src.h))
  const w = Math.max(1, Math.round(src.w * k))
  const h = Math.max(1, Math.round(src.h * k))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src.draw, 0, 0, w, h)
  src.close()

  let best = await encode(c, 'image/webp', 0.9)
  if (!best || best.type !== 'image/webp') {
    // no WebP writer here: PNG keeps transparency, everything else goes JPEG (on white)
    if (type === 'image/png') best = await encode(c, 'image/png')
    else {
      ctx.globalCompositeOperation = 'destination-over'
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, w, h)
      best = await encode(c, 'image/jpeg', 0.9)
    }
  } else if (type === 'image/png') {
    const png = await encode(c, 'image/png')
    if (png && png.size < best.size) best = png
  }
  // a very busy picture can still be big: step the quality down a little until it fits
  for (const q of [0.82, 0.74]) {
    if (!best || best.size <= PIC_MAX_BYTES) break
    best = await encode(c, best.type === 'image/png' ? 'image/webp' : best.type, q)
  }
  if (!best || best.size > PIC_MAX_BYTES) throw new Error(TOO_BIG)
  return { blob: best, w, h, url: URL.createObjectURL(best) }
}

/** sends the prepared bytes; the answer is the id a letter refers to */
export const uploadPicture = (p: Picture) =>
  santaApi<{ pic: string }>(
    { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'x-santa-me': clientId() }, body: p.blob },
    '?upload',
  ).then((d) => d.pic)

/** warm the browser cache so a flipped letter's picture is already there */
const warmed = new Set<string>()
export function warm(url: string | undefined) {
  if (!url || warmed.has(url)) return
  warmed.add(url)
  const i = new Image()
  i.decoding = 'async'
  i.src = url
}
