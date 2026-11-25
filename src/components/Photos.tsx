import { useEffect, useRef } from 'react'
import { gsap, Draggable, GRAB, velocityTracker } from '../gsap'
import { sfx } from '../sfx'
import { reducedMotion } from '../settings'

const rand = gsap.utils.random
const clamp = gsap.utils.clamp

/**
 * Stills that drift around a block of text like photos tossed on a desk.
 * Wide screens: they float in the side gutters. Narrow screens: they scatter in a band
 * under the text. Every photo can be grabbed, flung and dropped.
 */
export function Photos({ srcs, bodyRef }: { srcs: string[]; bodyRef: React.RefObject<HTMLDivElement | null> }) {
  const els = useRef<HTMLDivElement[]>([])
  const floats = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const story = body.querySelector<HTMLElement>('.story')
    const drifts: gsap.core.Tween[] = []
    const drags: Draggable[] = []

    const layout = () => {
      const w = body.clientWidth
      const storyH = story?.offsetHeight ?? 400
      const side = w >= 1100
      if (side) {
        body.style.paddingBottom = '40px'
        const gutter = (w - 760) / 2
        const pw = clamp(170, 280, gutter - 50)
        const rows = Math.ceil(srcs.length / 2)
        els.current.forEach((el, i) => {
          const left = i % 2 === 0
          const row = Math.floor(i / 2)
          const ph = pw * (9 / 16) + 16
          const span = Math.max(storyH - ph, 0)
          const y = rows > 1 ? (span * row) / (rows - 1) + rand(-12, 24) : rand(0, 40)
          const x = left ? rand(16, Math.max(20, gutter - pw - 24)) : w - pw - rand(16, Math.max(20, gutter - pw - 24))
          gsap.set(el, { width: pw, x, y, rotation: rand(-9, 9), zIndex: 1 })
        })
      } else {
        const cols = w < 520 ? 2 : 3
        const pw = clamp(120, 240, (w - 40) / cols - 12)
        const ph = pw * (9 / 16) + 14
        const rows = Math.ceil(srcs.length / cols)
        const band = rows * (ph + 26) + 30
        body.style.paddingBottom = `${band}px`
        const top = storyH + 40
        const cellW = (w - 24) / cols
        els.current.forEach((el, i) => {
          const col = i % cols
          const row = Math.floor(i / cols)
          const x = 12 + col * cellW + (cellW - pw) / 2 + rand(-10, 10)
          const y = top + row * (ph + 26) + rand(-8, 8)
          gsap.set(el, { width: pw, x, y, rotation: rand(-8, 8), zIndex: 1 })
        })
      }
      drags.forEach((d) => d.update(true))
    }

    els.current.forEach((el, i) => {
      const fl = floats.current[i]
      if (!reducedMotion()) drifts.push(
        gsap.to(fl, {
          x: rand(-14, 14),
          y: rand(-12, 12),
          rotation: rand(-4, 4),
          duration: rand(2.8, 4.6),
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: rand(0, 1.5),
        }),
      )
      const vt = velocityTracker()
      const rot = gsap.quickTo(el, 'rotation', { duration: 0.5, ease: 'power3.out' })
      const lean = function (this: Draggable) {
        const { vx } = vt.sample(this.x, this.y)
        rot(clamp(-28, 28, vx / 50))
      }
      const settle = () => gsap.to(el, { rotation: rand(-8, 8), duration: 1.2, ease: 'elastic.out(1, 0.75)' })
      const [d] = Draggable.create(el, {
        type: 'x,y',
        bounds: body,
        inertia: true,
        zIndexBoost: true,
        edgeResistance: 0.75,
        ...GRAB,
        onPress(this: Draggable) {
          vt.reset(this.x, this.y)
          sfx.grab(sfx.panOf(this.pointerX))
          gsap.to(fl, { scale: 1.08, duration: 0.3, ease: 'back.out(1.4)' })
        },
        onDrag: lean,
        onThrowUpdate: lean,
        onRelease(this: Draggable) {
          sfx.boing(sfx.panOf(this.pointerX))
          gsap.to(fl, { scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.75)' })
          if (!this.isThrowing) settle()
        },
        onThrowComplete: settle,
      })
      drags.push(d)
    })

    layout()
    // fly in from the text like they were just tossed down
    gsap.from(els.current, {
      scale: 0.3,
      opacity: 0,
      rotation: () => rand(-60, 60),
      duration: 0.9,
      ease: 'back.out(1.25)',
      stagger: 0.08,
      delay: 0.3,
    })
    const ro = new ResizeObserver(() => layout())
    ro.observe(body)
    return () => {
      ro.disconnect()
      drifts.forEach((t) => t.kill())
      drags.forEach((d) => d.kill())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="photos" aria-hidden="true">
      {srcs.map((src, i) => (
        <div
          key={src}
          className="photo"
          ref={(el) => {
            if (el) els.current[i] = el
          }}
        >
          <div
            className="photo-float"
            ref={(el) => {
              if (el) floats.current[i] = el
            }}
          >
            <img src={src} alt="" draggable={false} loading="lazy" />
          </div>
        </div>
      ))}
    </div>
  )
}
