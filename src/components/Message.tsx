import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { gsap } from '../gsap'
import { C } from '../data'
import { FlexText } from './FlexText'
import { Icon, type IconName } from '../icons'
import { sfx } from '../sfx'
import { cleanSigner, cleanText, LETTER_MAX, LETTER_MIN, NAME_MAX, problem, safeColor, STATIONERY } from '../letterRules'
import '../message.css'

/**
 * Message: a little post office. You write a letter on lined paper, it folds in thirds, slides
 * into an envelope that seals with wax and flies off. Or you check the mailbox: one letter
 * someone else wrote comes out at random, you break the seal, pull it out and unfold it.
 */

const API = '/api/messages'
const ANON = 'a fellow loafer'

// ───────── this device ─────────
const store = {
  read<T>(k: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(k)
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  },
  write(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v))
    } catch {
      /* private mode */
    }
  },
}
function clientId(): string {
  let id = store.read<string>('sl-msg-me', '')
  if (!/^[a-z0-9]{12,40}$/i.test(id)) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 20)
    store.write('sl-msg-me', id)
  }
  return id
}
const remember = (k: string, id: string, max: number) => store.write(k, [...store.read<string[]>(k, []).filter((x) => x !== id), id].slice(-max))

interface Letter {
  id: string
  text: string
  from: string | null
  color: string
  at: number
  /** you wrote this one */
  mine?: boolean
}

async function api<T>(init?: RequestInit, query = ''): Promise<T> {
  const r = await fetch(API + query, init)
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((data as { error?: string }).error || 'couldn’t reach the mailbox, try again later')
  return data as T
}
const post = <T,>(body: unknown) => api<T>({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

/** How many letters are waiting, and how often yours have been opened. Refreshes on demand. */
function useStats() {
  const [s, set] = useState<{ total: number | null; opens: number; sent: number }>({ total: null, opens: 0, sent: 0 })
  const refresh = useCallback(() => {
    const mine = store.read<string[]>('sl-msg-sent', [])
    api<{ total: number; opens: Record<string, number> }>(undefined, `?mine=${encodeURIComponent(mine.join(','))}`)
      .then((d) => set({ total: d.total, sent: mine.length, opens: Object.values(d.opens).reduce((a, b) => a + b, 0) }))
      .catch(() => set((p) => ({ ...p, sent: mine.length })))
  }, [])
  useEffect(refresh, [refresh])
  return [s, refresh] as const
}

// ───────── geometry ─────────
/** Every size the animations need, from the sheet's width. The CSS reads the same numbers. */
function geometry(vw: number) {
  const W = Math.round(Math.max(260, Math.min(340, vw - 48)))
  const H = Math.round(W * 1.32)
  const ph = H / 3 // one third: the folded letter
  const EW = W + 28
  const EH = Math.round(ph + 30)
  const ET = Math.round(ph + 14) // envelope top inside the post box
  const FH = Math.round(EH * 0.6)
  return {
    W,
    H,
    ph,
    EW,
    EH,
    ET,
    FH,
    /** letter offsets: tucked in the pocket, held just above it, and pulled out of it */
    IN: ET + 13 - ph,
    LIFT: ET - 10 - 2 * ph,
    OUT: ET - 6 - 2 * ph,
  }
}
type Geo = ReturnType<typeof geometry>

function useGeo() {
  const [g, set] = useState(() => geometry(window.innerWidth))
  useEffect(() => {
    const on = () => set((p) => {
      const n = geometry(window.innerWidth)
      return n.W === p.W ? p : n
    })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return g
}

const vars = (g: Geo, color: string) =>
  ({
    '--W': `${g.W}px`,
    '--H': `${g.H}px`,
    '--ph': `${g.ph}px`,
    '--EW': `${g.EW}px`,
    '--EH': `${g.EH}px`,
    '--ET': `${g.ET}px`,
    '--FH': `${g.FH}px`,
    '--ec': color,
    '--ac': color === C.yellow ? C.pink : C.yellow,
    '--et': paper(color).ink,
    // the letter sheet's scale: its 340px design drawn at this width
    '--k': String(g.W / 340),
  }) as CSSProperties

/** Each paper has its own icon (stamp, seal, picker) and an ink dark enough to read on white. */
const PAPER: Record<string, { name: string; icon: IconName; ink: string }> = {
  '#FF2E93': { name: 'Sakura', icon: 'sakura', ink: '#FF2E93' },
  '#1F6BFF': { name: 'Star', icon: 'star', ink: '#1F6BFF' },
  '#FFC400': { name: 'Sun', icon: 'sun', ink: '#E39400' },
  '#00C46A': { name: 'Clover', icon: 'clover', ink: '#00A65A' },
  '#FF6B00': { name: 'Flame', icon: 'flame', ink: '#FF6B00' },
  '#7B2FFF': { name: 'Moon', icon: 'moon', ink: '#7B2FFF' },
}
const paper = (c: string) => PAPER[safeColor(c)]

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const dateOf = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

// ───────── paper ─────────
// handwriting sizes, biggest first: [font size, line spacing] in px. Longer letters write smaller.
const HAND = [
  [18, 29],
  [16.5, 27],
  [15, 24],
  [14, 22],
  [13, 20],
  // only the narrowest phones get this small, and only for the longest letters
  [12, 19],
  [11, 17],
] as const

function Sheet({
  icon,
  text,
  from,
  date,
  fit,
  onFit,
  children,
}: {
  icon: IconName
  text?: string
  from?: string | null
  date?: string
  /** what to re-measure on (the draft while writing); defaults to the text */
  fit?: string
  /** told whether the words fit on the page even at the smallest size */
  onFit?: (fits: boolean) => void
  children?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  // pick the biggest handwriting that still fits on one page (ruled lines follow it)
  useLayoutEffect(() => {
    const el = ref.current
    const body = el?.querySelector<HTMLElement>('.lt-text')
    if (!el || !body) return
    // sizes are for a 340px sheet and scale with it, so wrapping is the same on any screen
    const k = el.offsetWidth / 340
    let at = -1
    for (let i = 0; i < HAND.length; i++) {
      const [fs, lh] = HAND[i]
      el.style.setProperty('--fs', `${fs * k}px`)
      el.style.setProperty('--lh', `${lh * k}px`)
      if (body.scrollHeight <= body.clientHeight + 1) {
        at = i
        break
      }
    }
    // writers stop one size early, so a reader always has a smaller one in reserve for rounding
    onFit?.(at !== -1 && at < HAND.length - 1)
  }, [fit ?? text])

  return (
    <div className="lt-sheet" ref={ref}>
      <span className="lt-stamp" aria-hidden="true">
        <Icon name={icon} color="#fff" size={22} />
      </span>
      <div className="lt-head">
        Dear stranger,
        {date && <span className="lt-date">{date}</span>}
      </div>
      {children ?? (
        <>
          <div className="lt-text">{text}</div>
          <div className="lt-sign">
            — <span className={from ? '' : 'is-anon'}>{from || ANON}</span>
          </div>
        </>
      )}
    </div>
  )
}

/** The sheet cut into thirds so the top and bottom can fold over the middle. */
function Folding({ sheet }: { sheet: ReactNode }) {
  // middle first: the bottom folds over it, then the top over both
  return (
    <div className="lt">
      {[1, 2, 0].map((i) => (
        <div key={i} className={`lt-p lt-p${i}`}>
          <div className="lt-face lt-front">
            <div className="lt-clip" style={{ top: `calc(var(--ph) * ${-i})` }}>
              {sheet}
            </div>
            {i === 1 && <i className="lt-crease" />}
            <i className="lt-shade" />
          </div>
          <div className="lt-face lt-back">
            <i className="lt-shade" />
          </div>
        </div>
      ))}
    </div>
  )
}

function Envelope({ label, icon }: { label: string; icon: IconName }) {
  return (
    <>
      <div className="env-back" />
      <div className="env-front">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path className="env-pocket" d="M0 0 L46 52 Q50 56 54 52 L100 0 V100 H0 Z" />
          <path className="env-crease" d="M0 100 L41 60 M100 100 L59 60" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="env-label">{label}</span>
      </div>
      <div className="env-flap">
        <svg className="flap-out" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0 H100 L56 54 Q50 60 44 54 Z" />
        </svg>
        <svg className="flap-in" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0 H100 L56 54 Q50 60 44 54 Z" />
        </svg>
      </div>
      <div className="env-seal" aria-hidden="true">
        <span className="seal-h seal-l">
          <Icon name={icon} color="#fff" size={20} />
        </span>
        <span className="seal-h seal-r">
          <Icon name={icon} color="#fff" size={20} />
        </span>
      </div>
    </>
  )
}

// ───────── motion helpers ─────────
/** Turns a third of the sheet, darkening whichever face is turned away from the light. */
function turn(tl: gsap.core.Timeline, panel: Element, to: number, at: number, dur = 0.72) {
  const [front, back] = panel.querySelectorAll<HTMLElement>('.lt-shade')
  tl.to(
    panel,
    {
      rotationX: to,
      duration: dur,
      ease: 'power2.inOut',
      onUpdate() {
        const a = (gsap.getProperty(panel, 'rotationX') as number) * (Math.PI / 180)
        const s = Math.abs(Math.sin(a))
        front.style.opacity = String(s * 0.42)
        back.style.opacity = String(0.03 + s * 0.3)
      },
    },
    at,
  )
}

const parts = (root: HTMLElement) => ({
  q: gsap.utils.selector(root),
  holder: root.querySelector<HTMLElement>('.lt-holder')!,
  env: Array.from(root.querySelectorAll<HTMLElement>('.env-back, .env-front, .env-flap, .env-seal')),
  flap: root.querySelector<HTMLElement>('.env-flap')!,
  seal: root.querySelector<HTMLElement>('.env-seal')!,
})

// ═════════════ writing ═════════════
type WritePhase = 'compose' | 'sending' | 'sent'

function Writer({ g, onSent, onOpen, stats }: { g: Geo; onSent: () => void; onOpen: () => void; stats: { opens: number; sent: number } }) {
  const [text, setText] = useState(() => store.read<string>('sl-msg-draft', ''))
  const [from, setFrom] = useState(() => store.read<string>('sl-msg-from', ''))
  const [color, setColor] = useState<string>(() => safeColor(store.read<string>('sl-msg-color', STATIONERY[0])))
  const [phase, setPhase] = useState<WritePhase>('compose')
  const [err, setErr] = useState<string | null>(null)
  const [round, setRound] = useState(0)
  const [sentAt, setSentAt] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)

  useEffect(() => store.write('sl-msg-draft', text), [text])
  useEffect(() => store.write('sl-msg-from', from), [from])
  useEffect(() => store.write('sl-msg-color', color), [color])
  useEffect(() => () => void tl.current?.kill(), [])

  const body = cleanText(text)
  const signer = cleanSigner(from)
  const len = Array.from(body).length
  const [fits, setFits] = useState(true)
  const why = problem(body, signer) ?? (fits ? null : 'that’s all that fits on one page')
  // don't nag before there's something to judge
  const shown = err ?? (len >= LETTER_MIN || len > LETTER_MAX ? why : null)

  // the envelope waits out of sight, flap open, until the letter is folded
  useLayoutEffect(() => {
    const el = root.current
    if (!el || phase !== 'compose') return
    const { env, flap, seal, holder } = parts(el)
    gsap.set(el, { clearProps: 'all' })
    gsap.set(holder, { clearProps: 'all' })
    gsap.set(env, { y: g.EH + 90, autoAlpha: 0 })
    gsap.set(flap, { rotationX: 180, transformPerspective: 900, transformOrigin: '50% 0%', zIndex: 0 })
    gsap.set(seal, { y: 0, scale: 2.2, rotation: -30, autoAlpha: 0 })
  }, [phase, round, g])

  const send = () => {
    if (why || phase !== 'compose') return
    setErr(null)
    flushSync(() => setPhase('sending'))
    const el = root.current!
    const { q, holder, flap, seal } = parts(el)
    // the seal isn't on yet: it's pressed on once the flap is shut
    const env = parts(el).env.filter((e) => e !== seal)
    const [p0, p2] = [q('.lt-p0')[0], q('.lt-p2')[0]]
    const request = post<{ id: string }>({ action: 'send', text: body, from: signer, color, me: clientId() })

    const t = gsap.timeline()
    tl.current = t
    // the tray sits beside the post, not inside it
    const tools = el.parentElement?.querySelector('.wr-tools')
    if (tools) t.to(tools, { autoAlpha: 0, y: 14, duration: 0.3, ease: 'power2.in' }, 0)
    // bottom third folds up, then the top third folds down over it
    t.call(() => sfx.fold(0.1), [], 0.62)
    turn(t, p2, 180, 0.2)
    t.to(q('.lt-crease'), { opacity: 1, duration: 0.2 }, 0.9)
    t.call(() => sfx.fold(-0.1), [], 1.32)
    turn(t, p0, -180, 0.9)
    // pressing the crease flat
    t.fromTo(q('.lt'), { scaleY: 1 }, { scaleY: 0.975, duration: 0.09, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 1.62)
    // the envelope comes up while the letter is held over it
    t.call(() => sfx.whoosh(0.4, true, 0.12), [], 1.7)
    t.to(env, { y: 0, autoAlpha: 1, duration: 0.75, ease: 'back.out(1.15)', stagger: 0.02 }, 1.75)
    t.to(holder, { y: g.LIFT, rotation: -2.5, duration: 0.6, ease: 'power2.inOut' }, 1.85)
    // ...and slides in, catching a little on the way
    t.call(() => sfx.slide(0.7), [], 2.6)
    t.to(holder, { y: g.IN - 8, rotation: 0.6, duration: 0.55, ease: 'power2.in' }, 2.55)
    t.to(holder, { y: g.IN, rotation: 0, duration: 0.25, ease: 'power1.out' }, 3.1)
    t.to(env, { y: 3, duration: 0.1, yoyo: true, repeat: 1, ease: 'power1.out' }, 3.1)
    // flap closes; it passes in front of the letter halfway through
    t.call(() => sfx.fold(0), [], 3.6)
    t.to(flap, { rotationX: 0, duration: 0.55, ease: 'power2.inOut' }, 3.35)
    t.set(flap, { zIndex: 4 }, 3.62)
    // wax seal pressed on
    t.to(seal, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.32, ease: 'power3.in' }, 3.95)
    t.call(() => sfx.stamp(), [], 4.25)
    t.to(seal, { scaleX: 1.14, scaleY: 0.88, duration: 0.08, ease: 'power2.out' }, 4.27)
    t.to(seal, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)' }, 4.35)
    t.to(el, { scale: 0.985, duration: 0.08, yoyo: true, repeat: 1 }, 4.27)
    t.addLabel('sealed', 4.75)
    // waits here, sealed, until the post office has the letter
    let ok: boolean | null = null
    let failure = ''
    let waiting = false
    const settle = () => {
      if (ok === true && waiting) t.play()
      if (ok === false) {
        // unwrap it again and hand the pen back
        t.pause()
        const handBack = () => {
          t.kill()
          setErr(failure)
          setPhase('compose')
        }
        // a refusal that comes back before the first frame has nothing to rewind (and a reverse
        // from 0 would never report finishing), so put the page back at once
        if (t.time() < 0.05) {
          t.progress(0)
          handBack()
          return
        }
        t.eventCallback('onReverseComplete', handBack)
        t.timeScale(2.4).reverse()
      }
    }
    t.addPause('sealed', () => {
      waiting = true
      gsap.delayedCall(0.01, settle)
    })
    // off it goes: a small crouch, then a long arc up and away
    t.to(el, { y: 14, scale: 0.96, rotation: -3, duration: 0.28, ease: 'power2.out' }, 'sealed')
    t.call(() => sfx.whoosh(0.9, true, 0.28), [], 'sealed+=0.25')
    t.to(el, { x: () => window.innerWidth * 0.75, duration: 1.15, ease: 'power1.in' }, 'sealed+=0.28')
    t.to(el, { y: () => -window.innerHeight * 0.85, duration: 1.15, ease: 'power2.in' }, 'sealed+=0.28')
    t.to(el, { rotation: 24, scale: 0.22, duration: 1.15, ease: 'power1.in' }, 'sealed+=0.28')
    t.to(el, { autoAlpha: 0, duration: 0.3 }, 'sealed+=1.1')
    t.call(() => {
      setSentAt(Date.now())
      setPhase('sent')
      setText('')
      onSent()
    })
    if (reduced()) t.timeScale(3)

    request.then(
      (d) => {
        remember('sl-msg-sent', d.id, 60)
        ok = true
        settle()
      },
      (e: Error) => {
        failure = e.message
        ok = false
        settle()
      },
    )
  }

  const again = () => {
    setErr(null)
    setRound((r) => r + 1)
    setPhase('compose')
  }

  if (phase === 'sent') return <Sent at={sentAt} onAgain={again} onOpen={onOpen} />

  return (
    <div className="wr" style={vars(g, color)}>
      <div className="post" ref={root} key={round}>
        <Envelope label="for someone, somewhere" icon={paper(color).icon} />
        <div className="lt-holder">
          {phase === 'compose' ? (
            <div className="lt lt-flat">
              <Sheet icon={paper(color).icon} fit={text} onFit={setFits}>
                <textarea
                  className="lt-text"
                  value={text}
                  maxLength={LETTER_MAX + 40}
                  placeholder="Say something to whoever opens this…"
                  onChange={(e) => {
                    setText(e.target.value)
                    setErr(null)
                  }}
                  aria-label="Your letter"
                />
                <div className="lt-sign">
                  —{' '}
                  <input
                    value={from}
                    maxLength={NAME_MAX}
                    placeholder={ANON}
                    onChange={(e) => setFrom(e.target.value)}
                    aria-label="Sign as (optional nickname)"
                  />
                </div>
              </Sheet>
            </div>
          ) : (
            <Folding sheet={<Sheet icon={paper(color).icon} text={body} from={signer} />} />
          )}
        </div>
      </div>

      <div className="wr-tools">
        <div className="wr-papers" role="radiogroup" aria-label="Paper">
          {STATIONERY.map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={c === color}
              aria-label={`${PAPER[c].name} paper`}
              title={PAPER[c].name}
              className={`wr-paper${c === color ? ' is-on' : ''}`}
              style={{ '--sw': c } as CSSProperties}
              onClick={() => setColor(c)}
            >
              <Icon name={PAPER[c].icon} color="#fff" size={18} />
            </button>
          ))}
        </div>

        <div className={`wr-meter${len > LETTER_MAX ? ' is-over' : ''}`} aria-hidden="true">
          <i style={{ width: `${Math.min(100, (len / LETTER_MAX) * 100)}%` }} />
        </div>
        <div className="wr-meta">
          <p className={`wr-hint${shown ? ' is-bad' : ''}`} role="status">
            {shown ?? 'signing it is optional'}
          </p>
          <span className={`wr-count${len > LETTER_MAX ? ' is-over' : ''}`}>
            {len}/{LETTER_MAX}
          </span>
        </div>

        <button className="msg-btn wr-send" onClick={send} disabled={!!why || phase !== 'compose'}>
          <Icon name="plane" color="#fff" size={22} />
          Seal &amp; send
        </button>
        {stats.sent > 0 && (
          <p className="wr-stats">
            {stats.sent} sent · opened {stats.opens} {stats.opens === 1 ? 'time' : 'times'}
          </p>
        )}
      </div>
    </div>
  )
}

function Sent({ at, onAgain, onOpen }: { at: number; onAgain: () => void; onOpen: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const q = gsap.utils.selector(ref)
    const t = gsap.timeline()
    t.from(q('.pm'), { scale: 2.4, autoAlpha: 0, rotation: -40, duration: 0.32, ease: 'power3.in' })
    t.call(() => sfx.stamp())
    t.to(q('.pm'), { scale: 1.06, duration: 0.07, yoyo: true, repeat: 1 })
    t.from(q('.pm-waves path'), { scaleX: 0, transformOrigin: '0% 50%', duration: 0.4, stagger: 0.06, ease: 'power2.out' }, '-=0.05')
    t.from(q('.sent > :not(.pm-wrap)'), { autoAlpha: 0, y: 20, duration: 0.5, stagger: 0.07, ease: 'back.out(1.4)' }, '-=0.2')
    return () => void t.kill()
  }, [])
  return (
    <div className="sent" ref={ref}>
      <div className="pm-wrap">
        <div className="pm">
          <span className="pm-top">SKIP · POST</span>
          <span className="pm-mid">SENT</span>
          <span className="pm-bot">{dateOf(at)}</span>
        </div>
        <svg className="pm-waves" viewBox="0 0 160 60" aria-hidden="true">
          {[12, 30, 48].map((y) => (
            <path key={y} d={`M0 ${y} q10 -8 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0`} />
          ))}
        </svg>
      </div>
      <h3>On its way!</h3>
      <p>Your letter is in the mailbox now. Someone, somewhere, will open it at random.</p>
      <div className="sent-btns">
        <button className="msg-btn" onClick={onAgain}>
          <Icon name="pencil" color="#fff" size={22} />
          Write another
        </button>
        <button className="msg-btn is-ghost" onClick={onOpen}>
          <Icon name="envelope" color={C.ink} size={22} />
          Open a letter
        </button>
      </div>
    </div>
  )
}

// ═════════════ opening ═════════════
type ReadPhase = 'idle' | 'checking' | 'arrived' | 'opening' | 'read' | 'empty' | 'error'

function Mailbox({ flag }: { flag: boolean }) {
  return (
    <div className="mbox" aria-hidden="true">
      <div className="mbox-pole" />
      <div className="mbox-body">
        <div className="mbox-hole" />
        <div className="mbox-door">
          <span className="mbox-slot" />
          <span className="mbox-handle" />
        </div>
      </div>
      <div className={`mbox-flag${flag ? ' is-up' : ''}`}>
        <i />
      </div>
    </div>
  )
}

function Reader({ g, total, onChange, onWrite }: { g: Geo; total: number | null; onChange: () => void; onWrite: () => void }) {
  const [phase, setPhase] = useState<ReadPhase>('idle')
  const [letter, setLetter] = useState<Letter | null>(null)
  const [msg, setMsg] = useState('')
  const [reported, setReported] = useState(false)
  const scene = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const anims = useRef<gsap.core.Animation[]>([])
  const keep = <T extends gsap.core.Animation>(a: T): T => (anims.current.push(a), a)
  useEffect(() => () => anims.current.forEach((a) => a.kill()), [])

  const mq = () => gsap.utils.selector(scene)

  const check = async () => {
    if (phase !== 'idle' && phase !== 'empty' && phase !== 'error') return
    const q = mq()
    const door = q('.mbox-door')[0]
    setPhase('checking')
    setReported(false)
    gsap.set(q('.mbox'), { autoAlpha: 1, y: 0 })
    gsap.set(door, { transformPerspective: 600, transformOrigin: '50% 100%' })
    // the door rattles while someone digs around inside
    const rattle = keep(
      gsap.timeline({ repeat: -1 })
        .to(door, { rotationX: -14, duration: 0.09, ease: 'power1.out' })
        .to(door, { rotationX: 0, duration: 0.12, ease: 'power2.in', onComplete: () => sfx.clank(1 + Math.random() * 0.15) })
        .to(q('.mbox-body'), { rotation: 1.2, duration: 0.06, yoyo: true, repeat: 1 }, '<')
        .to({}, { duration: 0.12 }),
    )
    const started = performance.now()
    let got: { letter: Letter | null; total: number }
    try {
      got = await api(undefined, `?me=${encodeURIComponent(clientId())}&not=${encodeURIComponent(store.read<string[]>('sl-msg-seen', []).join(','))}`)
      if (got.letter) got.letter = { ...got.letter, color: safeColor(got.letter.color), text: String(got.letter.text), from: got.letter.from ? String(got.letter.from) : null }
    } catch (e) {
      got = { letter: null, total: -1 }
      setMsg((e as Error).message)
    }
    // a real rummage takes a moment, even on a fast connection
    await new Promise((r) => setTimeout(r, Math.max(0, 750 - (performance.now() - started))))
    rattle.kill()
    gsap.set(q('.mbox-body'), { rotation: 0 })
    onChange()
    if (got.total === -1) {
      gsap.to(door, { rotationX: 0, duration: 0.2 })
      setPhase('error')
      return
    }
    if (!got.letter) {
      sfx.clank(0.8)
      keep(gsap.timeline().to(door, { rotationX: -100, duration: 0.5, ease: 'bounce.out' }).to(door, { rotationX: 0, duration: 0.4, ease: 'power2.in', delay: 1.4 }).call(() => sfx.clank(1.1)))
      setPhase('empty')
      return
    }
    remember('sl-msg-seen', got.letter.id, 80)
    flushSync(() => {
      setLetter(got.letter)
      setPhase('arrived')
    })
    arrive()
  }

  /** Door drops open, the envelope slides out and is tossed onto the desk. */
  const arrive = () => {
    const el = root.current!
    const q = mq()
    const { holder, env, flap, seal } = parts(el)
    const door = q('.mbox-door')[0]
    const hole = q('.mbox-hole')[0].getBoundingClientRect()
    const box = el.getBoundingClientRect()
    const cy = g.ET + g.EH / 2
    const dx = hole.left + hole.width / 2 - (box.left + box.width / 2)
    const dy = hole.top + hole.height * 0.55 - (box.top + cy)
    const tilt = gsap.utils.random(-5, 5)

    gsap.set(el, { transformOrigin: `50% ${cy}px`, x: dx, y: dy, scale: 0.28, rotation: -6, autoAlpha: 0 })
    gsap.set(holder, { y: g.IN, zIndex: 2 })
    gsap.set(q('.lt-p0'), { rotationX: -180 })
    gsap.set(q('.lt-p2'), { rotationX: 180 })
    q('.lt-shade').forEach((s, i) => (s.style.opacity = i % 2 ? '0.03' : '0'))
    gsap.set(q('.lt-crease'), { opacity: 1 })
    gsap.set(env, { autoAlpha: 1, y: 0 })
    gsap.set(flap, { rotationX: 0, transformPerspective: 900, transformOrigin: '50% 0%', zIndex: 4 })
    gsap.set(seal, { autoAlpha: 1, scale: 1, rotation: 0 })

    const t = keep(gsap.timeline())
    t.call(() => sfx.clank(0.9))
    t.to(door, { rotationX: -104, duration: 0.55, ease: 'bounce.out' })
    // peeks out of the slot...
    t.set(el, { autoAlpha: 1 }, 0.3)
    t.call(() => sfx.slide(0.45, 0.8), [], 0.3)
    t.to(el, { y: dy + 16, scale: 0.4, rotation: -2, duration: 0.4, ease: 'power2.out' }, 0.3)
    // ...then is tossed in an arc onto the desk, growing as it comes closer
    t.call(() => sfx.whoosh(0.6, false, 0.16), [], 0.72)
    t.to(el, { x: 0, duration: 0.85, ease: 'power1.out' }, 0.72)
    t.to(el, { keyframes: { y: [dy + 16, dy - 70, 0], easeEach: 'sine.inOut' }, duration: 0.85, ease: 'power1.in' }, 0.72)
    t.to(el, { scale: 1, rotation: tilt + 8, duration: 0.85, ease: 'power2.inOut' }, 0.72)
    t.to(q('.mbox'), { y: 70, autoAlpha: 0, duration: 0.5, ease: 'power2.in' }, 0.9)
    // lands, skids a little, settles
    t.call(() => sfx.thud(), [], 1.57)
    t.to(el, { scaleY: 0.95, scaleX: 1.03, rotation: tilt, duration: 0.09, ease: 'power2.out' }, 1.57)
    t.to(el, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1, 0.5)' }, 1.66)
    t.to(el, { x: tilt * 3, duration: 0.5, ease: 'power3.out' }, 1.57)
    t.set(door, { rotationX: 0 })
    t.from(q('.rx-hint'), { autoAlpha: 0, y: 10, duration: 0.4 }, 1.9)
    if (reduced()) t.timeScale(3)
  }

  /** Crack the wax, lift the flap, pull the letter out and unfold it. */
  const open = () => {
    if (phase !== 'arrived') return
    setPhase('opening')
    const el = root.current!
    const q = gsap.utils.selector(el)
    const { holder, env, flap } = parts(el)
    const t = keep(gsap.timeline())
    t.to(mq()('.rx-hint'), { autoAlpha: 0, duration: 0.2 }, 0)
    t.to(el, { rotation: 0, x: 0, duration: 0.5, ease: 'power2.out' }, 0)
    // wax gives way
    t.to(q('.env-seal'), { x: -2, duration: 0.05, yoyo: true, repeat: 3 }, 0.15)
    t.call(() => sfx.crack(), [], 0.35)
    t.to(q('.seal-l'), { x: -22, y: 90, rotation: -50, autoAlpha: 0, duration: 0.75, ease: 'power2.in' }, 0.36)
    t.to(q('.seal-r'), { x: 18, y: 110, rotation: 40, autoAlpha: 0, duration: 0.8, ease: 'power2.in' }, 0.38)
    // flap lifts; once past upright it's behind the letter
    t.call(() => sfx.fold(0), [], 0.6)
    t.to(flap, { rotationX: 180, duration: 0.6, ease: 'power2.out' }, 0.55)
    t.set(flap, { zIndex: 0 }, 0.72)
    // letter drawn out of the pocket
    t.call(() => sfx.slide(0.85), [], 1.15)
    t.to(holder, { y: g.IN + 6, duration: 0.12, ease: 'power1.out' }, 1.1)
    t.to(holder, { y: g.OUT, rotation: 1.5, duration: 0.85, ease: 'power2.inOut' }, 1.22)
    t.set(holder, { zIndex: 6 }, 2.08)
    // envelope drops away, letter comes down to the middle
    t.to(env, { y: g.EH + 90, autoAlpha: 0, duration: 0.6, ease: 'power2.in', stagger: 0.015 }, 2.1)
    t.to(holder, { y: 0, rotation: 0, duration: 0.7, ease: 'power2.inOut' }, 2.15)
    // unfolding: top third, then bottom third
    t.call(() => sfx.fold(-0.1), [], 2.95)
    turn(t, q('.lt-p0')[0], 0, 2.85, 0.75)
    t.call(() => sfx.fold(0.1), [], 3.7)
    turn(t, q('.lt-p2')[0], 0, 3.55, 0.75)
    t.fromTo(q('.lt'), { scale: 1 }, { scale: 1.02, duration: 0.15, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 4.3)
    t.call(() => sfx.chime(1.2, 0.5), [], 4.3)
    t.call(() => setPhase('read'), [], 4.35)
    if (reduced()) t.timeScale(3)
  }

  const another = () => {
    const el = root.current
    if (!el) return check()
    const t = keep(gsap.timeline())
    t.call(() => sfx.slide(0.4, 0.7))
    t.to(el, { y: 60, rotation: 6, autoAlpha: 0, duration: 0.45, ease: 'power2.in' })
    t.call(() => {
      flushSync(() => {
        setLetter(null)
        setPhase('idle')
      })
      gsap.fromTo(mq()('.mbox'), { y: 70, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'back.out(1.5)' })
      sfx.pop(0.8)
    })
  }

  const report = async () => {
    if (!letter || reported) return
    setReported(true)
    try {
      await post({ action: 'report', id: letter.id, me: clientId() })
    } catch {
      /* the thanks still stands; it was worth a try */
    }
  }

  // the mailbox stays until the envelope has been tossed out of it
  const showBox = !letter || phase === 'arrived'
  const waiting = total ?? 0

  return (
    <div className="rx" ref={scene} style={vars(g, letter?.color ?? C.pink)}>
      <div className="rx-scene">
        {showBox && (
          <button className="rx-box" onClick={check} disabled={phase === 'checking'} aria-label="Check the mailbox for a letter">
            <Mailbox flag={waiting > 0} />
          </button>
        )}
        {letter && (
          <div
            className={`post${phase === 'arrived' ? ' is-tappable' : ''}`}
            ref={root}
            onClick={open}
            role={phase === 'arrived' ? 'button' : undefined}
            tabIndex={phase === 'arrived' ? 0 : undefined}
            aria-label={phase === 'arrived' ? 'Open the envelope' : undefined}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && open()}
          >
            <Envelope label={letter.mine ? 'your own letter' : `from ${letter.from || ANON}`} icon={paper(letter.color).icon} />
            <div className="lt-holder">
              <Folding sheet={<Sheet icon={paper(letter.color).icon} text={letter.text} from={letter.from} date={dateOf(letter.at)} />} />
            </div>
          </div>
        )}
      </div>

      <div className="rx-under">
        {phase === 'idle' && (
          <>
            <p className="rx-count">
              {total === null ? ' ' : waiting === 0 ? 'empty right now' : `${waiting} in the mailbox`}
            </p>
            <button className="msg-btn" onClick={check}>
              <Icon name="envelope" color="#fff" size={22} />
              Check the mailbox
            </button>
          </>
        )}
        {phase === 'checking' && <p className="rx-count">checking…</p>}
        {phase === 'arrived' && <p className="rx-hint">{letter?.mine ? 'this one’s yours! tap to open' : 'tap to open'}</p>}
        {phase === 'empty' && (
          <>
            <p className="rx-count">Nothing in there yet.</p>
            <div className="sent-btns">
              <button className="msg-btn" onClick={onWrite}>
                <Icon name="pencil" color="#fff" size={22} />
                Write a letter
              </button>
              <button className="msg-btn is-ghost" onClick={() => setPhase('idle')}>
                Okay
              </button>
            </div>
          </>
        )}
        {phase === 'error' && (
          <>
            <p className="rx-count">{msg}</p>
            <button className="msg-btn is-ghost" onClick={() => setPhase('idle')}>
              Try again
            </button>
          </>
        )}
        {phase === 'read' && (
          <div className="rx-actions">
            <div className="sent-btns">
              <button className="msg-btn" onClick={another}>
                <Icon name="envelope" color="#fff" size={22} />
                Open another
              </button>
              <button className="msg-btn is-ghost" onClick={onWrite}>
                <Icon name="pencil" color={C.ink} size={22} />
                Write one back
              </button>
            </div>
            <button className="rx-report" onClick={report} disabled={reported}>
              {reported ? 'reported' : 'report'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ═════════════ page ═════════════
// where each face sits in the character art (fractions of the image), for round avatars
const FACES = {
  mitsumi: { src: '/characters/mitsumi.png', x: 0.54, y: 0.105 },
  shima: { src: '/characters/shima.png', x: 0.47, y: 0.085 },
  yuzuki: { src: '/characters/yuzuki.png', x: 0.51, y: 0.12 },
  mika: { src: '/characters/mika.png', x: 0.49, y: 0.13 },
} as const

/** Head-and-shoulders crop of a character, for the step scenes. */
const bust = (who: keyof typeof FACES): CSSProperties => ({
  backgroundImage: `url(${FACES[who].src})`,
  backgroundPosition: `${((FACES[who].x * 1.5 - 0.5) / 0.5) * 100}% 0`,
})

/** The sealed envelope from step 2, small: the same pink, flap outline and seal. */
function MiniMail() {
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
function MiniBox({ className }: { className: string }) {
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
function GoodBox() {
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
function BadBox() {
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

// the guide's slides, with how long each one stays up before the next (one full loop of its scene)
const STEPS: ReactNode[] = [
  <div className="gd-step" style={{ '--fc': C.pink } as CSSProperties}>
    <div className="gd-scene" aria-hidden="true">
      <div className="gd-stage">
      <span className="gd-bust s1-bust" style={bust('mitsumi')} />
      <div className="s1-paper">
        <i className="s1-line s1-l1" />
        <i className="s1-line s1-l2" />
        <i className="s1-line s1-l3" />
        <span className="s1-heart">
          <Icon name="heart" color={C.pink} size={12} />
        </span>
      </div>
      <span className="s1-pencil">
        <Icon name="pencil" color={C.yellow} size={26} />
      </span>
      </div>
    </div>
    <p>
      <b>1</b> Write a short letter to another fan.
    </p>
</div>,
  <div className="gd-step" style={{ '--fc': C.blue } as CSSProperties}>
    <div className="gd-scene" aria-hidden="true">
      <div className="gd-stage">
      <div className="s2-env">
        <i className="s2-back" />
        <i className="s2-letter" />
        <svg className="s2-front" viewBox="0 0 84 52">
          <path d="M0 0 L39 27 Q42 29 45 27 L84 0 V52 H0 Z" />
        </svg>
        <svg className="s2-flap" viewBox="0 0 84 30">
          <path d="M0 0 H84 L45 27 Q42 29 39 27 Z" />
        </svg>
        <i className="s2-seal" />
      </div>
      <MiniBox className="s2-box" />
      <span className="s2-spark">
        <Icon name="sparkle" color={C.yellow} size={16} />
      </span>
      </div>
    </div>
    <p>
      <b>2</b> It’s sealed and dropped in one shared mailbox, with no name on it unless you sign it.
    </p>
</div>,
  <div className="gd-step" style={{ '--fc': C.green } as CSSProperties}>
    <div className="gd-scene" aria-hidden="true">
      <div className="gd-stage">
      <MiniBox className="s3-box" />
      <span className="s3-env">
        <MiniMail />
      </span>
      <span className="gd-bust s3-bust" style={bust('shima')} />
      <span className="s3-heart">
        <Icon name="heart" color={C.red} size={20} />
      </span>
      </div>
    </div>
    <p>
      <b>3</b> Anyone who checks the mail might get yours, and you can open one too.
    </p>
</div>,
]
const SLIDES: { node: ReactNode; secs: number }[] = [
  ...STEPS.map((node) => ({ node, secs: 5 })),
  { node: <GoodBox />, secs: 6.8 },
  { node: <BadBox />, secs: 6.8 },
]

function Guide() {
  const [at, setAt] = useState(0)
  const area = useRef<HTMLDivElement>(null)

  /** Slides to step n (wrapping round), sliding in from the side you're heading and easing the height. */
  const go = (n: number, dir: number) => {
    const el = area.current
    if (!el) return
    const from = el.offsetHeight
    flushSync(() => setAt((n + SLIDES.length) % SLIDES.length))
    gsap.fromTo(el, { height: from }, { height: el.scrollHeight, duration: 0.4, ease: 'power2.inOut', clearProps: 'height' })
    gsap.fromTo(el.firstElementChild, { x: 46 * dir, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.45, ease: 'power2.out' })
  }

  return (
    <aside className="msg-guide" data-safe="">
      <div className="gd-hero">
        <span className="gd-hero-char" style={{ backgroundImage: `url(${FACES.mitsumi.src})` }} />
        <span className="gd-float gd-f1">
          <Icon name="envelope" color={C.pink} size={30} />
        </span>
        <span className="gd-float gd-f2">
          <Icon name="heart" color="#fff" size={20} />
        </span>
        <span className="gd-float gd-f3">
          <Icon name="sakura" color="#fff" size={22} />
        </span>
        <h3>How it works</h3>
      </div>

      <div className="gd-slides" ref={area} aria-live="polite">
        <div className="gd-slide" key={at}>
          {SLIDES[at].node}
        </div>
      </div>

      <div className="gd-nav">
        <button className="gd-arrow is-prev" onClick={() => go(at - 1, -1)} aria-label="Previous">
          <Icon name="chev" color={C.ink} size={18} />
        </button>
        <div className="gd-dots">
          {SLIDES.map((sl, i) => (
            <button
              key={i}
              className={`gd-dot${i === at ? ' is-on' : ''}`}
              onClick={() => i !== at && go(i, i > at ? 1 : -1)}
              aria-label={`Show part ${i + 1} of ${SLIDES.length}`}
              aria-current={i === at ? 'step' : undefined}
            >
              {/* fills up while the slide plays, then moves on */}
              {i === at && <b key={at} style={{ animationDuration: `${sl.secs}s` }} onAnimationEnd={() => go(at + 1, 1)} />}
            </button>
          ))}
        </div>
        <button className="gd-arrow" onClick={() => go(at + 1, 1)} aria-label="Next">
          <Icon name="chev" color={C.ink} size={18} />
        </button>
      </div>

      <p className="msg-fine">Letters with links or contact details can’t be sent, and letters readers report are taken down.</p>
    </aside>
  )
}

export function Message() {
  const [tab, setTab] = useState<'write' | 'open'>('write')
  const [stats, refresh] = useStats()
  const g = useGeo()
  const body = useRef<HTMLDivElement>(null)

  const go = (t: 'write' | 'open') => {
    if (t === tab) return
    sfx.rustle()
    gsap.to(body.current, {
      autoAlpha: 0,
      y: 16,
      duration: 0.18,
      ease: 'power2.in',
      onComplete: () => {
        flushSync(() => setTab(t))
        refresh()
        gsap.fromTo(body.current, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'back.out(1.5)' })
      },
    })
  }

  return (
    <section className="view view-message">
      <FlexText as="h2" className="msg-title" offset={4} words={[{ t: 'Message', w: 900 }]} data-intro="ui" data-safe="" />

      <div className="msg-tabs" role="tablist" data-intro="ui">
        <button role="tab" aria-selected={tab === 'write'} className={tab === 'write' ? 'is-on' : ''} onClick={() => go('write')}>
          <Icon name="pencil" color={tab === 'write' ? '#fff' : C.ink} size={20} />
          Write
        </button>
        <button role="tab" aria-selected={tab === 'open'} className={tab === 'open' ? 'is-on' : ''} onClick={() => go('open')}>
          <Icon name="envelope" color={tab === 'open' ? '#fff' : C.ink} size={20} />
          Open
          {!!stats.total && <span className="msg-badge">{stats.total > 99 ? '99+' : stats.total}</span>}
        </button>
      </div>

      <div className="msg-layout" data-intro="ui">
        <Guide />
        <div className="msg-desk" ref={body}>
          {tab === 'write' ? (
            <Writer g={g} stats={stats} onSent={refresh} onOpen={() => go('open')} />
          ) : (
            <Reader g={g} total={stats.total} onChange={refresh} onWrite={() => go('write')} />
          )}
        </div>
      </div>
    </section>
  )
}
