import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { gsap } from '../../gsap'
import { C } from '../../data'
import { Icon } from '../../icons'
import { sfx } from '../../sfx'
import { NAME_MAX, safeColor } from '../../letterRules'
import { cleanTo } from '../../santa'
import { serverText, useT, type Key } from '../../i18n'
import { clientId, store } from '../message/mail'
import { reduced } from '../message/geometry'
import { centre, confetti } from '../message/confetti'
import { local, santaApi, santaPost, type Gift } from './season'
import { Present } from './Present'
import { Flip, inkOn, LetterBack } from './Letter'
import { warm } from './picture'

const PARTY = [C.teal, C.red, C.yellow, C.pink, C.blue, C.green]

/** a steady little number per letter, so it lands in the same spot and tilt every visit */
function seed(id: string, salt: number) {
  let h = 2166136261 ^ salt
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return ((h >>> 0) % 10_000) / 10_000
}

/**
 * The opening half. The big box sits there rattling until you burst it (once per season on this
 * device); its letters fly out and land scattered all across the page. Tap one and it comes up
 * close and flips over to be read. Letters written to a name are found by typing that name.
 */
export function Burst() {
  const { t } = useT()
  const small = typeof window !== 'undefined' && window.innerWidth < 760
  const [burst, setBurst] = useState(local.burst)
  const [gifts, setGifts] = useState<Gift[]>([])
  const [waiting, setWaiting] = useState<number | null>(null)
  const [more, setMore] = useState(false)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [opened, setOpened] = useState(() => new Set(local.opened()))
  const [reading, setReading] = useState<Gift | null>(null)
  const [width, setWidth] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLDivElement>(null)
  const from = useRef<{ x: number; y: number } | null>(null)
  const fresh = useRef<string[]>([])
  const bursting = useRef(false)

  const load = useCallback((p: number) => {
    setLoading(true)
    setErr(null)
    const hidden = new Set(local.reported())
    return santaApi<{ gifts: Gift[]; total: number; more: boolean }>(undefined, `?page=${p}&me=${clientId()}`)
      .then((d) => {
        const add = d.gifts.filter((g) => !hidden.has(g.id))
        fresh.current.push(...add.map((g) => g.id))
        setGifts((prev) => {
          const have = new Set(prev.map((g) => g.id))
          return [...prev, ...add.filter((g) => !have.has(g.id))]
        })
        setMore(d.more)
        setPage(p)
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    // the count includes letters written to a name, so the box isn't "empty" when only those exist
    santaApi<{ total: number }>(undefined, '?count')
      .then((d) => setWaiting(d.total))
      .catch(() => {})
    load(0)
  }, [load])

  // the field is as wide as the page allows; the letters are laid out from that width
  useLayoutEffect(() => {
    const el = field.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [burst])

  const W = small ? 116 : 156
  const H = Math.round(W * 0.68)
  const spots = useMemo(() => {
    const at = new Map<string, { x: number; y: number; r: number }>()
    if (!width) return { at, height: 0 }
    // a few letters still spread right across the page; lots of them fill it row by row
    const fit = Math.max(2, Math.floor(width / (W * 0.86)))
    const cols = Math.max(1, Math.min(fit, gifts.length))
    const cellW = width / cols
    const sparse = cols < fit
    const cellH = H * (sparse ? 1.25 : 0.9)
    gifts.forEach((g, i) => {
      const row = Math.floor(i / cols)
      // every other row shifts half a step, like letters tipped out of a sack
      const col = (i % cols) + (row % 2 && !sparse ? 0.5 : 0)
      const jx = (seed(g.id, 1) - 0.5) * Math.min(cellW - W * 0.6, cellW * 0.45)
      const jy = (seed(g.id, 2) - 0.5) * cellH * (sparse ? 0.9 : 0.5)
      const x = Math.min(width - W, Math.max(0, col * cellW + (cellW - W) / 2 + jx))
      at.set(g.id, { x, y: row * cellH + 20 + jy, r: (seed(g.id, 3) - 0.5) * 34 })
    })
    const rows = Math.ceil(gifts.length / cols)
    return { at, height: rows * cellH + H * 0.5 + 40 }
  }, [gifts, width, W, H])

  // letters that just arrived come flying: out of the box when it bursts, or up from below
  useLayoutEffect(() => {
    if (!burst || !field.current || !width || !fresh.current.length) return
    const els = fresh.current
      .map((id) => field.current!.querySelector<HTMLElement>(`[data-id="${id}"]`))
      .filter((el): el is HTMLElement => !!el)
    fresh.current = []
    if (reduced()) return void gsap.fromTo(els, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 })
    const o = from.current
    from.current = null
    els.forEach((el, i) => {
      const c = centre(el)
      gsap.fromTo(
        el,
        o
          ? { x: o.x - c.x, y: o.y - c.y, scale: 0.15, rotation: gsap.utils.random(-540, 540), autoAlpha: 0 }
          : { y: 80, scale: 0.5, rotation: gsap.utils.random(-90, 90), autoAlpha: 0 },
        {
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          autoAlpha: 1,
          duration: o ? gsap.utils.random(0.9, 1.4) : 0.7,
          ease: o ? 'power3.out' : 'back.out(1.3)',
          delay: Math.min(i * (o ? 0.018 : 0.03), 1.4),
        },
      )
    })
  }, [burst, gifts, width])

  const pop = () => {
    if (bursting.current || burst || loading || !box.current) return
    bursting.current = true
    const el = box.current
    const q = gsap.utils.selector(el)
    const c = centre(el)
    const tl = gsap.timeline({
      onComplete: () => {
        from.current = { x: c.x, y: c.y }
        fresh.current = gifts.map((g) => g.id)
        local.setBurst()
        flushSync(() => setBurst(true))
        sfx.jingle(0.8)
      },
    })
    // it rattles harder and harder...
    for (let i = 0; i < 9; i++) {
      const k = (i + 1) / 9
      tl.to(el, { x: (i % 2 ? 1 : -1) * 9 * k, rotation: (i % 2 ? 1 : -1) * 5 * k, duration: 0.07, ease: 'sine.inOut' })
      if (i % 3 === 0) tl.call(() => sfx.clack(0.8 + k * 0.6), [], '<')
    }
    tl.to(el, { x: 0, rotation: 0, scaleX: 1.12, scaleY: 0.86, duration: 0.16, ease: 'power2.in', transformOrigin: '50% 100%' })
    // ...then bang
    tl.call(() => {
      sfx.crack()
      sfx.boing()
      for (let i = 0; i < 4; i++) confetti(c.x, c.y, { n: 30, spread: 360, angle: 0, reach: 220 + i * 90, size: 10, fall: 80, duration: 1.6, colors: PARTY })
    })
    tl.to(q('.pr-lid'), { y: -window.innerHeight * 0.7, x: 60, rotation: 260, duration: 0.9, ease: 'power2.out' })
    tl.to(q('.pr-lid'), { autoAlpha: 0, duration: 0.3 }, '-=0.3')
    tl.to(q('.pr-body'), { scaleX: 1.3, scaleY: 0.2, autoAlpha: 0, duration: 0.35, ease: 'power2.in' }, '<-0.6')
    tl.to('.ss-ready > :not(.ss-bigbox-wrap)', { autoAlpha: 0, y: 20, duration: 0.25 }, '<')
    if (reduced()) tl.progress(1)
  }

  const read = (g: Gift) => {
    setReading(g)
    if (!opened.has(g.id)) {
      local.open(g.id)
      setOpened((s) => new Set(s).add(g.id))
    }
  }
  const stopReading = useCallback(() => setReading(null), [])
  const reported = (g: Gift) => {
    local.report(g.id)
    setGifts((list) => list.filter((x) => x.id !== g.id))
  }
  const found = (list: Gift[]) => {
    const hidden = new Set(local.reported())
    const add = list.filter((g) => !hidden.has(g.id)).map((g) => ({ ...g, forYou: true }))
    // they join the front of the pile, where they're easy to spot
    setGifts((prev) => {
      const have = new Set(prev.map((g) => g.id))
      const news = add.filter((g) => !have.has(g.id))
      fresh.current.push(...news.map((g) => g.id))
      return [...news, ...prev]
    })
  }

  const n = waiting ?? 0
  const k = gifts.filter((g) => opened.has(g.id)).length

  if (!burst) {
    return (
      <div className="ss-ready" data-intro="ui" key="ready">
        <div className="ss-bigbox-wrap">
          <button className="ss-bigbox-btn" onClick={pop} disabled={loading || !n} aria-label={t('santa.openBox')}>
            <Present ref={box} wrap={C.teal} ribbon={C.red} size={small ? 190 : 260} className={`ss-bigbox${n ? ' is-tremble' : ''}`} />
          </button>
        </div>
        <p className="ss-count">{loading ? t('santa.loading') : err ? serverText(err, t) : n ? t('santa.readyN', { n }) : t('santa.ready0')}</p>
        {err ? (
          <button className="msg-btn ss-btn" onClick={() => load(0)}>
            {t('msg.retry')}
          </button>
        ) : (
          !!n && (
            <button className="msg-btn ss-btn" onClick={pop} disabled={loading}>
              <Icon name="bow" color="#fff" size={22} />
              {t('santa.openBox')}
            </button>
          )
        )}
      </div>
    )
  }

  return (
    <div className="ss-open" data-intro="ui" key="open">
      <FindMine onFound={found} />
      <p className="ss-count">{gifts.length ? t('santa.opened', { k, n: gifts.length }) : t('santa.ready0')}</p>
      <div className="ss-field" ref={field} style={{ height: spots.height }}>
        {gifts.map((g) => {
          const s = spots.at.get(g.id)
          if (!s) return null
          const wrap = safeColor(g.wrap)
          const isRead = opened.has(g.id)
          return (
            <button
              key={g.id}
              data-id={g.id}
              className={`ss-env${isRead ? ' is-read' : ''}${g.forYou ? ' is-for-you' : ''}${reading?.id === g.id ? ' is-away' : ''}`}
              style={{ left: s.x, top: s.y, width: W, height: H, '--r': `${s.r}deg` } as CSSProperties}
              onClick={() => read(g)}
              onPointerEnter={() => warm(g.pic?.url)}
              onFocus={() => warm(g.pic?.url)}
              aria-label={t('santa.letterTo', { to: g.to ?? t('santa.toEveryone') })}
            >
              <LetterBack wrap={wrap} inside={g.inside} to={g.to}>
                {isRead && (
                  <span className="sv-read-mark" aria-hidden="true">
                    <Icon name="opened" color="#fff" size={14} />
                  </span>
                )}
                {g.pic && (
                  <span className="sv-has-pic" aria-hidden="true">
                    <Icon name="picture" color="#fff" size={14} />
                  </span>
                )}
              </LetterBack>
            </button>
          )
        })}
      </div>
      {err && <p className="wr-hint is-bad">{serverText(err, t)}</p>}
      {more && (
        <button className="msg-btn is-ghost ss-more" onClick={() => load(page + 1)} disabled={loading}>
          <Icon name="envelope" color={C.teal} size={22} />
          {loading ? t('santa.loading') : t('santa.more')}
        </button>
      )}
      {reading && (
        <Reader
          key={reading.id}
          gift={reading}
          source={() => field.current?.querySelector<HTMLElement>(`[data-id="${reading.id}"]`) ?? null}
          tilt={spots.at.get(reading.id)?.r ?? 0}
          onClose={stopReading}
          onReported={reported}
        />
      )}
    </div>
  )
}

/** "Letters for you": type the name someone would know you by. */
function FindMine({ onFound }: { onFound: (g: Gift[]) => void }) {
  const { t } = useT()
  const [name, setName] = useState(() => store.read<string>('sl-santa-me-name', ''))
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState<string | null>(null)
  const look = (e: FormEvent) => {
    e.preventDefault()
    const n = cleanTo(name)
    if (!n || busy) return
    store.write('sl-santa-me-name', name)
    setBusy(true)
    santaApi<{ gifts: Gift[] }>(undefined, `?for=${encodeURIComponent(n)}&me=${clientId()}`)
      .then((d) => {
        const c = d.gifts.length
        setSaid(c === 0 ? t('santa.found0', { name: n }) : c === 1 ? t('santa.found1', { name: n }) : t('santa.foundN', { n: c, name: n }))
        if (c) {
          sfx.chime(1.3, 0.6)
          onFound(d.gifts)
        }
      })
      .catch((e: Error) => setSaid(serverText(e.message, t)))
      .finally(() => setBusy(false))
  }
  return (
    <form className="ss-card ss-find" onSubmit={look}>
      <h3>
        <Icon name="heart" color={C.red} size={20} />
        {t('santa.findTitle')}
      </h3>
      <p>{t('santa.findHint')}</p>
      <div className="ss-find-row">
        <input value={name} maxLength={NAME_MAX} placeholder={t('santa.findPlaceholder')} onChange={(e) => setName(e.target.value)} aria-label={t('santa.findPlaceholder')} />
        <button className="msg-btn ss-btn" disabled={!cleanTo(name) || busy}>
          <Icon name="search" color="#fff" size={18} />
          {t('santa.find')}
        </button>
      </div>
      {said && (
        <p className="ss-find-said" role="status">
          {said}
        </p>
      )}
    </form>
  )
}

/**
 * One letter, up close. It lifts off the pile from exactly where it lay, grows into the middle
 * of the screen and flips over; closing flips it back and puts it down where it was.
 */
function Reader({
  gift,
  source,
  tilt,
  onClose,
  onReported,
}: {
  gift: Gift
  source: () => HTMLElement | null
  tilt: number
  onClose: () => void
  onReported: (g: Gift) => void
}) {
  const { t } = useT()
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const leaving = useRef(false)
  // the latest way to find the letter on the pile, without restarting the animations
  const src = useRef(source)
  src.current = source
  const [reported, setReported] = useState(false)
  const wrap = safeColor(gift.wrap)
  const name = t(`santa.in.${gift.inside}` as Key)

  /** how far the letter on the pile is from where the reader card sits, and how much smaller */
  const offset = useCallback(
    (card: HTMLElement) => {
      const s = src.current()
      if (!s) return null
      const a = s.getBoundingClientRect()
      const keep = gsap.getProperty(card, 'transform')
      gsap.set(card, { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 })
      const b = card.getBoundingClientRect()
      card.style.transform = String(keep)
      return { x: a.left + a.width / 2 - (b.left + b.width / 2), y: a.top + a.height / 2 - (b.top + b.height / 2), sx: a.width / b.width, sy: a.height / b.height }
    },
    [],
  )

  useLayoutEffect(() => {
    const root = ref.current!
    const card = root.querySelector<HTMLElement>('.sv-card')!
    const inner = root.querySelector<HTMLElement>('.sv-in')!
    const o = offset(card)
    const tl = gsap.timeline()
    tl.fromTo(root, { backgroundColor: 'rgba(29,27,44,0)' }, { backgroundColor: 'rgba(29,27,44,0.5)', duration: 0.4 }, 0)
    tl.fromTo(root.querySelector('.ss-uw-close'), { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, 0.7)
    if (o && !reduced()) {
      tl.fromTo(card, { x: o.x, y: o.y, scaleX: o.sx, scaleY: o.sy, rotation: tilt }, { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, duration: 0.6, ease: 'power3.inOut' }, 0)
      tl.call(() => sfx.whoosh(0.4, true, 0.12), [], 0)
      tl.call(() => sfx.fold(0), [], 0.45)
      tl.fromTo(inner, { rotationY: 0 }, { rotationY: 180, duration: 0.75, ease: 'back.out(1.1)' }, 0.35)
      tl.call(
        () => {
          const p = centre(card)
          confetti(p.x, p.y, { n: 18, spread: 360, reach: 160, colors: [wrap, C.yellow, C.teal] })
        },
        [],
        0.9,
      )
    } else {
      gsap.set(inner, { rotationY: 180 })
      tl.fromTo(card, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0)
    }
    tl.call(() => close.current?.focus({ preventScroll: true }), [], 0.75)
    return () => void tl.kill()
  }, [offset, tilt, wrap])

  const leave = useCallback(
    (then?: () => void) => {
      if (leaving.current) return
      leaving.current = true
      const root = ref.current!
      const card = root.querySelector<HTMLElement>('.sv-card')!
      const inner = root.querySelector<HTMLElement>('.sv-in')!
      const o = then ? null : offset(card)
      const tl = gsap.timeline({
        onComplete: () => {
          then?.()
          onClose()
        },
      })
      tl.to(root, { backgroundColor: 'rgba(29,27,44,0)', duration: 0.45 }, 0)
      tl.to(root.querySelector('.ss-uw-close'), { autoAlpha: 0, duration: 0.15 }, 0)
      if (o && !reduced()) {
        tl.call(() => sfx.fold(0), [], 0)
        tl.to(inner, { rotationY: 0, duration: 0.45, ease: 'power2.inOut' }, 0)
        tl.to(card, { x: o.x, y: o.y, scaleX: o.sx, scaleY: o.sy, rotation: tilt, duration: 0.5, ease: 'power3.inOut' }, 0.2)
      } else {
        tl.to(card, { autoAlpha: 0, scale: 0.9, duration: 0.25 }, 0)
      }
    },
    [offset, onClose, tilt],
  )

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null
    const key = (e: KeyboardEvent) => e.key === 'Escape' && leave()
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('keydown', key)
      back?.focus?.({ preventScroll: true })
    }
  }, [leave])

  const report = () => {
    setReported(true)
    santaPost({ action: 'report', id: gift.id, me: clientId() }).catch(() => {})
    window.setTimeout(() => leave(() => onReported(gift)), 900)
  }

  const front = (
    <div className="sv-front sv-show" style={{ '--w': wrap } as CSSProperties}>
      <div className="sv-head">
        <span className="sv-to-line">
          <span>{t('santa.to')}</span> <b>{gift.to ?? t('santa.toEveryone')}</b>
        </span>
        <span className="sv-stamp" aria-hidden="true">
          <Icon name={gift.inside} color="#fff" size="62%" />
        </span>
      </div>
      {gift.pic && (
        <div className="sv-pic" style={{ aspectRatio: `${gift.pic.w} / ${gift.pic.h}` }}>
          <img src={gift.pic.url} width={gift.pic.w} height={gift.pic.h} alt={t('santa.picAlt')} decoding="async" />
        </div>
      )}
      <p className="sv-text">{gift.text}</p>
      <p className="sv-from">{gift.mine ? t('santa.fromYou') : `— ${gift.from ?? t('msg.anon')}`}</p>
      <p className="sv-got">
        <Icon name={gift.inside} color={inkOn(wrap)} size={20} />
        {t('santa.youGot', { inside: name })}
      </p>
      {!gift.mine && (
        <button className="ss-link ss-report" onClick={report} disabled={reported}>
          {reported ? t('msg.reported') : t('msg.report')}
        </button>
      )}
    </div>
  )

  // on <body>: the page underneath is moved with transforms, which would trap a fixed overlay
  return createPortal(
    <div className="ss-uw" ref={ref} role="dialog" aria-modal="true" aria-label={t('santa.youGot', { inside: name })}>
      <div className="ss-uw-stage" onClick={(e) => e.target === e.currentTarget && leave()}>
        <div className="ss-uw-hold">
          <button className="ss-uw-close" ref={close} onClick={() => leave()} aria-label={t('common.close')}>
            <Icon name="close" color={C.ink} size={22} />
          </button>
          <Flip reader front={front} back={<LetterBack wrap={wrap} inside={gift.inside} to={gift.to} />} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
