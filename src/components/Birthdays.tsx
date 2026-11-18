import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { gsap, Draggable } from '../gsap'
import { BIRTHDAYS, C, RAINBOW } from '../data'
import { Icon, SCATTER_ICONS } from '../icons'
import { FlexText } from './FlexText'
import { sfx } from '../sfx'
import { openSecret } from '../secrets'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
const BAND = ['#F53D84', '#F86E1A', '#F5900F', '#3FC800', '#12B266', '#0EA09E', '#1B88E8', '#246BE8', '#3F44D6', '#7A45E0', '#CC3DC0', '#F0344F']

/** 0° is the top of the dial, clockwise through the year. */
const angleOf = (m: number, d: number) => ((START[m - 1] + d - 1) / 365) * 360

function daysUntil(m: number, d: number) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let next = new Date(now.getFullYear(), m - 1, d)
  if (next < today) next = new Date(now.getFullYear() + 1, m - 1, d)
  return Math.round((next.getTime() - today.getTime()) / 864e5)
}

/** Shortest equivalent of `target` (mod 360) to the current rotation. */
const nearestTurn = (cur: number, target: number) => cur + ((((target - cur) % 360) + 540) % 360) - 180

function useViewport() {
  const [v, set] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const on = () => set({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return v
}

function sector(r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => {
    const t = ((a - 90) * Math.PI) / 180
    return `${(500 + r * Math.cos(t)).toFixed(2)} ${(500 + r * Math.sin(t)).toFixed(2)}`
  }
  const large = a1 - a0 > 180 ? 1 : 0
  return `M${p(r1, a0)} A${r1} ${r1} 0 ${large} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)} Z`
}

/** The ring itself: a band per month, day ticks and the "today" notch. Drawn once. */
function Dial() {
  const now = new Date()
  const todayA = angleOf(now.getMonth() + 1, now.getDate())
  const ticks = useMemo(() => {
    let d = ''
    for (let i = 0; i < 365; i++) {
      const a = ((i / 365) * 360 - 90) * (Math.PI / 180)
      const r0 = 352
      const r1 = i % 7 === 0 ? 340 : 346
      d += `M${500 + r0 * Math.cos(a)} ${500 + r0 * Math.sin(a)}L${500 + r1 * Math.cos(a)} ${500 + r1 * Math.sin(a)}`
    }
    return d
  }, [])
  return (
    <svg className="bd-ring" viewBox="0 0 1000 1000" aria-hidden="true">
      <circle cx="500" cy="500" r="430" fill="#fff" />
      {MONTHS.map((name, i) => {
        const a0 = (START[i] / 365) * 360
        const a1 = ((START[i + 1] ?? 365) / 365) * 360
        const mid = (a0 + a1) / 2
        return (
          <g key={name}>
            <path d={sector(360, 418, a0 + 0.5, a1 - 0.5)} fill={BAND[i]} />
            <text
              x="500"
              y="111"
              transform={`rotate(${mid} 500 500)`}
              textAnchor="middle"
              dominantBaseline="central"
              className="bd-month"
              fill="#fff"
            >
              {name.slice(0, 3)}
            </text>
          </g>
        )
      })}
      <path d={ticks} stroke="#E4DFD5" strokeWidth="2" strokeLinecap="round" />
      <g transform={`rotate(${todayA} 500 500)`}>
        <path d="M500 328 l-9 -15 h18 z" fill={C.ink} />
        <text x="500" y="300" textAnchor="middle" className="bd-today">
          today
        </text>
      </g>
    </svg>
  )
}

const BURST = Array.from({ length: 14 }, (_, i) => ({
  name: SCATTER_ICONS[(i * 3) % SCATTER_ICONS.length],
  color: RAINBOW[i % RAINBOW.length],
}))

export function Birthdays() {
  const { w: vw, h: vh } = useViewport()
  const mobile = vw < 760
  const D = Math.round(mobile ? Math.min(vw - 28, 460) : Math.min(vw * 0.92, vh * 1.28, 1060))

  const list = useMemo(
    () => BIRTHDAYS.map((b) => ({ ...b, a: angleOf(b.m, b.d), days: daysUntil(b.m, b.d) })),
    [],
  )
  const firstUp = useMemo(() => list.reduce((best, b, i) => (b.days < list[best].days ? i : best), 0), [list])
  const [sel, setSel] = useState(firstUp)
  const selRef = useRef(firstUp)
  const wheel = useRef<HTMLDivElement>(null)
  const burst = useRef<HTMLDivElement>(null)
  const drag = useRef<Draggable | null>(null)

  const nearestIndex = (rot: number) => {
    let best = 0
    let bestD = Infinity
    list.forEach((b, i) => {
      const d = Math.abs(nearestTurn(rot, -b.a) - rot)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    return best
  }

  const sync = () => {
    const el = wheel.current
    if (!el) return
    const r = gsap.getProperty(el, 'rotation') as number
    el.style.setProperty('--rot', `${r}deg`)
    const i = nearestIndex(r)
    if (i !== selRef.current) {
      sfx.tick(0.8 + (i / list.length) * 0.6)
      selRef.current = i
      setSel(i)
    }
  }

  const pop = () => {
    const box = burst.current
    if (!box) return
    sfx.chime(0.9 + (selRef.current / list.length) * 0.4, 0.8)
    Array.from(box.children).forEach((el, i) => {
      const a = (i / box.children.length) * Math.PI * 2 + gsap.utils.random(-0.3, 0.3)
      const dist = gsap.utils.random(90, 170)
      gsap.fromTo(
        el,
        { x: 0, y: 0, scale: 0, rotation: 0, opacity: 1 },
        {
          x: Math.cos(a) * dist,
          y: Math.sin(a) * dist,
          scale: gsap.utils.random(0.6, 1.1),
          rotation: gsap.utils.random(-200, 200),
          opacity: 0,
          duration: 1.1,
          ease: 'power3.out',
        },
      )
    })
  }

  const goTo = (i: number) => {
    const el = wheel.current
    if (!el) return
    const cur = gsap.getProperty(el, 'rotation') as number
    gsap.to(el, {
      rotation: nearestTurn(cur, -list[i].a),
      duration: 0.9,
      ease: 'back.out(1.25)',
      overwrite: true,
      onUpdate: sync,
      onComplete: () => {
        drag.current?.update()
        pop()
      },
    })
  }

  useEffect(() => {
    const el = wheel.current!
    // hidden extra: spin the year round twice in one go (by hand or with a fling)
    let spun = 0
    let lastRot = 0
    const track = () => {
      const r = gsap.getProperty(el, 'rotation') as number
      spun += Math.abs(r - lastRot)
      lastRot = r
      sync()
    }
    const checkSpin = () => {
      if (spun >= 720) {
        spun = 0
        window.setTimeout(() => openSecret('poll'), 350)
      }
    }
    const [d] = Draggable.create(el, {
      type: 'rotation',
      inertia: true,
      minimumMovement: 4,
      snap: (v: number) => nearestTurn(v, -list[nearestIndex(v)].a),
      onPress() {
        spun = 0
        lastRot = gsap.getProperty(el, 'rotation') as number
      },
      onDrag: track,
      onThrowUpdate: track,
      onThrowComplete: () => (pop(), checkSpin()),
      onRelease(this: Draggable) {
        if (!this.isThrowing) {
          checkSpin()
          goTo(nearestIndex(this.rotation))
        }
      },
      onClick(e: PointerEvent) {
        const pin = (e.target as HTMLElement).closest<HTMLElement>('[data-bd]')
        if (pin) goTo(Number(pin.dataset.bd))
      },
    })
    drag.current = d
    // wind in from a few turns back
    const target = -list[firstUp].a
    gsap.fromTo(
      el,
      { rotation: target - 420 },
      { rotation: target, duration: 2.2, ease: 'expo.out', delay: 0.2, onUpdate: sync, onComplete: () => (d.update(), pop()) },
    )
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo((selRef.current + 1) % list.length)
      if (e.key === 'ArrowLeft') goTo((selRef.current - 1 + list.length) % list.length)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      d.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const b = list[sel]
  const date = `${MONTHS[b.m - 1]} ${b.d}`

  return (
    <section className={`view view-birthdays${mobile ? ' is-mobile' : ''}`}>
      <FlexText as="h2" className="bd-title" words={[{ t: 'Birthdays', w: 760, c: C.green }]} data-intro="ui" data-safe="">
        <sup className="vt-count">{list.length}</sup>
      </FlexText>

      <div className="bd-stage" data-intro="ui" style={{ '--D': `${D}px` } as CSSProperties}>
        <div className="bd-dial">
          <div className="bd-pointer">
            <Icon name="heart" color={b.color} size={30} />
          </div>
          <div className="bd-wheel" ref={wheel}>
            <Dial />
            {list.map((p, i) => (
              <div
                key={p.name}
                className={`bd-pin${i === sel ? ' is-sel' : ''}`}
                data-bd={i}
                style={{ '--a': `${p.a}deg`, '--c': p.color } as CSSProperties}
              >
                <div className="bd-upright">
                  <span className="bd-dot">{p.d}</span>
                  <span className="bd-name">{p.name}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bd-info" key={b.name} style={{ '--c': b.color } as CSSProperties}>
            <div className="bd-face">
              {b.img ? (
                <span className="bd-portrait" style={{ backgroundImage: `url(/characters/${b.img}${b.img === 'ujie' || b.img === 'yasaka' ? '.webp' : '.png'})` }} />
              ) : (
                <span className="bd-initial">{b.name[0]}</span>
              )}
              <div className="bd-burst" ref={burst} aria-hidden="true">
                {BURST.map((x, i) => (
                  <Icon key={i} name={x.name} color={x.color} size={22} />
                ))}
              </div>
            </div>
            <FlexText as="div" className="bd-who" words={[{ t: b.name, w: 850, c: b.color }]} />
            <div className="bd-date">{date}</div>
            <div className="bd-count">
              {b.days === 0 ? (
                <span className="bd-big">Today!</span>
              ) : (
                <>
                  <span className="bd-in">in</span>
                  <span className="bd-big">{b.days}</span>
                  <span className="bd-in">{b.days === 1 ? 'day' : 'days'}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
