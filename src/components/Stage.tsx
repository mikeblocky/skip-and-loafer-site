import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useSyncExternalStore } from 'react'
import { gsap, Draggable, GRAB, velocityTracker } from '../gsap'
import { C, CHARACTERS, RAINBOW } from '../data'
import { Icon, SCATTER_ICONS, type IconName } from '../icons'
import { sfx } from '../sfx'
import { openSecret } from '../secrets'
import { reducedMotion, settings, useSettings } from '../settings'
import { clamp, metrics, rand, type Pose } from './stage/geometry'
import { scatter } from './stage/scatter'
import { ringAroundHeaders, type Item } from './stage/ring'
import { quest, questStarted } from '../quest'
import { SantaHat } from './quest/SantaHat'

export type Mode = 'countdown' | 'volumes' | 'birthdays' | 'anime' | 'message'

/** Which scattered sticker is the gacha capsule. Tapping it three times in a row opens the gacha. */
const CAPSULE = 3

export interface StageHandle {
  prepare(): void
  intro(): gsap.core.Timeline
  enable(): void
  setMode(mode: Mode): void
  /** the intro played backwards: everything swirls down into the hole in the middle */
  vanish(): gsap.core.Timeline
}

export const Stage = forwardRef<StageHandle, { aspects: Record<string, number> }>(function Stage(
  { aspects },
  ref,
) {
  const charEls = useRef<HTMLDivElement[]>([])
  const charInner = useRef<HTMLDivElement[]>([])
  const iconEls = useRef<HTMLDivElement[]>([])
  const iconBob = useRef<HTMLDivElement[]>([])
  const rings = useRef<HTMLDivElement[]>([])
  const drags = useRef<Draggable[]>([])
  const idle = useRef<gsap.core.Tween[]>([])
  const charHomes = useRef<Pose[]>([])
  const iconHomes = useRef<Pose[]>([])
  // where each thing belongs: its scattered spot, or wherever you last dropped it.
  // Pages only nudge things away from home temporarily; they go back once it's clear again.
  const home = useRef(new Map<HTMLElement, { x: number; y: number }>())
  const rattleTl = useRef<gsap.core.Timeline | null>(null)
  const knocks = useRef(0)
  const lastKnock = useRef(0)
  const setHome = (el: HTMLElement) => home.current.set(el, { x: gsap.getProperty(el, 'x') as number, y: gsap.getProperty(el, 'y') as number })

  // anyone can leave characters or kinds of doodle off the page (Settings › Page)
  const { hiddenChars, hiddenIcons } = useSettings()
  // Secret Santa: once Shima has turned up, he keeps the Santa hat on
  const santa = useSyncExternalStore(quest.subscribe, questStarted)
  // ...and Mitsumi gets hers at the very end of part 1
  const santaToo = useSyncExternalStore(quest.subscribe, () => quest.get().part1 === 'blessed')

  const icons = useMemo(() => {
    const small = window.innerWidth < 760
    const count = small ? 16 : 30
    return Array.from({ length: count }, (_, i) => ({
      // one sticker is secretly a gacha capsule (see CAPSULE)
      name: (i === CAPSULE ? 'capsule' : SCATTER_ICONS[i % SCATTER_ICONS.length]) as IconName,
      color: i === CAPSULE ? C.pink : RAINBOW[(i * 5) % RAINBOW.length],
      size: small ? 40 : 56,
      front: Math.random() > 0.5,
    }))
  }, [])

  const size = (i: number) => {
    const { H } = metrics()
    return { w: H * (aspects[CHARACTERS[i].id] ?? 0.47), h: H }
  }

  const layout = () => {
    const homes = scatter(icons, size)
    charHomes.current = homes.chars
    iconHomes.current = homes.icons
  }

  const stopIdle = () => {
    idle.current.forEach((t) => t.kill())
    idle.current = []
    rattleTl.current?.kill()
    rattleTl.current = null
  }

  const startIdle = () => {
    stopIdle()
    // less motion: everything sits still once it's landed
    if (reducedMotion()) return
    iconBob.current.forEach((el) => {
      idle.current.push(
        gsap.to(el, {
          y: rand(-12, 12),
          rotation: rand(-14, 14),
          duration: rand(1.6, 2.8),
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: rand(0, 1),
        }),
      )
    })
    // the hint: every so often the capsule gives a little rattle
    const capsule = iconBob.current[CAPSULE]?.querySelector('svg')
    if (capsule) {
      const rattle = () => {
        rattleTl.current = gsap
          .timeline({ delay: rand(14, 26), onComplete: rattle })
          .call(() => sfx.tick(1.3, 0.6))
          .to(capsule, { rotation: 14, duration: 0.06, ease: 'none' })
          .to(capsule, { rotation: -12, duration: 0.07, ease: 'none', repeat: 3, yoyo: true })
          .to(capsule, { rotation: 0, duration: 0.4, ease: 'elastic.out(1, 0.4)' })
      }
      rattle()
    }
    charInner.current.forEach((inner, i) => {
      const el = inner.firstElementChild as HTMLElement
      gsap.set(el, { transformOrigin: '50% 100%' })
      idle.current.push(
        gsap.to(el, {
          scaleY: 1.014,
          scaleX: 0.994,
          duration: rand(1.8, 2.4),
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: i * 0.17,
        }),
      )
    })
  }

  const applySizes = () => {
    charEls.current.forEach((el, i) => {
      const { w, h } = size(i)
      gsap.set(el, { width: w, height: h })
    })
  }

  useImperativeHandle(ref, () => ({
    prepare() {
      stopIdle()
      drags.current.forEach((d) => d.disable())
      applySizes()
      layout()
      home.current.clear()
      charEls.current.forEach((el, i) => home.current.set(el, { x: charHomes.current[i].x, y: charHomes.current[i].y }))
      iconEls.current.forEach((el, i) => home.current.set(el, { x: iconHomes.current[i].x, y: iconHomes.current[i].y }))
      gsap.killTweensOf([...charEls.current, ...iconEls.current, ...charInner.current])
      gsap.set(charEls.current, { autoAlpha: 1, transformOrigin: '50% 50%' })
      gsap.set(iconEls.current, { autoAlpha: 1, transformOrigin: '50% 50%' })
      gsap.set(charInner.current, { scale: 1, transformOrigin: '50% 100%' })
    },

    /**
     * Looking down a funnel: everything rises from the hole in the middle. One depth z drives
     * size, distance from the centre and swirl through a perspective divide (k = 1 / z).
     */
    intro() {
      const { vw, vh } = metrics()
      const tl = gsap.timeline()
      const cx = vw / 2
      const cy = vh / 2
      const reach = Math.hypot(vw, vh) / 2
      const FAR = 14

      rings.current.forEach((el, i) => {
        const z = { v: FAR }
        const draw = () => {
          const k = 1 / z.v
          gsap.set(el, { scale: (reach * 2.3 * k) / 100, opacity: Math.min(1, (1 - k) * 2.2) })
        }
        draw()
        tl.to(z, { v: 1, duration: 1.8, ease: 'none', onUpdate: draw }, i * 0.2)
      })

      const fly = (
        el: HTMLElement,
        pose: Pose,
        center: { x: number; y: number },
        place: (px: number, py: number, s: number) => void,
        at: number,
        dur: number,
      ) => {
        const dx = center.x - cx
        const dy = center.y - cy
        const r1 = Math.hypot(dx, dy)
        const a1 = Math.atan2(dy, dx)
        const swirl = (Math.random() > 0.5 ? 1 : -1) * rand(1.1, 1.8)
        const spin = rand(-260, 260)
        const z = { v: FAR }
        const draw = () => {
          const k = 1 / z.v
          const a = a1 - swirl * (1 - k)
          place(cx + Math.cos(a) * r1 * k, cy + Math.sin(a) * r1 * k, pose.scale * k)
          gsap.set(el, { rotation: pose.rotation + spin * (1 - k), opacity: Math.min(1, k * 6) })
        }
        draw()
        // z closes in fast and eases at the end; the 1/z divide makes the approach accelerate
        tl.to(z, { v: 1, duration: dur, ease: 'power2.out', onUpdate: draw }, at)
      }

      const total = icons.length + CHARACTERS.length
      const order = gsap.utils.shuffle(Array.from({ length: total }, (_, i) => i))
      const at = (i: number) => 0.15 + order[i] * (1.1 / total)

      iconEls.current.forEach((el, i) => {
        const p = iconHomes.current[i]
        const s = icons[i].size
        gsap.set(el, { zIndex: icons[i].front ? 40 : 5 })
        fly(el, p, { x: p.x + s / 2, y: p.y + s / 2 }, (px, py, sc) => gsap.set(el, { x: px - s / 2, y: py - s / 2, scale: sc }), at(i), 1.5)
        tl.call(() => sfx.pop(clamp(0.7, 1.7, 1.25 / p.scale), sfx.panOf(p.x + s / 2)), [], at(i) + 1.05)
      })

      CHARACTERS.forEach((_, i) => {
        const el = charEls.current[i]
        const inner = charInner.current[i]
        const { w, h } = size(i)
        const p = charHomes.current[i]
        const t = at(icons.length + i)
        gsap.set(el, { zIndex: Math.round(p.scale * 40) })
        fly(el, p, { x: p.x + w / 2, y: p.y + h / 2 }, (px, py, sc) => gsap.set(el, { x: px - w / 2, y: py - h / 2, scale: sc }), t, 1.7)
        tl.call(() => (sfx.thud(sfx.panOf(p.x + w / 2)), sfx.pop(0.55, sfx.panOf(p.x + w / 2))), [], t + 1.5)
        tl.to(inner, { scaleY: 0.92, scaleX: 1.05, duration: 0.1, ease: 'power2.out' }, t + 1.55)
        tl.to(inner, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1, 0.75)' }, t + 1.65)
      })
      return tl
    },

    vanish() {
      stopIdle()
      drags.current.forEach((d) => d.disable())
      const els = [...charEls.current, ...iconEls.current]
      gsap.killTweensOf(els)
      const tl = gsap.timeline()
      if (reducedMotion()) {
        tl.to(els, { autoAlpha: 0, duration: 0.35 })
        return tl
      }
      const { vw, vh } = metrics()
      const cx = vw / 2
      const cy = vh / 2
      const reach = Math.hypot(vw, vh) / 2
      const FAR = 14
      // the same funnel as the intro, run the other way: z goes from here back out to FAR
      els.forEach((el) => {
        const x0 = gsap.getProperty(el, 'x') as number
        const y0 = gsap.getProperty(el, 'y') as number
        const s0 = (gsap.getProperty(el, 'scale') as number) || 1
        const r0 = gsap.getProperty(el, 'rotation') as number
        const w = el.offsetWidth
        const h = el.offsetHeight
        const dx = x0 + w / 2 - cx
        const dy = y0 + h / 2 - cy
        const r1 = Math.hypot(dx, dy)
        const a1 = Math.atan2(dy, dx)
        const swirl = (Math.random() > 0.5 ? 1 : -1) * rand(1.1, 1.8)
        const spin = rand(-260, 260)
        const z = { v: 1 }
        const draw = () => {
          const k = 1 / z.v
          const a = a1 + swirl * (1 - k)
          gsap.set(el, {
            x: cx + Math.cos(a) * r1 * k - w / 2,
            y: cy + Math.sin(a) * r1 * k - h / 2,
            scale: s0 * k,
            rotation: r0 + spin * (1 - k),
            opacity: Math.min(1, k * 6),
          })
        }
        const at = rand(0, 0.9)
        tl.to(z, { v: FAR, duration: 1.4, ease: 'power2.in', onUpdate: draw }, at)
        if (Math.random() < 0.35) tl.call(() => sfx.pop(rand(0.5, 0.8), sfx.panOf(x0)), [], at + 0.15)
      })
      rings.current.forEach((el, i) => {
        const z = { v: 1 }
        const draw = () => {
          const k = 1 / z.v
          gsap.set(el, { scale: (reach * 2.3 * k) / 100, opacity: Math.min(1, (1 - k) * 2.2) })
        }
        // the rings close back down the hole, last one first
        tl.to(z, { v: FAR, duration: 1.5, ease: 'none', onUpdate: draw }, 0.9 + (rings.current.length - 1 - i) * 0.15)
      })
      tl.call(() => sfx.whoosh(1.6, false, 0.2), [], 0.2)
      // prepare() brings these back for the next intro (the rings only ever use opacity)
      tl.set(els, { autoAlpha: 0 })
      tl.set(rings.current, { opacity: 0 })
      return tl
    },

    enable() {
      if (!drags.current.length) createDraggables()
      drags.current.forEach((d) => d.enable())
      updateBounds()
      startIdle()
    },

    setMode(_m: Mode) {
      arrange()
      updateBounds()
    },
  }))

  /**
   * Same rule on every page: everything goes to its home spot, except things whose home would
   * cover this page's header, which step to the nearest free spot around it. Nothing else moves.
   */
  function arrange() {
    const { vw, vh, mobile } = metrics()
    const items: Item[] = [
      ...charEls.current.map((el) => ({ el, char: true })),
      ...iconEls.current.map((el) => ({ el, char: false })),
    ].map(({ el, char }) => {
      const s = (gsap.getProperty(el, 'scale') as number) || 1
      const w = el.offsetWidth
      const h = el.offsetHeight
      const at = home.current.get(el) ?? { x: gsap.getProperty(el, 'x') as number, y: gsap.getProperty(el, 'y') as number }
      return { el, x: at.x, y: at.y, w, h, vw: w * s * (char ? 0.6 : 1), vh: h * s }
    })
    const nudged = ringAroundHeaders(items, vw, vh, mobile)
    items.forEach((it) => {
      const t = nudged.get(it.el) ?? { x: it.x, y: it.y }
      const cx = gsap.getProperty(it.el, 'x') as number
      const cy = gsap.getProperty(it.el, 'y') as number
      if (Math.abs(t.x - cx) < 1 && Math.abs(t.y - cy) < 1) return
      gsap.to(it.el, { x: t.x, y: t.y, duration: 0.9, ease: 'back.inOut(1.3)', delay: rand(0, 0.15) })
    })
  }

  function updateBounds() {
    const { vw, vh } = metrics()
    drags.current.forEach((d) => {
      const el = d.target as HTMLElement
      const w = el.offsetWidth
      const h = el.offsetHeight
      d.applyBounds({ minX: -w * 0.7, maxX: vw - w * 0.3, minY: -h * 0.7, maxY: vh - h * 0.3 })
    })
  }

  function createDraggables() {
    charEls.current.forEach((el, i) => {
      const inner = charInner.current[i]
      const vt = velocityTracker()
      const rot = gsap.quickTo(el, 'rotation', { duration: 0.45, ease: 'power3.out' })
      const settle = () =>
        gsap.to(el, { rotation: charHomes.current[i]?.rotation ?? 0, duration: 1.4, ease: 'elastic.out(1, 0.75)', overwrite: 'auto' })
      const lean = function (this: Draggable) {
        const { vx } = vt.sample(this.x, this.y)
        rot(clamp(-32, 32, vx / 45))
      }
      const [d] = Draggable.create(el, {
        type: 'x,y',
        inertia: true,
        zIndexBoost: true,
        edgeResistance: 0.65,
        ...GRAB,
        onPress(this: Draggable) {
          vt.reset(this.x, this.y)
          el.classList.add('held')
          sfx.grab(sfx.panOf(this.pointerX))
          gsap.to(inner, { scale: 1.07, duration: 0.35, ease: 'back.out(1.4)', overwrite: 'auto' })
        },
        onDrag: lean,
        onThrowUpdate: lean,
        onRelease(this: Draggable) {
          el.classList.remove('held')
          sfx.boing(sfx.panOf(this.pointerX))
          if (this.isThrowing) sfx.whoosh(0.35, true, 0.12, sfx.panOf(this.pointerX))
          gsap.to(inner, { scale: 1, duration: 0.9, ease: 'elastic.out(1, 0.75)', overwrite: 'auto' })
          if (!this.isThrowing) {
            settle()
            setHome(el)
          }
        },
        onThrowComplete() {
          settle()
          setHome(el)
        },
      })
      drags.current.push(d)
    })
    iconEls.current.forEach((el, i) => {
      const vt = velocityTracker()
      const spin = function (this: Draggable) {
        const { vx } = vt.sample(this.x, this.y)
        gsap.set(el, { rotation: `+=${clamp(-18, 18, vx / 120)}` })
      }
      const base = () => iconHomes.current[i]?.scale ?? 1
      const [d] = Draggable.create(el, {
        type: 'x,y',
        inertia: true,
        zIndexBoost: true,
        edgeResistance: 0.7,
        ...GRAB,
        onPress(this: Draggable) {
          vt.reset(this.x, this.y)
          gsap.to(el, { scale: base() * 1.35, duration: 0.3, ease: 'back.out(1.4)', overwrite: 'auto' })
          sfx.pop(1.3, sfx.panOf(this.pointerX))
        },
        onDrag: spin,
        onThrowUpdate: spin,
        onRelease(this: Draggable) {
          sfx.pop(0.9, sfx.panOf(this.pointerX))
          gsap.to(el, { scale: base(), duration: 0.8, ease: 'elastic.out(1, 0.75)', overwrite: 'auto' })
          if (!this.isThrowing) setHome(el)
        },
        onThrowComplete() {
          setHome(el)
        },
        // the capsule: three quick taps (no dragging) crack it open
        onClick() {
          if (i !== CAPSULE) return
          const now = performance.now()
          knocks.current = now - lastKnock.current < 700 ? knocks.current + 1 : 1
          lastKnock.current = now
          gsap.fromTo(el.querySelector('svg'), { rotation: -18 }, { rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' })
          sfx.clack(0.9 + knocks.current * 0.12)
          if (knocks.current >= 3) {
            knocks.current = 0
            openSecret('gacha')
          }
        },
      })
      drags.current.push(d)
    })
  }

  // turning "reduce motion" on or off in settings stops or restarts the bobbing straight away
  useEffect(() => {
    let was = reducedMotion()
    return settings.subscribe(() => {
      const now = reducedMotion()
      if (now === was) return
      was = now
      if (!drags.current.length || !drags.current[0].enabled()) return
      if (now) stopIdle()
      else startIdle()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** move everything to a fresh scatter (after the window changes shape, or the cast does) */
  const rescatter = () => {
    layout()
    charEls.current.forEach((el, i) => {
      const p = charHomes.current[i]
      home.current.set(el, { x: p.x, y: p.y })
      gsap.to(el, { x: p.x, y: p.y, scale: p.scale, rotation: p.rotation, duration: 0.8, ease: 'power3.inOut' })
    })
    iconEls.current.forEach((el, i) => {
      const p = iconHomes.current[i]
      home.current.set(el, { x: p.x, y: p.y })
      gsap.to(el, { x: p.x, y: p.y, scale: p.scale, duration: 0.8, ease: 'power3.inOut' })
    })
  }

  // someone left characters off (or brought them back): spread the rest out over the free room
  const castKey = hiddenChars.join(',')
  const seenCast = useRef(castKey)
  useEffect(() => {
    if (seenCast.current === castKey) return
    seenCast.current = castKey
    // only once everything has landed; before that the intro lays things out itself
    if (!drags.current.length || !drags.current[0].enabled()) return
    rescatter()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [castKey])

  useEffect(() => {
    let timer = 0
    let lastW = window.innerWidth
    let lastH = window.innerHeight
    const onResize = () => {
      clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (!drags.current.length || !drags.current[0].enabled()) return
        // keep spots on small changes; re-scatter only when the window really changes shape
        const big = Math.abs(window.innerWidth - lastW) > 120 || Math.abs(window.innerHeight - lastH) > 120
        lastW = window.innerWidth
        lastH = window.innerHeight
        updateBounds()
        if (!big) return
        rescatter()
      }, 180)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      clearTimeout(timer)
      stopIdle()
      drags.current.forEach((d) => d.kill())
      drags.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="stage" aria-hidden="true">
      {RAINBOW.slice(0, 5).map((c, i) => (
        <div
          key={`r${i}`}
          className="ring"
          style={{ borderColor: c }}
          ref={(el) => {
            if (el) rings.current[i] = el
          }}
        />
      ))}
      {icons.map((ic, i) => (
        <div
          key={i}
          className={`floaty${hiddenIcons.includes(ic.name) ? ' is-off' : ''}`}
          data-icon={ic.name}
          ref={(el) => {
            if (el) iconEls.current[i] = el
          }}
          style={{ width: ic.size, height: ic.size }}
        >
          <div
            className="bob"
            ref={(el) => {
              if (el) iconBob.current[i] = el
            }}
          >
            <Icon name={ic.name} color={ic.color} size="100%" />
          </div>
        </div>
      ))}
      {CHARACTERS.map((c, i) => (
        <div
          key={c.id}
          className={`char${hiddenChars.includes(c.id) ? ' is-off' : ''}`}
          data-char={c.id}
          ref={(el) => {
            if (el) charEls.current[i] = el
          }}
        >
          <div
            className="char-inner"
            ref={(el) => {
              if (el) charInner.current[i] = el
            }}
          >
            <img src={c.src} alt="" draggable={false} />
            {c.id === 'shima' && santa && <SantaHat />}
            {c.id === 'mitsumi' && santaToo && <SantaHat className="is-mitsumi" />}
          </div>
          <span className="char-tag" style={{ background: c.color }}>
            {c.name}
          </span>
        </div>
      ))}
    </div>
  )
})
