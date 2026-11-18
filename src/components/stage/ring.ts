import { measureSafeRects, onPhoneFrame, overlaps, rand, type Rect } from './geometry'

export interface Item {
  el: HTMLElement
  /** resting top-left (gsap x/y) before this page's adjustments */
  x: number
  y: number
  w: number
  h: number
  /** visible size: characters are mostly transparent at the sides */
  vw: number
  vh: number
}

/**
 * Anything covering a header (or other protected content) steps to the nearest free spot
 * around where it was, keeping a little room from its neighbours, so things spread out
 * locally on every side instead of all gathering in one place.
 */
export function ringAroundHeaders(items: Item[], vw: number, vh: number, mobile: boolean) {
  const out = new Map<HTMLElement, { x: number; y: number }>()
  // clearance is wider than the idle bob (±12px plus a little tilt), so floating never drifts onto text
  const PAD = 22
  // only text (titles and hints) pushes things away; cards, the clock and the TVs are drawn
  // above the stage, so something standing behind them is fine and shouldn't be shuffled
  const safes = measureSafeRects('.view :is(h1, h2, p)[data-safe]').map((r) => ({
    left: r.left - PAD,
    right: r.right + PAD,
    top: r.top - PAD,
    bottom: r.bottom + PAD,
  }))
  if (!safes.length) return out
  // small icons also shouldn't land hidden behind the page's other content
  const solid = measureSafeRects('.view [data-safe]:not(:is(h1, h2, p))')
  const hidden = (r: Rect) => solid.some((s) => overlaps(r, s))
  const nav: Rect = { left: vw / 2 - 370, right: vw / 2 + 370, top: 0, bottom: 84 }
  const timer: Rect = { left: vw - 340, right: vw, top: 0, bottom: 76 }
  const box = (cx: number, cy: number, it: Item): Rect => ({
    left: cx - it.vw / 2,
    right: cx + it.vw / 2,
    top: cy - it.vh / 2,
    bottom: cy + it.vh / 2,
  })
  const centre = (it: Item) => ({ x: it.x + it.w / 2, y: it.y + it.h / 2 })
  const radius = (it: Item) => Math.max(it.vw, it.vh) * 0.5
  const covering = (r: Rect) => safes.find((s) => overlaps(r, s))

  // Phones: things standing in the middle column (the countdown's open space below its content)
  // step aside when this page's content reaches down there. Characters sink to peek up from the
  // bottom edge at the same spot; icons move out to the frame like header-covering ones.
  const blocks = mobile ? measureSafeRects('.view > *').map((r) => ({ left: r.left - 6, right: r.right + 6, top: r.top - 6, bottom: r.bottom + 6 })) : []
  const onContent = (r: Rect) => blocks.some((b) => overlaps(r, b))
  const midColumn = (it: Item) => {
    const c = centre(it)
    return !onPhoneFrame(c.x, c.y, vw, vh)
  }
  const isChar = (it: Item) => (mobile ? it.vh > 90 : it.vh > 200)
  if (mobile) {
    items.forEach((it) => {
      if (!isChar(it) || !midColumn(it)) return
      const c = centre(it)
      if (!onContent(box(c.x, c.y, it))) return
      const yc = vh + it.vh * 0.5 - it.vh * 0.4
      out.set(it.el, { x: it.x, y: yc - it.h / 2 })
    })
  }

  const moving = items.filter((it) => {
    // on phones the characters are handled above (edges stay put, the bottom row sinks)
    if (mobile && isChar(it)) return false
    const c = centre(it)
    const b = box(c.x, c.y, it)
    return covering(b) || (mobile && midColumn(it) && onContent(b))
  })
  const placed = items
    .filter((it) => !moving.includes(it))
    .map((it) => {
      const t = out.get(it.el)
      return t ? { x: t.x + it.w / 2, y: t.y + it.h / 2, r: radius(it) } : { ...centre(it), r: radius(it) }
    })

  // big things first so the small ones fill in around them
  moving.sort((a, b) => b.vw * b.vh - a.vw * a.vh)
  moving.forEach((it) => {
    const from = centre(it)
    const r = radius(it)
    const big = it.vh > 200
    const free = (x: number, y: number) => {
      const b = box(x, y, it)
      const inView = big ? x > 0 && x < vw && y > 0 && y < vh : b.left > 4 && b.right < vw - 4 && b.top > 4 && b.bottom < vh - 4
      // phones: icons only move around the frame (gutters, top and bottom bands), never into the content column
      const inGutter = !mobile || onPhoneFrame(x, y, vw, vh)
      return inView && inGutter && !covering(b) && !(!big && hidden(b)) && !overlaps(b, nav) && !(!mobile && overlaps(b, timer))
    }
    const room = (x: number, y: number) => {
      let sc = Infinity
      for (const p of placed) sc = Math.min(sc, Math.hypot(x - p.x, y - p.y) - p.r - r)
      return sc
    }
    // search rings of growing radius around its own spot for the closest free place with room
    const GAP = big ? 0 : 14
    let best: { x: number; y: number } | null = null
    let fallback: { x: number; y: number; room: number } | null = null
    for (let dist = 24; dist < Math.max(vw, vh) && !best; dist += 18) {
      const tries = Math.ceil((2 * Math.PI * dist) / 22)
      const offset = rand(0, Math.PI * 2)
      let ringBest: { x: number; y: number; room: number } | null = null
      for (let t = 0; t < tries; t++) {
        const a = offset + (t / tries) * Math.PI * 2
        const x = from.x + Math.cos(a) * dist
        const y = from.y + Math.sin(a) * dist
        if (!free(x, y)) continue
        const rm = room(x, y)
        if (!fallback || rm > fallback.room) fallback = { x, y, room: rm }
        if (rm >= GAP && (!ringBest || rm > ringBest.room)) ringBest = { x, y, room: rm }
      }
      if (ringBest) best = ringBest
    }
    best ??= fallback
    if (!best) return // nowhere free at all: leave it be
    placed.push({ x: best.x, y: best.y, r })
    out.set(it.el, { x: best.x - it.w / 2, y: best.y - it.h / 2 })
  })
  return out
}
