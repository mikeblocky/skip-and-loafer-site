import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type FormEvent } from 'react'
import { gsap, Draggable } from '../../gsap'
import { C } from '../../data'
import { Icon, type IconName } from '../../icons'
import { sfx } from '../../sfx'
import { reducedMotion, useSettings } from '../../settings'
import { questMusic, type MotifName } from '../../questMusic'
import type { Mode } from '../Stage'
import { DIGS, LETTERS, PAGES, RIDDLES, TORII_VOLUME, WISHES, past, onQuestHint, buryGifts, liveTicket, normCode, onOpenGate, quest, type Gift, type Page } from '../../quest'
import { Dialogue } from './Dialogue'
import { ARRIVE, BLESS, BOX, BOX_AFTER, CALL, CLOCK, CONFESS, HAT_TOO, LETTER, MENDED, PIECES, RIDDLE_CHAPTER, SEAL, SET, SET_AFTER, THAW, UENO, WALK, WHEEL, type Scene } from './story'

/** the tabs, as the bookmarks draw them */
const TAB: Record<Page, { label: string; color: string; icon: IconName }> = {
  countdown: { label: 'Countdown', color: C.pink, icon: 'clock' },
  volumes: { label: 'Volumes', color: C.blue, icon: 'book' },
  birthdays: { label: 'Birthdays', color: C.green, icon: 'bow' },
  anime: { label: 'Anime', color: C.orange, icon: 'film' },
  message: { label: 'Message', color: C.red, icon: 'envelope' },
}
/** what's inside each present, in a word */
const SHORT: Record<Page, string> = { countdown: 'coffee', volumes: 'bookmark', birthdays: 'shortcake', anime: 'popcorn', message: 'stamps' }

type Phase = 'idle' | 'gate' | 'scene' | 'sinking' | 'rising' | 'mend' | 'list' | 'key'

const useQuest = () => useSyncExternalStore(quest.subscribe, quest.get)

// ── the ticket gate ──────────────────────────────────────────────────────

function Gate({ onClose, onPass }: { onClose: () => void; onPass: () => void }) {
  // already been through once: say so, and offer to play it again (the key is kept)
  const [used, setUsed] = useState(() => quest.get().part1)
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const card = useRef<HTMLFormElement>(null)
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    input.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), onClose())
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      before?.focus?.({ preventScroll: true })
    }
  }, [onClose])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const t = liveTicket()
    const had = quest.get().ticket
    if (t && normCode(code) === normCode(t.code)) return onPass()
    setErr(
      !had
        ? 'The gate stays shut. You’ll need a ticket first.'
        : !t
          ? 'This ticket has expired. Scratch a fresh one.'
          : 'That code doesn’t match your ticket.',
    )
    sfx.clank(0.8)
    gsap.fromTo(card.current, { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.3)' })
  }

  const replay = () => {
    quest.update((s) => ({ ...s, part1: 'none', scraps: [], solved: [], gifts: [] }))
    setUsed('none')
    sfx.rustle()
    window.setTimeout(() => input.current?.focus({ preventScroll: true }), 50)
  }

  if (used !== 'none')
    return (
      <div className="qs qg" role="dialog" aria-modal="true" aria-label="Ticket gate" lang="en">
        <div className="qg-backdrop" onClick={onClose} />
        <div className="qg-card">
          <span className="qg-jp" lang="ja">
            改札
          </span>
          <h3>Ticket gate</h3>
          <p>
            {used === 'blessed'
              ? 'This gate has already let you through. Part 1 is finished, and the Key of Ueno is yours.'
              : 'This gate has already let you through. Part 1 is still going: the checklist in the corner says what’s next.'}
          </p>
          <div className="qg-row">
            <button type="button" className="sx-btn" style={{ '--c': C.ink } as CSSProperties} onClick={onClose}>
              {used === 'blessed' ? 'Close' : 'Carry on'}
            </button>
            <button type="button" className="sx-btn is-strong" style={{ '--c': C.sky } as CSSProperties} onClick={replay}>
              Play part 1 again
            </button>
          </div>
          <p className="qg-fine">Starting again needs a freshly scratched ticket. Your key stays yours.</p>
        </div>
      </div>
    )

  return (
    <div className="qs qg" role="dialog" aria-modal="true" aria-label="Ticket gate" lang="en">
      <div className="qg-backdrop" onClick={onClose} />
      <form className="qg-card" ref={card} onSubmit={submit}>
        <span className="qg-jp" lang="ja">
          改札
        </span>
        <h3>Ticket gate</h3>
        <p>Type in the code from your ticket.</p>
        <input
          ref={input}
          value={code}
          onChange={(e) => (setCode(e.target.value.toUpperCase()), setErr(''))}
          placeholder="UENO-XXXX-XXXX"
          aria-label="Ticket code"
          aria-invalid={!!err}
          aria-describedby="qg-err"
          autoComplete="off"
          spellCheck={false}
          maxLength={20}
        />
        <p className="qg-err" id="qg-err" role="alert">
          {err}
        </p>
        <div className="qg-row">
          <button type="button" className="sx-btn" style={{ '--c': C.ink } as CSSProperties} onClick={onClose}>
            Not now
          </button>
          <button type="submit" className="sx-btn is-strong" style={{ '--c': C.sky } as CSSProperties}>
            Go through
          </button>
        </div>
      </form>
    </div>
  )
}

/** a phone-sized screen, where the route and the presents take up the bottom of the page */
const narrow = () => window.innerWidth < 760
/**
 * Where a drift sits, top to bottom. Drifts are buried between 34% and 84% of the way down; on a
 * phone that's squeezed into 18%–50%, above the route in the corner, so none end up hidden.
 */
const driftY = (y: number) => (narrow() ? 0.18 + ((y - 0.34) / 0.5) * 0.32 : y)

// ── task 1: catch the torn pieces of the list ────────────────────────────

/**
 * A torn scrap of the list, blowing across the page now and then. Click it to catch it.
 * Missed? It comes round again a few seconds later.
 */
function Scrap({ onCatch }: { onCatch: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [flying, setFlying] = useState(false)
  const caught = useRef(false)
  const catchRef = useRef(onCatch)
  catchRef.current = onCatch

  useEffect(() => {
    let wait = 0
    let tl: gsap.core.Timeline | null = null
    const launch = () => {
      const el = ref.current
      if (!el || caught.current) return
      setFlying(true)
      const vw = window.innerWidth
      const vh = window.innerHeight
      const ltr = Math.random() < 0.5
      // on a phone the route sits along the bottom: keep to the upper half so it never flies behind it
      const y = vh * (narrow() ? 0.2 + Math.random() * 0.3 : 0.25 + Math.random() * 0.45)
      if (reducedMotion()) {
        // no blowing about: it just lies there near an edge until someone picks it up
        gsap.set(el, { x: ltr ? vw * 0.08 : vw * 0.86, y, rotation: -8, autoAlpha: 1 })
        return
      }
      tl = gsap.timeline({
        onComplete: () => {
          setFlying(false)
          wait = window.setTimeout(launch, 5000 + Math.random() * 6000)
        },
      })
      tl.set(el, { x: ltr ? -90 : vw + 30, y, rotation: 0, autoAlpha: 1 })
      tl.call(() => sfx.whoosh(1.2, true, 0.06, ltr ? -0.6 : 0.6))
      tl.to(el, { x: ltr ? vw + 30 : -90, duration: 6.5, ease: 'none' }, 0)
      // tumbling and dipping on the wind
      tl.to(el, { y: `+=${60 + Math.random() * 60}`, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: 5 }, 0)
      tl.to(el, { rotation: ltr ? 540 : -540, duration: 6.5, ease: 'none' }, 0)
    }
    wait = window.setTimeout(launch, 2000 + Math.random() * 4000)
    return () => {
      clearTimeout(wait)
      tl?.kill()
    }
  }, [])

  const grab = () => {
    if (caught.current) return
    caught.current = true
    const el = ref.current!
    gsap.killTweensOf(el)
    sfx.rustle()
    sfx.chime(1.4, 0.7)
    const hud = document.querySelector('.qh')?.getBoundingClientRect()
    gsap.to(el, {
      x: hud ? hud.left + 30 : 30,
      y: hud ? hud.top : window.innerHeight - 60,
      rotation: 0,
      scale: 0.3,
      autoAlpha: 0,
      duration: 0.6,
      ease: 'power3.in',
      onComplete: () => catchRef.current(),
    })
  }

  return (
    <button
      ref={ref}
      className="qsc"
      onClick={grab}
      tabIndex={flying ? 0 : -1}
      aria-hidden={!flying}
      aria-label="A torn piece of paper"
      lang="en"
    >
      <i />
      <i />
      <i />
    </button>
  )
}

// ── task 2: tape the list back together ──────────────────────────────────

/** how deep the tears go, in px */
const TEAR = 16
/** the tear lines between the pieces: jagged teeth across the paper (the very top and bottom are straight) */
function useTears() {
  return useMemo(
    () =>
      Array.from({ length: PAGES.length + 1 }, (_, k) =>
        Array.from({ length: 11 }, (_, i) =>
          k === 0 || k === PAGES.length ? 0 : i % 2 ? TEAR * (0.6 + Math.random() * 0.4) : TEAR * Math.random() * 0.35,
        ),
      ),
    [],
  )
}
/** a piece's outline: the tear above it along the top, the tear below it along the bottom */
function tornClip(top: number[], bottom: number[]) {
  const n = top.length - 1
  const t = top.map((v, i) => `${((i / n) * 100).toFixed(1)}% ${v.toFixed(1)}px`)
  const b = bottom.map((_, i) => `${(((n - i) / n) * 100).toFixed(1)}% calc(100% - ${(TEAR - bottom[n - i]).toFixed(1)}px)`)
  return `polygon(${[...t, ...b].join(', ')})`
}

function ListStrip({ page, top, bottom }: { page: Page; top: number[]; bottom: number[] }) {
  const w = WISHES[page]
  const tab = TAB[page]
  return (
    <span className="ql-strip" style={{ clipPath: tornClip(top, bottom) }}>
      <span className="ql-icon" style={{ '--c': tab.color } as CSSProperties}>
        <Icon name={tab.icon} color={tab.color} size={18} />
      </span>
      <span className="ql-line">
        <b>{tab.label}</b> wants {w.gift}
        <small>{w.why}</small>
      </span>
    </span>
  )
}

/** the list: in pieces to tape together, or (solved) whole, to read */
function List({
  solved: start,
  lit,
  onSolved,
  onClose,
}: {
  solved: boolean
  /** which of ???'s riddles on the back are solved (lanterns lit), once the back has been found */
  lit?: number[]
  onSolved?: () => void
  onClose: () => void
}) {
  const [flipped, setFlipped] = useState(lit !== undefined && lit.length < RIDDLES.length)
  const tears = useTears()
  const [order, setOrder] = useState<number[]>(() => {
    if (start) return PAGES.map((_, i) => i)
    let o: number[]
    do o = [...PAGES.keys()].sort(() => Math.random() - 0.5)
    while (o.every((v, i) => v === i))
    return o
  })
  const [pick, setPick] = useState<number | null>(null)
  const [solved, setSolved] = useState(start)
  const close = useRef<HTMLButtonElement>(null)
  const closeFn = useRef(onClose)
  closeFn.current = onClose

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    close.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), closeFn.current())
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      before?.focus?.({ preventScroll: true })
    }
  }, [])

  const press = (slot: number) => {
    if (solved) return
    if (pick === null) {
      sfx.tick(1.3)
      return setPick(slot)
    }
    if (pick === slot) return setPick(null)
    const o = [...order]
    ;[o[pick], o[slot]] = [o[slot], o[pick]]
    setOrder(o)
    setPick(null)
    sfx.rustle()
    if (o.every((v, i) => v === i)) {
      setSolved(true)
      sfx.stamp()
      window.setTimeout(() => sfx.jingle(0.6), 250)
      window.setTimeout(() => onSolved?.(), 1500)
    }
  }

  return (
    <div className="qs ql" role="dialog" aria-modal="true" aria-label="The Secret Santa list" lang="en">
      <div className="qg-backdrop" onClick={onClose} />
      <button className="round-btn ql-x" ref={close} onClick={onClose} aria-label="Close">
        <Icon name="close" color={C.ink} size={22} />
      </button>
      <div className="ql-card">
        <h3>
          <Icon name="list" color={C.red} size={22} />
          Secret Santa list
        </h3>
        <p className="ql-help">
          {flipped
            ? 'On the back, in handwriting that isn’t Shima’s.'
            : solved
              ? 'Who wished for what. Match each present to its tab.'
              : 'Tap two pieces to swap them, until every torn edge fits the one above it.'}
        </p>
        <ol className={`ql-paper${solved ? ' is-whole' : ''}`} hidden={flipped}>
          {order.map((p, slot) => (
            <li key={p}>
              <button
                className={`ql-piece${pick === slot ? ' is-picked' : ''}`}
                onClick={() => press(slot)}
                disabled={solved}
                aria-pressed={pick === slot}
                aria-label={`Piece: ${TAB[PAGES[p]].label} wants ${WISHES[PAGES[p]].gift}`}
              >
                <ListStrip page={PAGES[p]} top={tears[p]} bottom={tears[p + 1]} />
              </button>
            </li>
          ))}
        </ol>
        {solved && !flipped && <span className="ql-sign">— Santa (Shima)</span>}
        {flipped && lit !== undefined && (
          // the back of the list, in someone else's handwriting: three riddles, three lanterns
          <div className="ql-back">
            <ol>
              {RIDDLES.map((r, i) => (
                <li key={i} className={lit.includes(i) ? 'is-done' : 'is-now'}>
                  <Lantern on={lit.includes(i)} />
                  {r.text}
                </li>
              ))}
            </ol>
            <span className="ql-sign">— ???</span>
          </div>
        )}
        {lit !== undefined && (
          <button className="qh-list" onClick={() => (setFlipped(!flipped), sfx.rustle())}>
            <Icon name="replay" color={C.red} size={15} />
            {flipped ? 'Turn it back over' : 'Turn it over'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── task 3: dig up the presents ──────────────────────────────────────────

/** a drift of snow near the edge of a page, with a present underneath */
function Mound({ gift, index, onFound }: { gift: Gift; index: number; onFound: (i: number) => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const digs = useRef(0)
  const dig = () => {
    const el = ref.current!
    digs.current++
    sfx.rustle()
    sfx.pop(0.55 + digs.current * 0.1)
    // a puff of snow
    const r = el.getBoundingClientRect()
    for (let k = 0; k < 9; k++) {
      const p = document.createElement('i')
      p.className = 'qm-flake'
      document.body.appendChild(p)
      gsap.set(p, { left: r.left + r.width / 2, top: r.top + r.height * 0.6 })
      gsap.to(p, {
        x: gsap.utils.random(-70, 70),
        y: gsap.utils.random(-90, -30),
        opacity: 0,
        scale: gsap.utils.random(0.5, 1.4),
        duration: gsap.utils.random(0.5, 0.9),
        ease: 'power2.out',
        onComplete: () => p.remove(),
      })
    }
    const left = DIGS - digs.current
    gsap.fromTo(el.firstElementChild, { scaleY: 0.6 + left * 0.1, scaleX: 1.15 }, { scaleY: 0.4 + left * 0.2, scaleX: 1, transformOrigin: '50% 100%', duration: 0.5, ease: 'elastic.out(1, 0.4)' })
    if (left <= 0) onFound(index)
  }
  return (
    <button ref={ref} className="qm" style={{ left: `${gift.x * 100}vw`, top: `${driftY(gift.y) * 100}vh` }} onClick={dig} aria-label="A drift of snow" lang="en">
      <Icon name="cloud" color="#B9CCE0" size={46} style={{ fill: '#fff', fillOpacity: 1 }} />
    </button>
  )
}

// ── task 4: send each present to the tab that wished for it ──────────────

function Present({ gift, index, onSent, onMiss }: { gift: Gift; index: number; onSent: (i: number) => void; onMiss: (tab: Page) => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [hint, setHint] = useState<string | null>(null)
  const w = WISHES[gift.to]
  const sentRef = useRef(onSent)
  sentRef.current = onSent
  const onMissRef = useRef(onMiss)
  onMissRef.current = onMiss

  const send = useCallback(
    (el: HTMLElement, target: HTMLElement) => {
      const a = el.getBoundingClientRect()
      const b = target.getBoundingClientRect()
      sfx.whoosh(0.4, true, 0.14)
      gsap.to(el, {
        x: `+=${b.left + b.width / 2 - (a.left + a.width / 2)}`,
        y: `+=${b.top + b.height / 2 - (a.top + a.height / 2)}`,
        scale: 0.2,
        rotation: 360,
        opacity: 0,
        duration: 0.55,
        ease: 'power3.in',
        onComplete: () => {
          sfx.jingle(0.5)
          // the tab gives a happy little jump
          gsap.fromTo(target, { scale: 1.18 }, { scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.4)', clearProps: 'scale' })
          sentRef.current(index)
        },
      })
    },
    [index],
  )

  useEffect(() => {
    const el = ref.current!
    // drops into the sack (done here, not in CSS, since GSAP owns this element's transform)
    if (!reducedMotion()) gsap.from(el, { y: -120, scale: 0.3, rotation: -30, opacity: 0, duration: 0.7, ease: 'back.out(1.6)' })
    const [d] = Draggable.create(el, {
      type: 'x,y',
      zIndexBoost: true,
      cursor: 'var(--cur-grab)',
      activeCursor: 'var(--cur-grabbing)',
      onPress: () => sfx.grab(),
      onRelease() {
        const marks = Array.from(document.querySelectorAll<HTMLElement>('.mark'))
        const hit = marks.find((m) => Draggable.hitTest(el, m, '20%'))
        const right = document.querySelector<HTMLElement>(`.mark--${gift.to}`)
        if (hit && hit === right) return send(el, right)
        if (hit) {
          const id = PAGES.find((p) => hit.classList.contains(`mark--${p}`))
          sfx.boing()
          setHint(id ? `${TAB[id].label} didn’t wish for ${SHORT[gift.to]}. Check the list.` : 'Check the list.')
          if (id) onMissRef.current(id)
        }
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.6)' })
      },
    })
    return () => void d.kill()
  }, [gift.to, send])

  return (
    <button
      ref={ref}
      className="qp"
      aria-label={`A present: ${w.gift}`}
      onClick={(e) => {
        // from the keyboard there's nothing to drag with: it goes straight to the tab that wished for it
        const right = document.querySelector<HTMLElement>(`.mark--${gift.to}`)
        if (e.detail === 0 && right) send(ref.current!, right)
        else setHint('Drag me onto the tab that wished for me.')
      }}
      onBlur={() => setHint(null)}
    >
      <Icon name={w.icon} color={C.ink} size={26} />
      <span className="qp-tag">{SHORT[gift.to]}</span>
      {hint && <span className="qp-hint">{hint}</span>}
    </button>
  )
}

// ── the route in the corner, and the chatter along the way ───────────────

/** one of ???'s lanterns: dark until its riddle is solved */
function Lantern({ on }: { on: boolean }) {
  return (
    <span className={`qn${on ? ' is-on' : ''}`} aria-label={on ? 'Lantern lit' : 'Lantern dark'}>
      <Icon name="flame" color={on ? C.amber : '#B9B2A4'} size={14} />
    </span>
  )
}

/** the letters off the backs of the tags, filling in as presents go out: U E N O and a snowflake */
function Letters({ n }: { n: number }) {
  return (
    <span className="ql-letters" aria-label={`Letters from the tags: ${LETTERS.slice(0, n).join(' ')}`}>
      {LETTERS.map((l, i) => (
        <b key={i} className={i < n ? 'is-on' : ''}>
          {l === '*' ? <Icon name="snow" color={i < n ? C.sky : '#C9C2B4'} size={13} /> : i < n ? l : ''}
        </b>
      ))}
    </span>
  )
}

/**
 * Santa's route: every task is a stop on one line, ticket to key, so it reads as one job. The stop
 * you're at says what to do; opening it shows the riddles (with their lanterns) and the letters.
 */
function Route({ onList, onSent, onMiss }: { onList: () => void; onSent: (i: number) => void; onMiss: (tab: Page) => void }) {
  const q = useQuest()
  // folded by default so it never sits on top of the page: just the route and the task at hand
  const [open, setOpen] = useState(false)
  const stage = q.part1
  const caught = q.scraps.length
  const found = q.gifts.filter((g) => g.found).length
  const sent = q.gifts.filter((g) => g.sent).length
  const sack = q.gifts.map((g, i) => ({ g, i })).filter(({ g }) => g.found && !g.sent)
  const lit = q.solved
  const now =
    stage === 'scraps'
      ? `Catch the torn pieces of the list as they blow past, one on every page (${caught}/5)`
      : stage === 'mend'
        ? 'Tape the list back together'
        : stage === 'riddles'
          ? `Solve the riddles on the back of the list to light ???’s lanterns, in any order (${lit.length}/3)`
          : found < 5
            ? `Dig the presents out of the snow drifts at the edges of the pages (${found}/5)`
            : `Send each present to the tab that wished for it. The list says who (${sent}/5)`
  const stops: { icon: IconName; label: string; done: boolean; at: boolean; count?: string }[] = [
    { icon: 'ticket', label: 'Ticket', done: true, at: false },
    { icon: 'list', label: 'The list', done: past(stage, 'mend'), at: stage === 'scraps' || stage === 'mend', count: stage === 'scraps' ? `${caught}/5` : undefined },
    { icon: 'flame', label: 'Lanterns', done: past(stage, 'riddles'), at: stage === 'riddles', count: stage === 'riddles' ? `${lit.length}/3` : undefined },
    { icon: 'bow', label: 'Presents', done: sent === 5, at: stage === 'dig', count: stage === 'dig' ? `${sent}/5` : undefined },
    { icon: 'key', label: 'Key', done: false, at: false },
  ]
  return (
    <aside className="qh" lang="en" aria-label="Secret Santa">
      <div className={`qh-card${open ? ' is-open' : ''}`}>
        <button className="qh-head" onClick={() => setOpen(!open)} aria-expanded={open}>
          <Icon name="snow" color={C.sky} size={18} />
          <span>Santa’s route</span>
          <Icon name="chev" color={C.ink} size={16} style={{ rotate: open ? '90deg' : '-90deg' }} />
        </button>
        <ol className="qr">
          {stops.map((st) => (
            <li key={st.label} className={st.done ? 'is-done' : st.at ? 'is-at' : ''} title={st.label}>
              <span className="qr-dot">
                <Icon name={st.done ? 'check' : st.icon} color={st.done ? '#fff' : st.at ? C.red : '#B9B2A4'} size={14} />
              </span>
              {st.count && <small>{st.count}</small>}
            </li>
          ))}
        </ol>
        <p className="qh-now">{now}</p>
        {open && stage === 'riddles' && (
          <ul className="qh-tasks">
            {RIDDLES.map((r, i) => (
              <li key={i} className={lit.includes(i) ? 'is-done' : 'is-now'}>
                <Lantern on={lit.includes(i)} />
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        )}
        {open && stage === 'dig' && (
          <p className="qh-letters">
            Letters on the tags so far <Letters n={sent} />
          </p>
        )}
        {open && past(stage, 'scraps') && (
          <button className="qh-list" onClick={onList}>
            <Icon name="list" color={C.red} size={15} />
            {stage === 'mend' ? 'Tape the list' : 'Read the list'}
          </button>
        )}
      </div>
      {sack.length > 0 && (
        <div className="qh-sack">
          {sack.map(({ g, i }) => (
            <Present key={i} gift={g} index={i} onSent={onSent} onMiss={onMiss} />
          ))}
        </div>
      )}
    </aside>
  )
}

/** a quick line from one of them while you play: who's talking, and what they said */
interface Bark {
  id: number
  who: 'mitsumi' | 'shima'
  text: string
}
const FACE: Record<Bark['who'], { src: string; color: string; name: string }> = {
  mitsumi: { src: '/characters/mitsumi.webp', color: C.pink, name: 'Mitsumi' },
  shima: { src: '/characters/shima.webp', color: C.sky, name: 'Shima' },
}
function Barks({ list }: { list: Bark[] }) {
  return (
    <div className="qk" aria-live="polite" lang="en">
      {list.map((b) => (
        <p key={b.id} className="qk-bubble" style={{ '--c': FACE[b.who].color } as CSSProperties}>
          <span className="qk-face" style={{ backgroundImage: `url(${FACE[b.who].src})` }} aria-hidden="true" />
          <span>
            <b>{FACE[b.who].name}</b>
            {b.text}
          </span>
        </p>
      ))}
    </div>
  )
}

// ── putting it together ──────────────────────────────────────────────────

/** a little shiver on the page when a riddle is answered: the snow loosening a bit */
function shiver() {
  if (reducedMotion()) return
  gsap.fromTo('.content', { x: -6 }, { x: 0, duration: 0.6, ease: 'elastic.out(1.2, 0.25)', clearProps: 'x' })
}

/**
 * Secret Santa, part 1. Listens for the ticket gate and the riddles' answers, plays the scenes
 * (one after another, from a queue), and through the tasks puts the blowing scraps and the snow
 * drifts on each page and the checklist in the corner. The serious theme plays the whole way
 * through, until the key is found.
 */
/** `?questmusic=0..3` on the dev server: the quest music's level to play, or null */
function devQuestMusic(): number | null {
  if (!import.meta.env.DEV) return null
  const v = new URLSearchParams(location.search).get('questmusic')
  const n = v === null || v === '' ? NaN : Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.min(3, n)) : null
}
const MOTIFS: MotifName[] = ['main', 'mitsumi', 'shima', 'mystery', 'lights']
/** `&motif=…` alongside it: which theme to bring in */
function devMotif(): MotifName | null {
  if (devQuestMusic() === null) return null
  const v = new URLSearchParams(location.search).get('motif') as MotifName | null
  return v && MOTIFS.includes(v) ? v : null
}

export function Quest({
  view: at,
  ready,
  onSink,
  onRise,
}: {
  view: Mode
  ready: boolean
  /** close the volume, put the page away and play the intro backwards; resolves once it's all gone */
  onSink: () => Promise<void>
  /** bring everything back with the intro */
  onRise: () => void
}) {
  const q = useQuest()
  // nothing of the quest is hidden on the seasonal Secret Santa tab
  const view: Page | null = at === 'santa' ? null : at
  const [phase, setPhase] = useState<Phase>('idle')
  const [scene, setScene] = useState<{ s: Scene; n: number } | null>(null)
  const queue = useRef<{ scenes: Scene[]; then: () => void }>({ scenes: [], then: () => {} })
  // little lines from the two of them while you play, so the tasks feel like one job together
  const [barks, setBarks] = useState<Bark[]>([])
  // once it's all over, it snows on the site: straight away (even with the reward switched off,
  // for the rest of this visit), and every visit after while the reward is on
  const [snowy, setSnowy] = useState(false)
  const barkId = useRef(0)
  const say = (who: Bark['who'], text: string) => {
    const id = ++barkId.current
    setBarks((b) => [...b.slice(-1), { id, who, text }])
    sfx.blip(who === 'shima' ? 0.8 : 1.25)
    window.setTimeout(() => setBarks((b) => b.filter((x) => x.id !== id)), 4200)
  }
  const voidEl = useRef<HTMLDivElement>(null)
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const go = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  /** play these scenes in order, then carry on */
  const play = (scenes: Scene[], then: () => void = () => go('idle')) => {
    queue.current = { scenes: scenes.slice(1), then }
    setScene((x) => ({ s: scenes[0], n: (x?.n ?? 0) + 1 }))
    go('scene')
  }
  const nextScene = () => {
    const { scenes, then } = queue.current
    if (scenes.length) {
      queue.current.scenes = scenes.slice(1)
      setScene((x) => ({ s: scenes[0], n: (x?.n ?? 0) + 1 }))
    } else {
      setScene(null)
      then()
    }
  }

  useEffect(
    () =>
      onOpenGate(() => {
        if (phaseRef.current !== 'idle') return
        sfx.clack(1.1)
        // (already been through: the gate says so, and offers to start again)
        go('gate')
      }),
    [],
  )

  // the theme plays for as long as the quest is on: quietly under the tasks, fuller in the scenes
  const questOn = ['scraps', 'mend', 'riddles', 'dig'].includes(q.part1)
  // the reward for finishing part 1: the theme becomes the site's music, on every page, every
  // visit (unless it's switched off in Settings › Sound)
  const { santaTheme, santaSnow } = useSettings()
  const reward = q.keys.includes('ueno') && santaTheme && !questOn && phase === 'idle'
  // dev server only: ?questmusic=0..3 plays the music at that level (and &motif=… picks a theme),
  // to hear how it sits with everything else without playing through the quest
  const devMusic = devQuestMusic()
  const on = devMusic !== null || questOn || reward || (phase !== 'idle' && phase !== 'gate' && phase !== 'key')
  // how far along: the theme builds the whole way, a step for each task, and a lift in the scenes
  const found = q.gifts.filter((g) => g.found).length
  const base =
    q.part1 === 'scraps'
      ? q.scraps.length * 0.15
      : q.part1 === 'mend'
        ? 1
        : q.part1 === 'riddles'
          ? 1.25 + q.solved.length * 0.4
          : q.part1 === 'dig'
            ? 2 + found * 0.15
            : reward
              ? 2 // as the site's music: the upbeat version, with the clap and the bouncing bass
              : 0
  // memories are hushed; it starts low, spikes as the site sinks, and only the last chapter goes all the way
  const s = scene?.s
  const target =
    phase === 'sinking'
      ? 3
      : phase === 'scene'
        ? s?.past
          ? Math.min(base, 1)
          : s === BLESS
            ? 3
            : s === CALL
              ? 1.25
              : Math.min(3, base + 0.75)
        : devMusic ?? base
  // one place starts it and sets how much is going on (starting it used to reset the level to 0)
  // and it stops when nothing wants it (the reward switched off, or the gate opened)
  useEffect(() => {
    // the site coming back after the dark plays the intro, with its own swell and jingle: the
    // theme steps aside for it and comes back in from the top once it's done
    if ((!on && phase !== 'key') || phase === 'rising') questMusic.stop()
  }, [on, phase])
  useEffect(() => {
    if (!on || phase === 'rising' || (!ready && phase === 'idle')) return
    questMusic.start(target)
    questMusic.setLevel(target)
  }, [on, ready, phase, target])
  useEffect(() => () => questMusic.stop(), [])
  useEffect(() => {
    const m = devMotif()
    if (m) questMusic.cue(m)
  }, [])
  // each scene brings in the leitmotif that fits it: Shima's, Mitsumi's, ???'s, the park's lights
  useEffect(() => {
    if (!s) return
    const m: MotifName | undefined =
      s === CALL || s === SET_AFTER
        ? 'shima'
        : s === ARRIVE || s === PIECES || s === WHEEL || s === HAT_TOO
          ? 'mitsumi'
          : s === LETTER || s === MENDED || s === BOX || s === SEAL || s === SET
            ? 'mystery'
            : s === UENO
              ? 'lights'
              : s === THAW || s === BLESS || s === WALK || s === CLOCK
                ? 'main'
                : undefined
    if (m) questMusic.cue(m)
  }, [s])

  const pass = () => {
    sfx.stamp()
    // the ticket is spent
    quest.update((s) => ({ ...s, ticket: null }))
    questMusic.start(1)
    play([CALL], sink)
  }

  const sink = async () => {
    go('sinking')
    // the dark comes up underneath while everything falls into it
    gsap.fromTo(voidEl.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: reducedMotion() ? 0.3 : 2.2, ease: 'power2.in' })
    await onSink()
    play([ARRIVE, LETTER, CONFESS], rise)
  }

  const rise = () => {
    quest.update((s) => ({ ...s, part1: 'scraps', scraps: [], solved: [], gifts: buryGifts() }))
    go('rising')
    onRise()
    gsap.to(voidEl.current, { autoAlpha: 0, duration: 1.2, delay: 0.3, ease: 'power2.out', onComplete: () => go('idle') })
  }

  const caught = (p: Page) => {
    const scraps = quest.get().scraps.includes(p) ? quest.get().scraps : [...quest.get().scraps, p]
    const all = scraps.length >= PAGES.length
    quest.update((s) => ({ ...s, scraps, part1: all ? 'mend' : s.part1 }))
    if (all) return void window.setTimeout(() => play([PIECES], () => go('mend')), 600)
    // what the scrap says, and how many are left
    const w = WISHES[p]
    const left = PAGES.length - scraps.length
    if (scraps.length % 2) say('mitsumi', `Got one! This bit says “${TAB[p].label} wants ${w.gift}.” ${left} more out there.`)
    else say('shima', `Another one. “${TAB[p].label} wants ${w.gift}.” ${left} to go. Try the other pages.`)
  }

  const mended = () => {
    quest.update((s) => ({ ...s, part1: 'riddles', solved: [] }))
    play([MENDED])
  }

  // ???'s riddles: each one listens for its answer somewhere on the site, in any order. Each lights
  // a lantern; whichever is first opens chapter 3, and the third lantern melts the snow.
  useEffect(
    () =>
      onQuestHint((h) => {
        const s = quest.get()
        if (s.part1 !== 'riddles' || phaseRef.current !== 'idle') return
        const n =
          h.kind === 'clock' && h.secs === 25 ? 0 : h.kind === 'birthday' && h.name === 'Yuzuki' ? 1 : h.kind === 'cover' && h.index === TORII_VOLUME ? 2 : -1
        if (n < 0 || s.solved.includes(n)) {
          // a near miss on the clock gets a little tick, so it feels like the right idea
          if (h.kind === 'clock' && !s.solved.includes(0)) sfx.tick(1.4)
          return
        }
        sfx.chime(1.1, 0.8)
        shiver()
        const solved = [...s.solved, n]
        const first = solved.length === 1
        const done = solved.length >= RIDDLES.length
        quest.update((x) => ({ ...x, solved }))
        const scenes = n === 0 ? [CLOCK, BOX, BOX_AFTER] : n === 1 ? [WHEEL] : [SEAL, UENO, SET, SET_AFTER]
        if (first) scenes[0] = { ...scenes[0], chapter: RIDDLE_CHAPTER }
        if (done) scenes.push(THAW)
        // the third answer is inside a book: let the cover finish opening before anyone talks
        const wait = h.kind === 'cover' ? 1400 : 700
        window.setTimeout(() => {
          play(scenes, () => {
            if (done) {
              quest.update((x) => ({ ...x, part1: 'dig' }))
              sfx.crack()
            }
            go('idle')
            // point at what's left, so it carries on from here
            window.setTimeout(() => {
              if (done) return say('mitsumi', 'The snow drifts at the edges of the pages are soft now. Let’s dig!')
              const left = [0, 1, 2].filter((i) => !solved.includes(i)).map((i) => ['the clock', 'the birthday wheel', 'the shrine gate book'][i])
              say(solved.length === 1 ? 'mitsumi' : 'shima', `${solved.length === 1 ? 'Two lanterns left' : 'One more lantern'}: ${left.join(' and ')}.`)
            }, 600)
          })
        }, wait)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const dug = (i: number) => {
    sfx.chime(1.4, 0.7)
    quest.update((s) => ({ ...s, gifts: s.gifts.map((g, k) => (k === i ? { ...g, found: true } : g)) }))
    const g = quest.get().gifts[i]
    const w = WISHES[g.to]
    const n = quest.get().gifts.filter((x) => x.found).length
    if (n % 2) say('shima', `${w.gift[0].toUpperCase()}${w.gift.slice(1)}. Who wished for that one? It’s on the list.`)
    else say('mitsumi', `Found ${w.gift}! ${n < 5 ? `${5 - n} more buried.` : 'That’s all of them dug up!'}`)
  }

  /** a present reached the right tab: the letter on the back of its tag goes on the route */
  const delivered = (i: number) => {
    quest.update((s) => ({ ...s, gifts: s.gifts.map((x, j) => (j === i ? { ...x, sent: true } : x)) }))
    const n = quest.get().gifts.filter((x) => x.sent).length
    if (n >= 5) return
    const g = quest.get().gifts[i]
    const l = LETTERS[n - 1]
    say(n % 2 ? 'mitsumi' : 'shima', `${TAB[g.to].label} got its ${SHORT[g.to]}! There’s a letter on the back of the tag: ${l === '*' ? 'a snowflake' : `“${l}”`}.`)
  }
  const missed = (tab: Page) => say('shima', `Pretty sure ${TAB[tab].label} didn’t ask for that. Check the list.`)

  // the last present went out: a glow in the snow, and a voice
  const allSent = q.part1 === 'dig' && q.gifts.length > 0 && q.gifts.every((g) => g.sent)
  useEffect(() => {
    if (!allSent || phase !== 'idle') return
    const id = window.setTimeout(() => play([BLESS, HAT_TOO, WALK], blessed), 700)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSent, phase])

  const blessed = () => {
    setSnowy(true)
    quest.update((s) => ({ ...s, part1: 'blessed', keys: s.keys.includes('ueno') ? s.keys : [...s.keys, 'ueno'] }))
    questMusic.stop(true)
    sfx.jingle(0.8)
    go('key')
  }

  const playing = ['scraps', 'mend', 'riddles', 'dig'].includes(q.part1) && ready && (phase === 'idle' || phase === 'list' || phase === 'mend')
  const scrapHere = !!view && q.part1 === 'scraps' && phase === 'idle' && ready && !q.scraps.includes(view)
  const drifts = q.part1 === 'dig' && phase === 'idle' && ready ? q.gifts.map((g, i) => ({ g, i })).filter(({ g }) => g.page === view && !g.found) : []

  return (
    <>
      <div className="qv" ref={voidEl} aria-hidden="true">
        {Array.from({ length: 36 }, (_, i) => (
          <i key={i} style={{ '--x': `${(i * 37) % 100}%`, '--d': `${(i * 0.37) % 7}s`, '--s': `${0.5 + ((i * 7) % 10) / 14}` } as CSSProperties}>
            <Icon name="snow" color="#fff" size={14} />
          </i>
        ))}
      </div>

      {phase === 'gate' && <Gate onClose={() => go('idle')} onPass={pass} />}
      {phase === 'scene' && scene && (
        <Dialogue key={scene.n} lines={scene.s.lines} cast={scene.s.cast} dark={scene.s.dark} past={scene.s.past} bg={scene.s.bg} chapter={scene.s.chapter} hat={!scene.s.past} mitsumiHat={scene.s.mitsumiHat} snow={scene.s.snow} exit={scene.s.exit} when={scene.s.when} onDone={nextScene} />
      )}
      {phase === 'mend' && <List solved={false} onSolved={mended} onClose={() => go('idle')} />}
      {phase === 'list' && <List solved lit={past(q.part1, 'mend') ? (past(q.part1, 'riddles') ? [0, 1, 2] : q.solved) : undefined} onClose={() => go('idle')} />}
      {(snowy || (q.keys.includes('ueno') && santaSnow && phase !== 'scene')) && (
        <div className="qd-snow is-page" aria-hidden="true">
          {Array.from({ length: 34 }, (_, i) => (
            <i key={i} style={{ '--x': `${(i * 37) % 100}%`, '--d': `${(i * 0.53) % 9}s`, '--s': `${0.45 + ((i * 7) % 10) / 14}` } as CSSProperties}>
              <Icon name="snow" color="#BFD8EC" size={16} />
            </i>
          ))}
        </div>
      )}
      {phase === 'key' && <Blessing onClose={() => go('idle')} />}

      {scrapHere && view && <Scrap key={view} onCatch={() => caught(view)} />}
      {drifts.map(({ g, i }) => (
        <Mound key={`${view}-${i}`} gift={g} index={i} onFound={dug} />
      ))}
      {playing && <Route onList={() => go(q.part1 === 'mend' ? 'mend' : 'list')} onSent={delivered} onMiss={missed} />}
      {barks.length > 0 && phase === 'idle' && <Barks list={barks} />}
    </>
  )
}

/** the key from the snow: the first key, for part 2 */
function Blessing({ onClose }: { onClose: () => void }) {
  const key = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    btn.current?.focus({ preventScroll: true })
    if (!reducedMotion()) {
      gsap.fromTo(key.current, { scale: 0, rotation: -200 }, { scale: 1, rotation: 0, duration: 1.4, ease: 'elastic.out(1, 0.5)' })
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="qs qb" role="dialog" aria-modal="true" aria-label="The Key of Ueno" lang="en">
      <div className="qg-backdrop" onClick={onClose} />
      <div className="qb-card">
        <div className="qb-key" ref={key}>
          <Icon name="key" color={C.amber} size={70} />
        </div>
        <span className="qb-kicker">Secret Santa · part 1 complete</span>
        <h3>The Key of Ueno</h3>
        <p>It turned up in the snow after the last present went out, with “Ueno” on it like the ticket. Hang on to it: part 2 starts here.</p>
        <p className="qb-reward">
          <Icon name="note" color={C.sky} size={16} />
          <span>
            <b>Rewards:</b> “Snow on the Site” is now the site’s music, and it snows on every page. Switch either off in Settings (Sound, and On the page).
          </span>
        </p>
        <button ref={btn} className="sx-btn is-strong" style={{ '--c': C.sky } as CSSProperties} onClick={onClose}>
          Keep it safe
        </button>
      </div>
    </div>
  )
}
