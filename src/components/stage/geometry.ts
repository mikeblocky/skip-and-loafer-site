import { gsap } from '../../gsap'

export interface Pose {
  x: number
  y: number
  scale: number
  rotation: number
}

export interface Rect {
  left: number
  right: number
  top: number
  bottom: number
}

export const rand = gsap.utils.random
export const clamp = gsap.utils.clamp

export function metrics() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const mobile = vw < 760
  // element box height; the visible size comes from each pose's scale
  const H = mobile ? 300 : 640
  return { vw, vh, mobile, H }
}

/**
 * Resting boxes of the page's protected content. By default everything marked data-safe;
 * pass a narrower selector (e.g. just the headings) to measure only those.
 */
export function measureSafeRects(selector = '.view [data-safe]'): Rect[] {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).map((el) => {
    // undo any in-flight intro transform so the box is where the element will rest
    const b = el.getBoundingClientRect()
    const ty = gsap.getProperty(el, 'y') as number
    const sc = (gsap.getProperty(el, 'scale') as number) || 1
    const w = b.width / sc
    const h = b.height / sc
    const cx = b.left + b.width / 2
    const cy = b.top + b.height / 2 - ty
    return { left: cx - w / 2, right: cx + w / 2, top: cy - h / 2, bottom: cy + h / 2 }
  })
}

/** Bounding box of the page's central content. Nothing lands inside it. */
export function measureSafe(): Rect {
  const { vw, vh } = metrics()
  const rects = measureSafeRects()
  if (!rects.length) return { left: vw * 0.3, right: vw * 0.7, top: vh * 0.25, bottom: vh * 0.7 }
  return rects.reduce((r, b) => ({
    left: Math.min(r.left, b.left),
    right: Math.max(r.right, b.right),
    top: Math.min(r.top, b.top),
    bottom: Math.max(r.bottom, b.bottom),
  }))
}

export const overlaps = (a: Rect, b: Rect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top

/** The frame of free space around a phone screen's content, where icons may live. */
export const PHONE = { gutter: 40, topBand: [118, 150] as const, bottomBand: 46, soundCorner: 74 }

/**
 * A random spot on that frame, or in the open area below the page's content (`free`), picked
 * in proportion to each region's size so they all fill evenly.
 */
export const phoneSpot = (vw: number, vh: number, d: number, free: Rect | null) => {
  const { gutter: G, topBand, bottomBand: B, soundCorner } = PHONE
  const sideLen = vh - topBand[0] - 8
  const bandLen = vw - 2 * G
  // the open area counts by its area, measured in strip-thickness units like the strips
  const freeLen = free ? ((free.right - free.left) * (free.bottom - free.top)) / G : 0
  const pick = Math.random() * (2 * sideLen + 2 * bandLen + freeLen)
  const pad = d / 2 + 4
  if (pick < sideLen) return { x: rand(pad, G), y: rand(topBand[0], vh - pad) }
  if (pick < 2 * sideLen) return { x: rand(vw - G, vw - pad), y: rand(topBand[0], vh - soundCorner) }
  if (pick < 2 * sideLen + bandLen) return { x: rand(G, vw - G), y: rand(topBand[0] + d / 2, Math.max(topBand[0] + d / 2, topBand[1] - d / 2)) }
  if (pick < 2 * sideLen + 2 * bandLen || !free) return { x: rand(G, vw - soundCorner), y: rand(vh - B, vh - pad) }
  return { x: rand(free.left + pad, free.right - pad), y: rand(free.top + pad, free.bottom - pad) }
}

/** Is this centre point on the phone frame (not in the content column)? */
export const onPhoneFrame = (x: number, y: number, vw: number, vh: number) =>
  x < PHONE.gutter || x > vw - PHONE.gutter || (y > PHONE.topBand[0] && y < PHONE.topBand[1]) || y > vh - PHONE.bottomBand

/** Where the page's content ends on screen (resting positions), so the space below can be used. */
export const contentBottom = () => {
  const rects = measureSafeRects('.view > *')
  return rects.length ? Math.max(...rects.map((r) => r.bottom)) : window.innerHeight
}
