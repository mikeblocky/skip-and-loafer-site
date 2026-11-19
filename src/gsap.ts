import gsap from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'

gsap.registerPlugin(Draggable, InertiaPlugin)

if (import.meta.env.DEV) (window as unknown as { gsap: typeof gsap }).gsap = gsap

/** Tracks px/s velocity from successive samples (works during drag and throw). */
export function velocityTracker() {
  let lx = 0
  let ly = 0
  let lt = 0
  let vx = 0
  let vy = 0
  return {
    reset(x: number, y: number) {
      lx = x
      ly = y
      lt = performance.now()
      vx = vy = 0
    },
    sample(x: number, y: number) {
      const t = performance.now()
      const dt = Math.max(1, t - lt) / 1000
      vx = vx * 0.5 + ((x - lx) / dt) * 0.5
      vy = vy * 0.5 + ((y - ly) / dt) * 0.5
      lx = x
      ly = y
      lt = t
      return { vx, vy }
    },
  }
}

/** the site's own grab hands (see styles/cursors.css), for every Draggable */
export const GRAB = { cursor: 'var(--cur-grab)', activeCursor: 'var(--cur-grabbing)' } as const

export { gsap, Draggable, InertiaPlugin }
