/**
 * Secret Santa part 2 picks the site up like a snow globe: it tips it, rocks it, and at one
 * point turns it right over.
 */
import { gsap } from './gsap'
import { reducedMotion } from './settings'

const root = () => document.documentElement
/** the site's angle, and the extra turn the people and pop-ups make to stay upright */
const a = { t: 0, spin: 0 }
let goal = 0
let rock: gsap.core.Tween | null = null
let main: gsap.core.Timeline | null = null

/** the layers of the site that turn with it, as one sheet */
const LAYERS = '.content, .bookmarks, .wordmark, .stage, .timer, .settings-toggle, .news-toggle, .qd-snow.is-page'

/**
 * Turn every layer round the middle of the screen, not its own middle, so a strip along the top
 * ends up along the bottom when the site's turned over. A pivot is given in the element's own
 * untransformed box, so it's the screen's middle minus where that box sits (its GSAP transform
 * doesn't come into it).
 */
function pivot(on: boolean) {
  const W = window.innerWidth
  const H = window.innerHeight
  document.querySelectorAll<HTMLElement>(LAYERS).forEach((el) => {
    if (!on) return void (el.style.transformOrigin = '')
    let x = 0
    let y = 0
    const fixed = getComputedStyle(el).position === 'fixed'
    for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) {
      x += n.offsetLeft
      y += n.offsetTop
    }
    if (!fixed) {
      x -= window.scrollX
      y -= window.scrollY
    }
    el.style.transformOrigin = `${W / 2 - x}px ${H / 2 - y}px`
  })
}
export const repivot = () => goal !== 0 && pivot(true)

function paint() {
  const el = root()
  el.style.setProperty('--q2-tilt', `${a.t}deg`)
  el.style.setProperty('--q2-lean', `${a.t + a.spin}deg`)
}

const flipped = (deg: number) => Math.abs(deg) > 90

/** lean the site to `deg` (0 rights it, 180 turns it over); `sway` rocks it either side */
export function tilt(deg: number, sway = 0, quick = false) {
  const el = root()
  const calm = reducedMotion()
  // less motion: a gentle lean, no rocking, no falling (turned over still turns over: it's the story)
  const to = calm && !flipped(deg) ? deg * 0.4 : deg
  rock?.kill()
  rock = null
  main?.kill()
  if (deg !== 0) pivot(true)
  el.classList.toggle('q2-tilted', deg !== 0 || a.t !== 0)
  el.classList.toggle('q2-flipped', flipped(deg))
  const wasOver = flipped(goal)
  const nowOver = flipped(to)
  goal = to
  // where the extra turn ends: upright people on an upside-down site turn half a circle back
  const spinTo = nowOver ? -Math.sign(to) * 180 : 0

  if (quick || calm || (to === a.t && a.spin === spinTo)) {
    a.t = to
    a.spin = spinTo
    paint()
    settled(to)
    fall(to, true)
  } else if (!wasOver && nowOver) {
    // over it goes: everything turns together, lands, everything loose falls, then the
    // people (and the talk box) turn themselves back the right way up
    main = gsap
      .timeline({ onUpdate: paint })
      .to(a, { t: to, duration: 1.5, ease: 'back.inOut(1.4)' })
      .call(() => fall(to))
      // carry on round the same way: upside down plus another half turn is the right way up
      .to(a, { spin: to, duration: 0.9, ease: 'back.out(1.6)' }, '>0.6')
      .call(() => {
        // a whole turn is no turn: settle on the same angle, a full turn back, so it unwinds later
        a.spin = spinTo
        paint()
      })
  } else if (wasOver && !nowOver) {
    // and back: the site and the extra turn unwind together, so the people barely move
    main = gsap
      .timeline({ onUpdate: paint, onComplete: () => settled(to) })
      .to(a, { t: to, spin: 0, duration: 1.5, ease: 'back.inOut(1.4)' })
      .call(() => fall(to))
  } else {
    main = gsap
      .timeline({ onUpdate: paint, onComplete: () => settled(to) })
      .to(a, { t: to, spin: spinTo, duration: 1.6, ease: 'elastic.out(1, 0.35)' })
      .call(() => fall(to), [], 0.25)
  }

  if (sway && !calm) {
    rock = gsap.fromTo(
      a,
      { t: to - sway },
      { t: to + sway, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: quick ? 0 : 2.4, onUpdate: paint, immediateRender: false },
    )
  }
}

/** set straight: the layers go back to turning round their own middles (nothing's turned now) */
function settled(to: number) {
  if (to !== 0) return
  root().classList.remove('q2-tilted')
  pivot(false)
}

/** a sudden lurch on top of the lean (a jolt that settles back) */
export function jolt(by = 6) {
  if (reducedMotion()) return
  rock?.pause()
  gsap.fromTo(a, { t: goal + by }, { t: goal, duration: 1.2, ease: 'elastic.out(1.2, 0.3)', onUpdate: paint, onComplete: () => void rock?.resume() })
}

export const tiltNow = () => goal

// ── gravity ──────────────────────────────────────────────────────────────

/** a steady random number per element, so a heap lands the same way each time it's laid out */
const seed = new WeakMap<Element, number>()
const rand = (el: Element) => {
  let v = seed.get(el)
  if (v === undefined) seed.set(el, (v = Math.random()))
  return v
}

/**
 * Drop everything loose on the stage towards whatever is down right now. The stage turns with
 * the site, so "down" on the screen is (sin θ, cos θ) in the stage's own coordinates.
 */
export function fall(deg = goal, quick = false) {
  const items = Array.from(document.querySelectorAll<HTMLElement>('.stage > .floaty:not(.is-off), .stage > .char:not(.is-off)'))
  if (!items.length) return
  const W = window.innerWidth
  const H = window.innerHeight
  const rad = (deg * Math.PI) / 180
  const over = flipped(deg)
  const level = deg === 0
  const calm = reducedMotion()
  // the slope along the floor: how far towards the low side things slide, as a share of the way
  const slope = over ? Math.sin(rad) * -1 : Math.sin(rad)
  const share = Math.min(0.8, Math.abs((over ? deg - Math.sign(deg) * 180 : deg) / 7))
  items.forEach((el, i) => {
    const inner = el.firstElementChild as HTMLElement | null
    if (level || calm) {
      gsap.to(el, { '--q2-fx': '0px', '--q2-fy': '0px', duration: quick || calm ? 0 : 1.2, ease: 'back.out(1.2)', delay: quick ? 0 : (i % 12) * 0.04 })
      if (inner) gsap.to(inner, { '--q2-fr': '0deg', duration: quick || calm ? 0 : 1, ease: 'back.out(1.4)', delay: quick ? 0 : (i % 12) * 0.04 })
      return
    }
    const x = Number(gsap.getProperty(el, 'x')) || 0
    const y = Number(gsap.getProperty(el, 'y')) || 0
    // the stage scales things round their middles: work with what's actually seen
    const s = Number(gsap.getProperty(el, 'scale')) || 1
    const w = el.offsetWidth
    const h = el.offsetHeight
    const r = rand(el)
    const person = el.classList.contains('char')
    // land on the floor, in a loose heap (doodles pile higher than people)
    const heap = person ? r * h * s * 0.05 : r * Math.min(H * 0.16, 160)
    const ty = over ? heap - (h * (1 - s)) / 2 : H - heap - (h * (1 + s)) / 2
    // slide downhill along the floor, part of the way to the wall, some further than others
    const low = slope < 0 ? -(w * (1 - s)) / 2 : W - (w * (1 + s)) / 2
    const tx = x + (low - x) * share * (0.55 + r * 0.45)
    // doodles tumble; people stay standing, and turned over they flip to land on their feet
    // doodles tumble; people turn over with the site, and land head-first
    const turn = person ? 0 : (r - 0.5) * 140
    const t = quick ? 0 : 0.55 + r * 0.45
    const d = quick ? 0 : 0.05 + (i % 16) * 0.035
    gsap.to(el, { '--q2-fx': `${tx - x}px`, duration: t * 1.4, ease: 'power2.out', delay: d + t * 0.4 })
    gsap.to(el, { '--q2-fy': `${ty - y}px`, duration: t, ease: 'bounce.out', delay: d })
    if (inner) gsap.to(inner, { '--q2-fr': `${turn}deg`, duration: t * 1.2, ease: 'power2.out', delay: d })
  })
}

/** the stage was laid out again (a new page): drop things where they are now */
export const refall = () => {
  if (goal === 0) return
  pivot(true)
  fall(goal, false)
}

// a new window size moves the middle of the screen, and the floor
let resizing = 0
window.addEventListener('resize', () => {
  clearTimeout(resizing)
  resizing = window.setTimeout(refall, 200)
})
