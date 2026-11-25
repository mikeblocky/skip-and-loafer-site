import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { gsap, Draggable, GRAB } from '../gsap'
import { C, VOLUMES } from '../data'
import { Icon, SCATTER_ICONS } from '../icons'
import { useCoverColors } from '../coverColors'
import { sfx } from '../sfx'
import { ChapterPanel } from './Chapters'
import { useT } from '../i18n'
import { GATE_VOLUME, TORII_VOLUME, openGate, questHint, quest } from '../quest'

function SpineArt({ n, color }: { n: number; color: string }) {
  return (
    <div className="spine-art" style={{ '--c': color } as CSSProperties}>
      <span className="spine-num">{n}</span>
      <span className="spine-rule" />
      <span className="spine-title" lang="ja">
        スキップとローファー
      </span>
      <span className="spine-author" lang="ja">
        高松美咲
      </span>
    </div>
  )
}

/** Tossed sticker pattern for the back cover and endpapers. */
function Pattern({ seed = 0 }: { seed?: number }) {
  return (
    <div className="pattern" aria-hidden="true">
      {Array.from({ length: 30 }, (_, i) => (
        <Icon
          key={i}
          name={SCATTER_ICONS[(i * 7 + seed) % SCATTER_ICONS.length]}
          color="rgba(255,255,255,.42)"
          size={28}
          style={{ transform: `rotate(${((i * 47 + seed * 13) % 70) - 35}deg)` }}
        />
      ))}
    </div>
  )
}

/**
 * Japanese manga reads right to left: the spine is on the right, the cover
 * hinges on its right edge and swings open to the right, while the arrows still read 1 → 2.
 */
const BASE_Y = 18
const OPEN_Y = -22

export function Viewer({
  index,
  onIndex,
  onClose,
}: {
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const root = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const book = useRef<HTMLDivElement>(null)
  const cover = useRef<HTMLDivElement>(null)
  const { t } = useT()
  const ui = useRef<HTMLDivElement>(null)
  const colors = useCoverColors()
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  const busy = useRef(false)
  const rot = useRef({ y: BASE_Y, x: 6 })
  const drag = useRef<Draggable | null>(null)

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  // desktop: the book lives in the left half, chapters on the right
  const wide = vw >= 900
  const W = Math.round(wide ? Math.min(330, vw * 0.3, (vh - 220) / 1.42) : Math.min(180, vw * 0.38))
  const H = Math.round(W * 1.42)
  const D = Math.round(W * 0.14)
  const vol = VOLUMES[index]
  const color = colors[index]

  const render = () => gsap.set(book.current, { rotationY: rot.current.y, rotationX: rot.current.x })

  const spineRect = (i: number) => document.querySelector(`[data-vol="${i}"]`)?.getBoundingClientRect()

  // fly out of the shelf
  useLayoutEffect(() => {
    const r = spineRect(index)
    const s = stage.current!.getBoundingClientRect()
    const cx = s.left + s.width / 2
    const cy = s.top + s.height / 2
    gsap.set(cover.current, { z: D / 2, transformOrigin: '100% 50%', rotationY: 0 })
    const tl = gsap.timeline()
    tl.fromTo(root.current!.querySelector('.viewer-bg'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0)
    tl.call(() => (sfx.whoosh(0.45, true, 0.18), sfx.rustle()), [], 0)
    tl.call(() => sfx.chime(1.2, 0.7), [], 0.6)
    if (r) {
      tl.fromTo(
        book.current,
        { x: r.left + r.width / 2 - cx, y: r.top + r.height / 2 - cy, scale: r.height / H, rotationY: 0, rotationZ: -6, rotationX: 0 },
        { x: 0, y: -30, scale: 1.04, rotationY: BASE_Y + 30, rotationZ: 0, rotationX: 10, duration: 0.65, ease: 'power3.out' },
        0,
      )
      tl.to(book.current, { y: 0, scale: 1, rotationY: BASE_Y, rotationX: 6, duration: 0.9, ease: 'elastic.out(1, 0.75)' })
    }
    tl.fromTo(ui.current!.children, { y: 40, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, stagger: 0.06, duration: 0.6, ease: 'back.out(1.4)' }, 0.35)
    rot.current = { y: BASE_Y, x: 6 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // drag to spin
  useEffect(() => {
    const proxy = document.createElement('div')
    let startY = 0
    const [d] = Draggable.create(proxy, {
      trigger: stage.current,
      type: 'x',
      ...GRAB,
      inertia: true,
      minimumMovement: 5,
      snap: {
        x: (v: number) => {
          const base = openRef.current ? OPEN_Y : BASE_Y
          const r = startY + v * 0.5
          const target = base + Math.round((r - base) / 180) * 180
          return (target - startY) * 2
        },
      },
      onRelease(this: Draggable) {
        if (this.isThrowing) sfx.whoosh(0.4, true, 0.1)
      },
      onThrowComplete() {
        sfx.tick(0.9)
      },
      onPress(this: Draggable) {
        gsap.killTweensOf(rot.current)
        startY = rot.current.y - this.x * 0.5
      },
      onDrag(this: Draggable) {
        rot.current.y = startY + this.x * 0.5
        render()
      },
      onThrowUpdate(this: Draggable) {
        rot.current.y = startY + this.x * 0.5
        render()
      },
      onClick(e: PointerEvent) {
        // Secret Santa: the ticket gate inside the cover takes the click instead
        // (checked by position: in 3D the spine face can sit over it and take the hit)
        const slot = root.current?.querySelector('.qg-slot')?.getBoundingClientRect()
        if (openRef.current && slot && e.clientX >= slot.left && e.clientX <= slot.right && e.clientY >= slot.top && e.clientY <= slot.bottom) {
          return openGate()
        }
        toggle()
      },
    })
    drag.current = d
    const onTilt = (e: PointerEvent) => {
      if (d.isDragging || d.isThrowing) return
      const ny = e.clientY / window.innerHeight - 0.5
      gsap.to(rot.current, { x: 6 - ny * 18, duration: 0.8, ease: 'power3.out', onUpdate: render, overwrite: 'auto' })
    }
    window.addEventListener('pointermove', onTilt)
    return () => {
      window.removeEventListener('pointermove', onTilt)
      d.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = () => {
    if (busy.current) return
    {
      const next = !openRef.current
      openRef.current = next
      setOpen(next)
      sfx.rustle()
      if (next) sfx.pop(0.8)
      // Secret Santa: a riddle sends people inside this cover
      if (next) questHint({ kind: 'cover', index })
      gsap.to(cover.current, {
        rotationY: next ? 158 : 0,
        duration: next ? 1.1 : 0.8,
        ease: next ? 'back.out(1.15)' : 'power3.inOut',
        overwrite: 'auto',
      })
      // swing the book so the inside faces the reader
      const turns = Math.round((rot.current.y - BASE_Y) / 360) * 360
      gsap.to(rot.current, {
        y: (next ? OPEN_Y : BASE_Y) + turns,
        duration: 1,
        ease: 'power3.inOut',
        onUpdate: render,
        overwrite: 'auto',
      })
    }
  }

  const close = () => {
    if (busy.current) return
    busy.current = true
    const r = spineRect(index)
    const s = stage.current!.getBoundingClientRect()
    const tl = gsap.timeline({ onComplete: onClose })
    sfx.whoosh(0.5, false, 0.16)
    tl.call(() => sfx.thud(), [], 0.7)
    tl.to(cover.current, { rotationY: 0, duration: 0.3, ease: 'power2.in' }, 0)
    tl.to(ui.current!.children, { y: 30, opacity: 0, duration: 0.25, stagger: 0.03, ease: 'power2.in' }, 0)
    tl.to(root.current!.querySelector('.v-panel'), { x: 60, opacity: 0, duration: 0.35, ease: 'power2.in' }, 0)
    tl.to(root.current!.querySelector('.viewer-bg'), { opacity: 0, duration: 0.45 }, 0.2)
    const turns = Math.round(rot.current.y / 360) * 360
    if (r) {
      tl.to(
        book.current,
        {
          x: r.left + r.width / 2 - (s.left + s.width / 2),
          y: r.top + r.height / 2 - (s.top + s.height / 2),
          scale: r.height / H,
          rotationY: turns,
          rotationX: 0,
          duration: 0.6,
          ease: 'power3.inOut',
        },
        0.15,
      )
    } else {
      tl.to(book.current, { scale: 0, duration: 0.4, ease: 'back.in(1.3)' }, 0.15)
    }
  }

  const go = (dir: number) => {
    if (busy.current) return
    const ni = (index + dir + VOLUMES.length) % VOLUMES.length
    busy.current = true
    setOpen(false)
    openRef.current = false
    // the next volume comes in from the right, so the arrows read 1 → 2
    const side = dir
    sfx.whoosh(0.45, dir > 0, 0.18, -side * 0.6)
    window.setTimeout(() => sfx.pop(dir > 0 ? 1.1 : 0.9), 420)
    const tl = gsap.timeline({
      onComplete: () => {
        busy.current = false
      },
    })
    tl.to(book.current, { x: -side * vw * 0.5, rotationY: rot.current.y - side * 120, scale: 0.7, opacity: 0, duration: 0.32, ease: 'power3.in' })
    tl.call(() => {
      gsap.set(cover.current, { rotationY: 0 })
      rot.current = { y: BASE_Y, x: 6 }
      drag.current && gsap.set(drag.current.target, { x: 0 })
      drag.current?.update()
      onIndex(ni)
    })
    tl.fromTo(
      book.current,
      { x: side * vw * 0.5, rotationY: BASE_Y + side * 140, scale: 0.7, opacity: 0 },
      { x: 0, rotationY: BASE_Y, scale: 1, opacity: 1, duration: 0.85, ease: 'back.out(1.25)' },
    )
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // a quest dialog on top has the keyboard
      if (document.querySelector('.qs')) return
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
      // leave Enter/Space alone on links and buttons so they still work from the keyboard
      const onControl = (e.target as Element | null)?.closest?.('a, button')
      if ((e.key === ' ' || e.key === 'Enter') && !onControl) {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="viewer" ref={root} role="dialog" aria-label={t('vol.label', { n: vol.n })}>
      <div className="viewer-bg" onClick={close} />
      <div className="viewer-stage" ref={stage} style={{ '--stage-h': `${H + 44}px` } as CSSProperties}>
        <div
          className="book3d"
          ref={book}
          style={{ '--w': `${W}px`, '--h': `${H}px`, '--d': `${D}px`, '--c': color } as CSSProperties}
        >
          <div className="face f-back">
            <Pattern seed={vol.n} />
            <span className="back-jp" lang="ja">
              スキップとローファー
            </span>
            <span className="back-num">{vol.n}</span>
          </div>
          <div className="face f-spine">
            <SpineArt n={vol.n} color={color} />
          </div>
          <div className="face f-pages" />
          <div className="face f-top" />
          <div className="face f-bottom" />
          <div className="f-first">
            <span className="first-vol">vol.</span>
            <span className="first-num" style={{ color }}>
              {vol.n}
            </span>
            <span className="first-jp" lang="ja">
              スキップとローファー
            </span>
          </div>
          <div className="f-cover" ref={cover}>
            <div className="cover-front">
              {vol.src ? (
                <img src={vol.src} alt={t('vol.cover', { n: vol.n })} draggable={false} />
              ) : (
                <div className="cover-soon">
                  <Pattern seed={vol.n + 7} />
                  <span className="cs-num">{vol.n}</span>
                  <span className="cs-jp" lang="ja">
                    スキップとローファー
                  </span>
                  <span className="cs-tag">{t('vol.inProgress')}</span>
                </div>
              )}
              <span className="cover-shine" />
            </div>
            <div className="cover-inside">
              <Pattern seed={vol.n + 3} />
              {index === TORII_VOLUME && quest.get().part1 === 'riddles' && (
                // ???'s seal: a snowflake stamped inside the cover
                <span className="qg-seal" aria-hidden="true">
                  <Icon name="snow" color={C.ink} size={34} />
                  <b>???</b>
                </span>
              )}
              {index === GATE_VOLUME && (
                // a little ticket gate, stuck inside the cover where it all began
                <button
                  className="qg-slot"
                  tabIndex={open ? 0 : -1}
                  aria-hidden={!open}
                  aria-label="Ticket gate"
                  onClick={(e) => {
                    e.stopPropagation()
                    openGate()
                  }}
                  lang="en"
                >
                  <span className="qg-jp" lang="ja">
                    改札
                  </span>
                  <i className="qg-mouth" />
                  <span className="qg-en">insert ticket</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="viewer-ui" ref={ui}>
        <button className="round-btn v-close" onClick={close} aria-label={t('common.close')}>
          <Icon name="close" color={C.ink} size={22} />
        </button>
        <div className="v-bar">
          <button className="round-btn" onClick={() => go(-1)} aria-label={t('vol.prev')}>
            <Icon name="chev" color={C.ink} size={24} style={{ transform: 'scaleX(-1)' }} />
          </button>
          <div className="v-meta">
            <span className="v-count">
              <b style={{ color }}>{String(vol.n).padStart(2, '0')}</b> / {VOLUMES.length}
            </span>
            <span className="v-hint">{t(open ? 'vol.hintClose' : 'vol.hintOpen')}</span>
          </div>
          <button className="round-btn" onClick={() => go(1)} aria-label={t('vol.next')}>
            <Icon name="chev" color={C.ink} size={24} />
          </button>
        </div>
      </div>

      <ChapterPanel vol={vol} color={color} />
    </div>
  )
}
