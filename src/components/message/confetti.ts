import { gsap } from '../../gsap'
import { C } from '../../data'
import { reduced } from './geometry'

const COLORS = [C.pink, C.yellow, C.blue, C.green, C.orange, C.violet]

let layer: HTMLDivElement | null = null
/** One fixed sheet over the page that every burst draws on, so pieces stay put while the post moves. */
function getLayer() {
  if (layer?.isConnected) return layer
  layer = document.createElement('div')
  layer.className = 'fx-layer'
  layer.setAttribute('aria-hidden', 'true')
  document.body.appendChild(layer)
  return layer
}

export interface Burst {
  /** how many pieces */
  n?: number
  /** the direction they head off in, degrees (0 = right, -90 = up) */
  angle?: number
  /** how wide the fan is, degrees */
  spread?: number
  /** how far they travel, px */
  reach?: number
  /** piece size, px */
  size?: number
  /** how far they fall at the end, px */
  fall?: number
  duration?: number
  colors?: string[]
  /** 'mix' is paper confetti; 'dot' only round bits (sparkle trails, wax crumbs) */
  shape?: 'mix' | 'dot'
}

/** Throws a handful of paper bits out from a point on screen; they flutter, drop and fade. */
export function confetti(x: number, y: number, o: Burst = {}) {
  if (reduced()) return
  const { n = 14, angle = -90, spread = 120, reach = 90, size = 7, fall = 40, duration = 1.1, colors = COLORS, shape = 'mix' } = o
  const root = getLayer()
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i')
    const s = size * gsap.utils.random(0.6, 1.25)
    const round = shape === 'dot' || Math.random() < 0.3
    el.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${round ? s : s * 0.55}px;background:${
      colors[i % colors.length]
    };border-radius:${round ? '50%' : '1.5px'}`
    root.appendChild(el)
    const a = ((angle + gsap.utils.random(-spread / 2, spread / 2)) * Math.PI) / 180
    const d = reach * gsap.utils.random(0.45, 1)
    const dx = Math.cos(a) * d
    const dy = Math.sin(a) * d
    const t = duration * gsap.utils.random(0.8, 1.2)
    gsap.set(el, { xPercent: -50, yPercent: -50, rotation: gsap.utils.random(0, 360) })
    gsap.to(el, { x: dx, duration: t, ease: 'power3.out' })
    // out fast, then gravity takes over
    gsap.to(el, { keyframes: { y: [0, dy, dy + fall], easeEach: 'power2.out' }, duration: t, ease: 'none' })
    gsap.to(el, {
      rotation: `+=${gsap.utils.random(-540, 540)}`,
      // paper flips as it falls
      scaleX: () => (round ? 1 : gsap.utils.random(-1, 1)),
      duration: t,
      ease: 'power1.out',
    })
    gsap.to(el, { autoAlpha: 0, duration: t * 0.35, delay: t * 0.65, ease: 'power1.in', onComplete: () => el.remove() })
  }
}

/** The middle of an element on screen. */
export const centre = (el: Element) => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }
}
