import { gsap } from '../../gsap'
import { CHARACTERS } from '../../data'
import { settings } from '../../settings'
import { clamp, contentBottom, measureSafe, metrics, overlaps, PHONE, phoneSpot, rand, roomyHeight, type Pose, type Rect } from './geometry'

/** a character's element size, by index into CHARACTERS */
type Sizer = (i: number) => { w: number; h: number }
type Spots = readonly { size: number }[]
/**
 * Who's on stage (Settings › Page can leave some off). Only they get real spots, so the ones left
 * off don't hold empty gaps open; the rest get a parked pose (they're invisible anyway) that's
 * there for if they're switched back on before the next scatter.
 */
const cast = () => {
  const off = new Set(settings.get().hiddenChars)
  const on: number[] = []
  const away: number[] = []
  CHARACTERS.forEach((c, i) => (off.has(c.id) ? away : on).push(i))
  return { on, away }
}
const parked = (vw: number, vh: number, w: number, h: number, s: number): Pose => ({
  x: rand(0, vw) - w / 2,
  y: vh - h / 2 + h * s * 0.3,
  scale: s,
  rotation: 0,
})

export interface Homes {
  chars: Pose[]
  icons: Pose[]
}

/**
 * Even scatter by best-candidate sampling: for each object try many random spots outside
 * the content and keep the one farthest from everything already placed. Each object also
 * gets its own depth, so near ones end up bigger than far ones.
 */
export function scatter(icons: Spots, size: Sizer): Homes {
  const { vw, vh, mobile } = metrics()
  if (mobile) return scatterPhone(vw, vh, icons, size)
  const S = measureSafe()
  const safe: Rect = {
    left: S.left - 22,
    right: S.right + 22,
    top: S.top - 18,
    bottom: S.bottom + 18,
  }
  const nav: Rect = {
    left: vw / 2 - 370,
    right: vw / 2 + 370,
    top: 0,
    bottom: 84,
  }
  const placed: { x: number; y: number; r: number }[] = []
  const timer: Rect = { left: vw - 340, right: vw, top: 0, bottom: 76 }
  const blocked = (b: Rect) => overlaps(b, safe) || overlaps(b, nav) || (!mobile && overlaps(b, timer))
  const score = (x: number, y: number, r: number) => {
    let best = Infinity
    for (const p of placed) best = Math.min(best, Math.hypot(x - p.x, y - p.y) - p.r - r)
    // keep some distance from the screen edges too, so the spread reads as even
    const edge = Math.min(x, vw - x, y, vh - y) * 0.6
    return Math.min(best, edge + r)
  }

  // characters and doodles scale with the room around the content, not the screen size alone
  const { on, away } = cast()
  const baseH = Math.min(vh * 0.55, roomyHeight([safe, nav, timer], on.length, 1, 160, 460))
  const unit = clamp(0.7, 1.4, baseH / 330)
  // big things first so the small ones fill around them
  const order = gsap.utils.shuffle(on)
  const chars: Pose[] = []
  away.forEach((i) => {
    const { w, h } = size(i)
    chars[i] = parked(vw, vh, w, h, baseH / h)
  })
  order.forEach((i) => {
    const { w, h } = size(i)
    const depth = rand(0.82, 1.18)
    const s = (baseH * depth) / h
    const vwid = w * s
    const vhgt = h * s
    const r = vhgt * 0.3
    let best: { x: number; y: number } | null = null
    let bestScore = -Infinity
    for (let t = 0; t < 120; t++) {
      const x = rand(vwid * 0.2, vw - vwid * 0.2)
      const y = rand(vhgt * 0.32, vh - vhgt * 0.22)
      const box = {
        left: x - vwid * 0.3,
        right: x + vwid * 0.3,
        top: y - vhgt / 2,
        bottom: y + vhgt / 2,
      }
      if (blocked(box)) continue
      const sc = score(x, y, r)
      if (sc > bestScore) {
        bestScore = sc
        best = { x, y }
      }
    }
    if (!best) {
      // no room around the content: peek up from the bottom edge
      const left = CHARACTERS[i].side === 'left'
      best = {
        x: left ? rand(vwid * 0.4, vw * 0.4) : rand(vw * 0.6, vw - vwid * 0.4),
        y: vh - vhgt * 0.15,
      }
    }
    placed.push({ ...best, r })
    // transform origin is the centre, so the box centre is the visible centre
    chars[i] = {
      x: best.x - w / 2,
      y: best.y - h / 2,
      scale: s,
      rotation: rand(-12, 12),
    }
  })

  const ics: Pose[] = icons.map((ic) => {
    const s = rand(0.65, 1.4) * unit
    const d = ic.size * s
    const r = d * 0.6
    let best: { x: number; y: number } | null = null
    let bestScore = -Infinity
    for (let t = 0; t < 60; t++) {
      const x = rand(d / 2 + 6, vw - d / 2 - 6)
      const y = rand(d / 2 + 6, vh - d / 2 - 6)
      if (
        blocked({
          left: x - d / 2,
          right: x + d / 2,
          top: y - d / 2,
          bottom: y + d / 2,
        })
      )
        continue
      const sc = score(x, y, r)
      if (sc > bestScore) {
        bestScore = sc
        best = { x, y }
      }
    }
    best ??= { x: rand(10, vw - 10), y: rand(vh * 0.8, vh - 10) }
    placed.push({ ...best, r })
    return {
      x: best.x - ic.size / 2,
      y: best.y - ic.size / 2,
      scale: s,
      rotation: rand(-35, 35),
    }
  })

  return { chars, icons: ics }
}

/**
 * Phones: characters peek in from the left and right edges, alternating sides down the screen,
 * and small icons sit around the frame. When the page's content stops short of the bottom
 * (the countdown), the open space underneath gets used too: a few characters stand there and
 * icons scatter across it. Pages that fill that space push them aside (see ./ring).
 */
function scatterPhone(vw: number, vh: number, icons: Spots, size: Sizer): Homes {
  const placed: { x: number; y: number; r: number }[] = []
  const top = 124 // below the bookmark tabs
  const bottom = vh - 8
  const G = PHONE.gutter
  const span = vw - G - PHONE.soundCorner

  const below = Math.min(vh, contentBottom() + 18)
  const roomy = vh - below > 160
  const free: Rect | null = roomy ? { left: G, right: vw - G, top: below, bottom: vh - PHONE.bottomBand } : null

  // the content column (down to where the content ends) is taken; the rest is the cast's
  const column: Rect = { left: G, right: vw - G, top, bottom: below }
  const { on, away } = cast()
  const baseH = Math.min(vh * 0.3, roomyHeight([column], on.length, 1.15, 110, 240))
  const unit = clamp(0.8, 1.3, baseH / 190)
  const chars: Pose[] = []
  away.forEach((i) => {
    const { w, h } = size(i)
    chars[i] = parked(vw, vh, w, h, baseH / h)
  })
  const all = gsap.utils.shuffle(on)

  // bottom row: with room, a few stand in the open space (feet just off screen);
  // without, a couple peek up from the bottom edge (head and shoulders)
  const nBottom = all.length < 5 ? 0 : roomy ? (span >= 260 ? 3 : 2) : span >= 260 ? 2 : span >= 150 ? 1 : 0
  all.slice(0, nBottom).forEach((i, k) => {
    const { w, h } = size(i)
    const tall = roomy ? Math.min(260, (vh - below) / 0.92) : baseH
    const s = (tall * rand(0.82, 0.95)) / h
    const vhgt = h * s
    const body = w * s * 0.6
    const x = G + (span * (k + 0.5)) / nBottom + rand(-span, span) * 0.05
    const shown = roomy ? rand(0.86, 0.92) : rand(0.36, 0.42)
    const y = vh + vhgt * 0.5 - vhgt * shown
    placed.push({ x, y: vh - (vhgt * shown) / 2, r: body * 0.55 })
    chars[i] = { x: x - w / 2, y: y - h / 2, scale: s, rotation: rand(-5, 5) }
  })

  // the rest: spread evenly down both edges, mostly off screen, leaning in
  const order = all.slice(nBottom)
  const perSide = Math.ceil(order.length / 2)
  order.forEach((i, k) => {
    const left = k % 2 === 0
    const slot = Math.floor(k / 2)
    const { w, h } = size(i)
    const s = (baseH * rand(0.88, 1.12)) / h
    const vhgt = h * s
    const body = w * s * 0.6
    // evenly spaced slots per side, the two sides offset by half a slot so they interleave
    const step = (bottom - top - vhgt * 0.5) / perSide
    const y = top + vhgt * 0.45 + step * (slot + (left ? 0.15 : 0.65)) + rand(-step, step) * 0.12
    const x = left ? body * rand(-0.08, 0.06) : vw - body * rand(-0.08, 0.06)
    placed.push({ x, y, r: body * 0.5 })
    chars[i] = {
      x: x - w / 2,
      y: y - h / 2,
      scale: s,
      rotation: left ? rand(4, 12) : rand(-12, -4),
    }
  })

  // icons: small, around the frame and across any open space, as far apart as possible
  const ics: Pose[] = icons.map((ic) => {
    const s = rand(0.55, 0.85) * unit
    const d = ic.size * s
    const r = d * 0.6
    let best: { x: number; y: number } | null = null
    let bestScore = -Infinity
    for (let t = 0; t < 100; t++) {
      const { x, y } = phoneSpot(vw, vh, d, free)
      let sc = Infinity
      for (const p of placed) sc = Math.min(sc, Math.hypot(x - p.x, y - p.y) - p.r - r)
      if (sc > bestScore) {
        bestScore = sc
        best = { x, y }
      }
    }
    placed.push({ ...best!, r })
    return {
      x: best!.x - ic.size / 2,
      y: best!.y - ic.size / 2,
      scale: s,
      rotation: rand(-30, 30),
    }
  })

  return { chars, icons: ics }
}
