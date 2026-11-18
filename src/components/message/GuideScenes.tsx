import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { gsap } from '../../gsap'
import { C } from '../../data'
import { Icon } from '../../icons'
import { reduced } from './geometry'

// where each face sits in the character art (fractions of the image), for round avatars
export const FACES = {
  mitsumi: { src: '/characters/mitsumi.png', x: 0.54, y: 0.105 },
  shima: { src: '/characters/shima.png', x: 0.47, y: 0.085 },
  yuzuki: { src: '/characters/yuzuki.png', x: 0.51, y: 0.12 },
  mika: { src: '/characters/mika.png', x: 0.49, y: 0.13 },
} as const

/** Head-and-shoulders crop of a character, for the step scenes. */
export const bust = (who: keyof typeof FACES): CSSProperties => ({
  backgroundImage: `url(${FACES[who].src})`,
  backgroundPosition: `${((FACES[who].x * 1.5 - 0.5) / 0.5) * 100}% 0`,
})

/** The sealed envelope from step 2, small: the same pink, flap outline and seal. */
export function MiniMail() {
  return (
    <svg className="mini-mail" viewBox="0 0 84 52" aria-hidden="true">
      <rect width="84" height="52" rx="6" fill={C.pink} />
      <path d="M0 0 H84 L45 27 Q42 29 39 27 Z" fill="#ff5aa8" stroke="#fff" strokeWidth="3" strokeLinejoin="round" paintOrder="stroke" />
      <circle cx="42" cy="26" r="8" fill={C.yellow} />
      <circle cx="42" cy="26" r="5" fill="none" stroke="#fff" strokeWidth="1.6" />
    </svg>
  )
}

/** A small tin mailbox with a door and a flag, drawn in CSS. */
export function MiniBox({ className }: { className: string }) {
  return (
    <span className={`mm ${className}`}>
      <i className="mm-pole" />
      <i className="mm-body">
        <i className="mm-hole" />
        <i className="mm-door" />
      </i>
      <i className="mm-flag" />
    </span>
  )
}

const GOOD = [
  { icon: 'book', color: C.blue, text: 'a scene or chapter you love' },
  { icon: 'star', color: C.amber, text: 'your favourite character and why' },
  { icon: 'sun', color: C.orange, text: 'something kind for whoever reads it' },
  { icon: 'film', color: C.violet, text: 'a manga or anime you’d recommend' },
] as const
const BAD = [
  { icon: 'bubble', text: 'real names, socials, phone numbers or addresses' },
  { icon: 'arrow', text: 'links or ads' },
  { icon: 'book', text: 'spoilers for new chapters without a warning' },
  { icon: 'heartbreak', text: 'anything mean, hateful or adult' },
] as const

/** Runs a looping scene timeline inside a box; stills it on a telling frame for reduced motion. */
function useLoop(build: (q: (s: string) => HTMLElement[], tl: gsap.core.Timeline) => void) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1 })
      build(gsap.utils.selector(el) as (s: string) => HTMLElement[], tl)
      if (reduced()) tl.progress(0.8).pause()
    }, el)
    return () => ctx.revert()
  }, [])
  return ref
}

// where each good thing lands on the letter (top-left inside the scene's 272px stage)
const SLOTS = [
  [122, 22],
  [170, 22],
  [122, 56],
  [170, 56],
]

/** Yuzuki's letter: each good thing flies in, lands on the page and gets a tick. */
export function GoodBox() {
  const ref = useLoop((q, tl) => {
    const tiles = q('.gb-tile')
    const ticks = q('.gb-tick')
    const marks = q('.gd-mark')
    const chips = q('.gd-chips li')
    const [bust] = q('.gd-bust')
    gsap.set(tiles, { x: 150, y: -30, rotation: 30, scale: 0.6, autoAlpha: 0 })
    gsap.set([...ticks, ...marks, ...q('.gb-heart')], { scale: 0 })
    tiles.forEach((t, i) => {
      const at = 0.2 + i * 1.05
      tl.set(t, { autoAlpha: 1 }, at)
      tl.to(t, { x: 0, rotation: 0, scale: 1, duration: 0.7, ease: 'power1.out' }, at)
      tl.to(t, { keyframes: { y: [-30, -50, 0], easeEach: 'sine.inOut' }, duration: 0.7, ease: 'power1.in' }, at)
      tl.to(t, { scaleY: 0.82, scaleX: 1.12, duration: 0.08, yoyo: true, repeat: 1, ease: 'power2.out' }, at + 0.7)
      tl.to(ticks[i], { scale: 1, duration: 0.35, ease: 'back.out(3)' }, at + 0.78)
      tl.to(marks[i], { scale: 1, duration: 0.35, ease: 'back.out(3)' }, at + 0.78)
      tl.fromTo(chips[i], { scale: 1 }, { scale: 1.04, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.inOut' }, at + 0.74)
      tl.to(bust, { y: 4, duration: 0.14, yoyo: true, repeat: 1, ease: 'power1.inOut' }, at + 0.74)
    })
    // a full, happy page
    tl.fromTo(q('.gb-paper'), { y: 0 }, { y: -6, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' }, 4.5)
    tl.to(q('.gb-heart'), { scale: 1, duration: 0.4, ease: 'back.out(3)' }, 4.55)
    tl.to([...tiles, ...q('.gb-heart')], { autoAlpha: 0, duration: 0.3 }, 6.3)
    tl.to(marks, { scale: 0, duration: 0.25, stagger: 0.04 }, 6.3)
    tl.to({}, { duration: 0.2 })
  })
  return (
    <div className="gd-box is-ok" ref={ref} style={{ '--fc': C.green } as CSSProperties}>
      <div className="gd-scene" aria-hidden="true">
        <div className="gd-stage">
          <span className="gd-bust gb-bust" style={bust('yuzuki')} />
          <span className="gb-paper">
            <span className="gb-heart">
              <Icon name="heart" color={C.pink} size={16} />
            </span>
          </span>
          {GOOD.map((g, i) => (
            <span key={g.text} className="gb-tile" style={{ left: SLOTS[i][0], top: SLOTS[i][1], background: g.color }}>
              <Icon name={g.icon} color="#fff" size={18} />
              <span className="gb-tick">✓</span>
            </span>
          ))}
        </div>
      </div>
      <h4>Lovely things to write</h4>
      <ul className="gd-chips">
        {GOOD.map((g) => (
          <li key={g.text} style={{ '--fc': g.color } as CSSProperties}>
            <span className="gd-chip-ico">
              <Icon name={g.icon} color="#fff" size={18} />
            </span>
            {g.text}
            <span className="gd-mark">✓</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Mika keeps the letter clean: each thing that shouldn't go in is stamped out and knocked away. */
export function BadBox() {
  const ref = useLoop((q, tl) => {
    const tiles = q('.bb-tile')
    const xs = q('.bb-x')
    const marks = q('.gd-mark')
    const chips = q('.gd-chips li')
    const [bust] = q('.gd-bust')
    const [paper] = q('.bb-paper')
    gsap.set(tiles, { x: 70, y: -80, rotation: 25, autoAlpha: 0 })
    gsap.set([...xs, ...marks], { scale: 0 })
    tiles.forEach((t, i) => {
      const at = 0.2 + i * 1.05
      tl.set(t, { autoAlpha: 1 }, at)
      tl.to(t, { x: 0, y: 0, rotation: -6, duration: 0.45, ease: 'power2.in' }, at)
      // stamped right as it reaches the page
      tl.fromTo(xs[i], { scale: 2.4, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.14, ease: 'power3.in' }, at + 0.42)
      tl.to(paper, { x: -3, duration: 0.06, yoyo: true, repeat: 1 }, at + 0.45)
      tl.to(bust, { keyframes: { rotation: [0, -8, 8, -5, 0] }, duration: 0.5, ease: 'none' }, at + 0.45)
      // ...and knocked back out of the frame
      tl.to(t, { x: -70, duration: 0.6, ease: 'power1.out' }, at + 0.62)
      tl.to(t, { keyframes: { y: [0, -26, 110], easeEach: 'sine.inOut' }, rotation: -60, duration: 0.6, ease: 'power1.in' }, at + 0.62)
      tl.to(marks[i], { scale: 1, duration: 0.35, ease: 'back.out(3)' }, at + 0.45)
      tl.to(chips[i], { keyframes: { x: [0, -4, 4, -2, 0] }, duration: 0.3, ease: 'none' }, at + 0.45)
    })
    // the page stays clean
    tl.fromTo(q('.bb-spark'), { scale: 0, rotation: 0 }, { scale: 1, rotation: 90, duration: 0.4, ease: 'back.out(3)' }, 4.5)
    tl.to(q('.bb-spark'), { scale: 0, duration: 0.3 }, 6.2)
    tl.to(marks, { scale: 0, duration: 0.25, stagger: 0.04 }, 6.3)
    tl.to({}, { duration: 0.2 })
  })
  return (
    <div className="gd-box is-no" ref={ref} style={{ '--fc': C.red } as CSSProperties}>
      <div className="gd-scene" aria-hidden="true">
        <div className="gd-stage">
          <span className="bb-paper">
            <i />
            <i />
            <i />
          </span>
          <span className="bb-spark">
            <Icon name="sparkle" color={C.yellow} size={22} />
          </span>
          <span className="gd-bust bb-bust" style={bust('mika')} />
          {BAD.map((g) => (
            <span key={g.text} className="bb-tile">
              <Icon name={g.icon} color={C.red} size={18} />
              <span className="bb-x">✕</span>
            </span>
          ))}
        </div>
      </div>
      <h4>Please don’t share</h4>
      <ul className="gd-chips">
        {BAD.map((g) => (
          <li key={g.text}>
            <span className="gd-chip-ico">
              <Icon name={g.icon} color={C.red} size={18} />
            </span>
            {g.text}
            <span className="gd-mark">✕</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
