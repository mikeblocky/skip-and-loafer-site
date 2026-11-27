import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { gsap } from '../../gsap'
import { C } from '../../data'
import { Icon, type IconName } from '../../icons'
import { sfx } from '../../sfx'
import { reducedMotion } from '../../settings'
import { CALL_ANSWER, CALL_SHEET, FROM_MORSE, LOCKER, MORSE, PART_AT, REPLY, caesar, partName, past2, type PartNo, type Stage2 } from '../../quest'
import { DIRS, SIZE, newMaze, slide, xy, type Dir } from '../../globe'

/**
 * Secret Santa part 2's challenges, each one a pop-up:
 *   Telegraph   the light on the Countdown blinks Morse: write it down, type what it says
 *   TapKey      tap U E N O back on a radio key: short taps and long presses
 *   Wheel       a shift-cipher wheel: turn it to read the note
 *   Globe       the snow globe: an ice maze you tip, four stars, then the gate
 *   Locker      coin locker 1224: four number dials
 * plus the glowing spot on the page that opens one, and the route.
 */

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '')
const pretty = (code: string) => code.replace(/-/g, '−').replace(/\./g, '·')

/** shake a card for a wrong answer */
function nope(el: HTMLElement | null) {
  sfx.clank(0.8)
  if (el && !reducedMotion()) gsap.fromTo(el, { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.3)' })
}

/** the pop-up every challenge sits in: a coloured header, one hint line, then the challenge */
function Pop({
  label,
  color,
  hint,
  onClose,
  children,
  wide,
}: {
  label: string
  color: string
  hint?: ReactNode
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
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
  return (
    <div className="qs q2" role="dialog" aria-modal="true" aria-label={label} lang="en">
      <div className="qg-backdrop q2-backdrop" onClick={onClose} />
      <div className={`q2-card${wide ? ' is-wide' : ''}`} style={{ '--c': color } as CSSProperties}>
        <header className="q2-head">
          <span className="q2-kicker">Skipmas 2026</span>
          <button className="q2-x" ref={close} onClick={onClose} aria-label="Close">
            <Icon name="close" color={C.ink} size={18} />
          </button>
        </header>
        {hint && <p className="q2-hint">{hint}</p>}
        {children}
      </div>
    </div>
  )
}

/** a message under the controls: red when wrong, green when right */
function Status({ text, ok }: { text: string; ok?: boolean }) {
  return (
    <p className={`q2-status${text ? ' is-shown' : ''}${ok ? ' is-ok' : ''}`} role="alert">
      {text}
    </p>
  )
}

/** the answer box with its button on the same row */
function Answer({ label, value, onChange, err, button }: { label: string; value: string; onChange: (v: string) => void; err: string; button: string }) {
  return (
    <div className="q2-answer">
      <label className="q2-label" htmlFor="q2-answer">
        {label}
      </label>
      <div className="q2-answer-row">
        <input
          id="q2-answer"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          aria-invalid={!!err}
          spellCheck={false}
          autoComplete="off"
          enterKeyHint="done"
        />
        <button type="submit" className="q2-go">
          {button}
        </button>
      </div>
      <Status text={err} />
    </div>
  )
}

/** a small toggle or action under the play area */
function Chip({ on, onClick, children, disabled }: { on?: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" className={`q2-chip${on ? ' is-on' : ''}`} onClick={onClick} aria-pressed={on} disabled={disabled}>
      {children}
    </button>
  )
}

/** Makoto's card: the whole alphabet in Morse; click a letter to fill the selected box */
function Chart({ mark, onPick }: { mark?: string; onPick?: (letter: string) => void }) {
  return (
    <div className="q2-chart" aria-label="Morse code chart">
      {Object.entries(MORSE).map(([l, c]) =>
        onPick ? (
          <button type="button" key={l} className={mark === l ? 'is-mark' : ''} onClick={() => onPick(l)} aria-label={`${l}: ${c.replace(/\./g, 'dot ').replace(/-/g, 'dash ')}`}>
            <b>{l}</b>
            <code>{pretty(c)}</code>
          </button>
        ) : (
          <span key={l} className={mark?.includes(l) ? 'is-mark' : ''}>
            <b>{l}</b>
            <code>{pretty(c)}</code>
          </span>
        ),
      )}
    </div>
  )
}

// ── 1 · the signal ───────────────────────────────────────────────────────

/** the message as letters, each knowing which word it's in */
const lettersOf = (text: string) => {
  const out: { ch: string; word: number }[] = []
  text.split(' ').forEach((w, wi) => Array.from(w).forEach((ch) => out.push({ ch, word: wi })))
  return out
}

/** format per-box letters back into spaced words for the answer field */
const joinWords = (letters: { ch: string; word: number }[], picks: string[]) => {
  const words = new Map<number, string>()
  letters.forEach((l, i) => {
    words.set(l.word, (words.get(l.word) ?? '') + (picks[i] || ''))
  })
  return Array.from(words.values()).filter(Boolean).join(' ')
}

/**
 * The light on the Countdown blinks (and beeps) the message; decode it letter by letter, or type it.
 *
 * Made for people who've never seen Morse: it starts slow, shows each dot/dash live as it blinks,
 * and groups one box per letter into words. Tap any box to select and hear just that letter again,
 * tap · / − to decode that box, or click a letter straight on Makoto's Morse card. Stuck? Ask
 * Makoto anytime to write the dots and dashes for the selected box (still yours to look up).
 */
export function Telegraph({ text, onSolved, onClose }: { text: string; onSolved: () => void; onClose: () => void }) {
  const letters = useMemo(() => lettersOf(text), [text])
  const [fast, setFast] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [lit, setLit] = useState(-1)
  const [live, setLive] = useState('')
  const [sel, setSel] = useState(0)
  const [codes, setCodes] = useState<string[]>(() => letters.map(() => ''))
  const [picks, setPicks] = useState<string[]>(() => letters.map(() => ''))
  const [told, setTold] = useState<number[]>([])
  const [answer, setAnswer] = useState('')
  const [err, setErr] = useState('')
  const [chart, setChart] = useState(true)
  const lamp = useRef<HTMLSpanElement>(null)
  const card = useRef<HTMLFormElement>(null)
  const timers = useRef<number[]>([])
  const stop = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    lamp.current?.classList.remove('is-on')
    setLit(-1)
    setLive('')
    setPlaying(false)
  }
  useEffect(() => stop, [])

  /** blink the whole message, or just the letter `only` */
  const play = (only?: number) => {
    stop()
    setPlaying(true)
    // one unit is a dot: slow by default (about 5 words a minute), or ~13 wpm for people who know it
    const u = fast ? 0.095 : 0.22
    let t = only === undefined ? 0.35 : 0.1
    const later = (at: number, fn: () => void) => timers.current.push(window.setTimeout(fn, at * 1000))
    const on = (len: number, sym: string) => {
      sfx.beep(len, t)
      const at = t
      later(at, () => {
        lamp.current?.classList.add('is-on')
        setLive((s) => s + sym)
      })
      later(at + len, () => lamp.current?.classList.remove('is-on'))
    }
    letters.forEach((l, i) => {
      if (only !== undefined && i !== only) return
      // a word gap is seven units: three have already gone after the last letter
      if (only === undefined && i > 0 && letters[i - 1].word !== l.word) t += u * 4
      const from = t
      later(from, () => {
        setLit(i)
        setLive('')
      })
      Array.from(MORSE[l.ch]).forEach((c, k) => {
        if (k) t += u
        const len = c === '-' ? u * 3 : u
        on(len, c)
        t += len
      })
      t += u * 3
    })
    later(t + 0.15, () => {
      setLit(-1)
      setLive('')
      setPlaying(false)
    })
  }

  /** move selection to the next unfilled box, or just the next box */
  const nextSlot = (after: number, nextPicks: string[]) => {
    const empty = nextPicks.findIndex((p, i) => i > after && !p)
    if (empty >= 0) return empty
    const any = nextPicks.findIndex((p) => !p)
    return any >= 0 ? any : Math.min(after + 1, letters.length - 1)
  }

  /** tap a dot or dash into the selected box, auto-decoding it into a letter */
  const addSym = (sym: '.' | '-') => {
    sfx.tick(sym === '.' ? 1.3 : 1.05)
    setErr('')
    const cur = codes[sel] ?? ''
    if (cur.length >= 5) return
    const nextCode = cur + sym
    const nextCodes = codes.map((c, i) => (i === sel ? nextCode : c))
    const decoded = FROM_MORSE[nextCode] ?? ''
    const nextPicks = picks.map((p, i) => (i === sel ? decoded : p))
    setCodes(nextCodes)
    setPicks(nextPicks)
    setAnswer(joinWords(letters, nextPicks))
  }

  /** delete the last dot/dash in the selected box, or clear it and step back */
  const backSym = () => {
    sfx.tick(0.9)
    setErr('')
    const cur = codes[sel] ?? ''
    if (cur) {
      const nextCode = cur.slice(0, -1)
      const nextCodes = codes.map((c, i) => (i === sel ? nextCode : c))
      const decoded = nextCode ? (FROM_MORSE[nextCode] ?? '') : ''
      const nextPicks = picks.map((p, i) => (i === sel ? decoded : p))
      setCodes(nextCodes)
      setPicks(nextPicks)
      setAnswer(joinWords(letters, nextPicks))
    } else if (picks[sel]) {
      const nextPicks = picks.map((p, i) => (i === sel ? '' : p))
      setPicks(nextPicks)
      setAnswer(joinWords(letters, nextPicks))
    } else if (sel > 0) {
      setSel(sel - 1)
    }
  }

  /** pick a letter directly from Makoto's Morse card */
  const pickFromCard = (letter: string) => {
    sfx.tick(1.25)
    setErr('')
    const nextCodes = codes.map((c, i) => (i === sel ? MORSE[letter] : c))
    const nextPicks = picks.map((p, i) => (i === sel ? letter : p))
    setCodes(nextCodes)
    setPicks(nextPicks)
    setAnswer(joinWords(letters, nextPicks))
    setSel(nextSlot(sel, nextPicks))
  }

  /** keep letter boxes in sync when typing directly in the answer input */
  const onAnswerChange = (v: string) => {
    setAnswer(v)
    setErr('')
    const clean = norm(v)
    setPicks(letters.map((_, i) => clean[i] ?? ''))
  }

  /** Makoto writes down the selected (or next) letter's dots and dashes (never the letter itself) */
  const ask = () => {
    const i = !told.includes(sel) ? sel : letters.findIndex((_, k) => !told.includes(k))
    if (i < 0) return
    setTold([...told, i])
    setSel(i)
    sfx.blip(1.12)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (norm(answer) === norm(text)) {
      stop()
      sfx.chime(1.2, 0.8)
      return onSolved()
    }
    const want = norm(text)
    const got = norm(answer)
    const right = Array.from(want).filter((c, i) => got[i] === c).length
    setErr(got ? `${right} of ${want.length} letters right. Tap any box to hear it again.` : 'Type what the light says, or tap the boxes to decode it.')
    nope(card.current)
  }

  const words = Array.from(new Set(letters.map((l) => l.word)))
  const left = letters.length - told.length
  const selCode = codes[sel] || (told.includes(sel) ? MORSE[letters[sel].ch] : '')
  const selMatch = codes[sel] ? FROM_MORSE[codes[sel]] : undefined

  return (
    <Pop label="The cue light" color={C.pink} hint="Short blink is a dot (·), long blink is a dash (−). Tap any box to hear it, then tap · / − or pick from the card." onClose={onClose} wide>
      <form className="q2-body" ref={card} onSubmit={submit}>
        <div className="q2-stage q2-signal">
          <span className={`q2-lamp${playing ? ' is-live' : ''}`} ref={lamp} aria-hidden="true" />
          <div className="q2-signal-ctl">
            <button type="button" className="q2-go is-big" onClick={() => (playing ? stop() : play())}>
              <Icon name={playing ? 'close' : 'play'} color="#fff" size={16} /> {playing ? 'Stop' : 'Play all'}
            </button>
            <div className="q2-signal-meta">
              <Chip on={fast} onClick={() => setFast(!fast)} disabled={playing}>
                Faster
              </Chip>
              <code className="q2-live" aria-hidden="true">
                {pretty(live) || ' '}
              </code>
            </div>
          </div>
        </div>

        {/* one box per letter, in words: tap to select and replay just that letter */}
        <div className="q2-ml-row" aria-label={`${letters.length} letters in ${words.length} word${words.length > 1 ? 's' : ''}`}>
          {words.map((w) => (
            <span key={w} className="q2-ml-word">
              {letters.map((l, i) => {
                if (l.word !== w) return null
                const shownCode = told.includes(i) ? MORSE[l.ch] : codes[i]
                return (
                  <button
                    type="button"
                    key={i}
                    className={`q2-ml${lit === i ? ' is-lit' : ''}${sel === i ? ' is-sel' : ''}${told.includes(i) ? ' is-told' : ''}${picks[i] ? ' is-filled' : ''}`}
                    onClick={() => {
                      setSel(i)
                      play(i)
                    }}
                    aria-pressed={sel === i}
                    aria-label={`Letter ${i + 1}${picks[i] ? `, ${picks[i]}` : ''}${shownCode ? `, ${shownCode.replace(/\./g, 'dot ').replace(/-/g, 'dash ')}` : ''}. Tap to hear again`}
                  >
                    <small>{i + 1}</small>
                    <b>{picks[i] || ''}</b>
                    <code>{shownCode ? pretty(shownCode) : ''}</code>
                  </button>
                )
              })}
            </span>
          ))}
        </div>

        <div className="q2-notes">
          <div className="q2-keys" aria-label={`Write dots and dashes for box ${sel + 1}`}>
            <button type="button" onClick={() => addSym('.')} aria-label="Dot">
              ·
            </button>
            <button type="button" onClick={() => addSym('-')} aria-label="Dash">
              −
            </button>
            <button type="button" className="is-wide" onClick={() => setSel((s) => Math.max(0, s - 1))} disabled={sel === 0} aria-label="Previous box">
              ← prev
            </button>
            <button type="button" className="is-wide" onClick={() => setSel((s) => Math.min(letters.length - 1, s + 1))} disabled={sel === letters.length - 1} aria-label="Next box">
              next →
            </button>
            <button type="button" onClick={backSym} aria-label="Delete">
              ⌫
            </button>
          </div>
          <p className="q2-read" aria-live="polite">
            Box <b>{sel + 1}</b>
            {selCode ? (
              <>
                : <code>{pretty(selCode)}</code>
                {codes[sel] ? (
                  <>
                    {' '}
                    → <b>{selMatch ?? '?'}</b>
                  </>
                ) : (
                  ' — look it up on the card below'
                )}
              </>
            ) : (
              ': tap · / − or click a letter on the card'
            )}
          </p>
        </div>

        <div className="q2-tools">
          <Chip on={chart} onClick={() => setChart(!chart)}>
            Morse card
          </Chip>
          {left > 0 && (
            <Chip onClick={ask}>
              Ask Makoto <small>({left} left)</small>
            </Chip>
          )}
        </div>
        {chart && <Chart mark={selMatch} onPick={pickFromCard} />}

        <Answer label="What does it say?" value={answer} onChange={onAnswerChange} err={err} button="Check" />
      </form>
    </Pop>
  )
}

// ── 2 · the reply ────────────────────────────────────────────────────────

/** under this long it's a dot; any longer is a dash. A pause this long ends the letter */
const DASH_MS = 230
const LETTER_GAP = 1100

/**
 * The radio key: press and hold to send. Tap U E N O back. A meter under the key fills while
 * it's held, so you can see the moment a dot becomes a dash; a wrong letter only takes back that
 * letter, not the ones already right.
 */
export function TapKey({ onSolved, onClose }: { onSolved: () => void; onClose: () => void }) {
  const [letters, setLetters] = useState('')
  const [cur, setCur] = useState('')
  const [down, setDown] = useState(false)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)
  const since = useRef(0)
  const release = useRef<() => void>(() => {})
  const gap = useRef(0)
  const curRef = useRef('')
  const lettersRef = useRef('')
  const card = useRef<HTMLDivElement>(null)
  const done = useRef(false)

  const commit = () => {
    const c = curRef.current
    if (!c) return
    const l = FROM_MORSE[c] ?? '?'
    curRef.current = ''
    setCur('')
    const next = lettersRef.current + l
    lettersRef.current = next
    setLetters(next)
    if (next === REPLY) {
      done.current = true
      sfx.chime(1.3, 0.8)
      setOk(true)
      setMsg('Sent!')
      window.setTimeout(onSolved, 900)
    } else if (!REPLY.startsWith(next)) {
      const want = REPLY[next.length - 1]
      setMsg(
        l === '?'
          ? `“${pretty(c)}” isn’t a letter. ${want} is ${pretty(MORSE[want])}. Try that one again.`
          : `That came out as “${l}”. ${want} is ${pretty(MORSE[want])}. Try that one again.`,
      )
      nope(card.current)
      // only the wrong letter goes; the ones before it stay
      window.setTimeout(() => {
        lettersRef.current = lettersRef.current.slice(0, -1)
        setLetters(lettersRef.current)
      }, 1100)
    } else setMsg('')
  }

  const press = () => {
    if (done.current || down) return
    clearTimeout(gap.current)
    since.current = performance.now()
    release.current = sfx.hold()
    setDown(true)
  }
  const lift = () => {
    if (!down) return
    release.current()
    setDown(false)
    const ms = performance.now() - since.current
    curRef.current += ms < DASH_MS ? '.' : '-'
    setCur(curRef.current)
    if (curRef.current.length > 5) return commit()
    gap.current = window.setTimeout(commit, LETTER_GAP)
  }
  const pressRef = useRef(press)
  pressRef.current = press
  const liftRef = useRef(lift)
  liftRef.current = lift

  useEffect(() => {
    // the space bar is a key too
    const kd = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      e.preventDefault()
      e.stopPropagation()
      pressRef.current()
    }
    const ku = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      e.preventDefault()
      liftRef.current()
    }
    window.addEventListener('keydown', kd, true)
    window.addEventListener('keyup', ku, true)
    return () => {
      window.removeEventListener('keydown', kd, true)
      window.removeEventListener('keyup', ku, true)
      clearTimeout(gap.current)
      release.current()
    }
  }, [])

  const clear = () => {
    clearTimeout(gap.current)
    curRef.current = ''
    lettersRef.current = ''
    setCur('')
    setLetters('')
    setMsg('')
  }

  const at = Math.min(letters.length, REPLY.length - 1)
  return (
    <Pop label="Answer her" color={C.pink} hint="Tap for a dot, hold for a dash, then wait a moment between letters. Space works too." onClose={onClose}>
      <div className="q2-body" ref={card}>
        <div className="q2-stage q2-reply">
          <div className="q2-sent" aria-live="polite" aria-label={`Sent so far: ${letters || 'nothing'}`}>
            {Array.from(REPLY).map((l, i) => (
              <span key={i} className={`q2-slot${letters[i] ? (letters[i] === l ? ' is-ok' : ' is-bad') : i === at && !ok ? ' is-at' : ''}`}>
                <b>{letters[i] ?? l}</b>
                <code>{pretty(MORSE[l])}</code>
              </span>
            ))}
          </div>
          <code className="q2-typing" aria-hidden="true">
            {pretty(cur) || ' '}
          </code>
          <button
            type="button"
            className={`q2-key${down ? ' is-down' : ''}`}
            onPointerDown={(e) => (e.preventDefault(), (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId), press())}
            onPointerUp={lift}
            onPointerCancel={lift}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="The radio key: press and hold"
          >
            <span>{down ? '' : 'Hold'}</span>
          </button>
          {/* fills while the key is held: past the line, it's a dash */}
          <span className={`q2-meter${down ? ' is-down' : ''}`} aria-hidden="true" style={{ '--dash': `${DASH_MS}ms` } as CSSProperties}>
            <i />
            <em className="is-dot">dot</em>
            <em className="is-dash">dash</em>
          </span>
        </div>
        <Status text={msg} ok={ok} />
        <div className="q2-tools">
          <Chip onClick={clear}>Start again</Chip>
        </div>
      </div>
    </Pop>
  )
}

// ── 3 · the shifted note ─────────────────────────────────────────────────

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** the cipher wheel: turn the ring to shift the note back live; when it lines up, read and answer */
export function Wheel({ shift, onSolved, onClose }: { shift: number; onSolved: () => void; onClose: () => void }) {
  const [turn, setTurn] = useState(0)
  const [pick, setPick] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [err, setErr] = useState('')
  const card = useRef<HTMLFormElement>(null)
  const note = useMemo(() => caesar(CALL_SHEET, shift), [shift])
  const decoded = useMemo(() => caesar(note, -turn), [note, turn])
  const aligned = turn === shift
  const R1 = 118
  const R2 = 86
  const step = 360 / 26

  const setTurnWithSfx = (next: number) => {
    setTurn((prev) => {
      if (next === prev) return prev
      if (next === shift) sfx.chime(1.25, 0.35)
      else sfx.tick(1.1 + Math.random() * 0.1)
      return next
    })
  }
  const spin = (by: number) => setTurnWithSfx((turn + by + 26) % 26)
  const spinRef = useRef(spin)
  spinRef.current = spin

  // arrow keys turn the wheel when not typing in the answer box
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return
      if (e.key === 'ArrowLeft') (e.preventDefault(), spinRef.current(-1))
      else if (e.key === 'ArrowRight') (e.preventDefault(), spinRef.current(1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // drag the inner ring round
  const drag = useRef<{ a: number; t: number } | null>(null)
  const angle = (e: RPointerEvent) => {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect()
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const got = norm(answer)
    const want = norm(CALL_ANSWER)
    if (got === want || got.includes(want)) {
      sfx.chime(1.2, 0.8)
      return onSolved()
    }
    setErr(!got ? 'Type what it tells you to do.' : !aligned ? 'Turn the wheel until the note reads clearly first.' : 'Not quite. Read the last three words of the note.')
    nope(card.current)
  }

  // the inner ring: the shifted letter that stands for each real letter (A sits over A+shift)
  const inner = (i: number) => ABC[(i + turn) % 26]
  const pickAt = pick ? (ABC.indexOf(pick) - turn + 26) % 26 : -1

  return (
    <Pop label="Her call sheet" color={C.blue} hint="Turn the wheel by his age until the note makes sense, then type what it tells you to do." onClose={onClose} wide>
      <form className="q2-body" ref={card} onSubmit={submit}>
        <div className="q2-stage q2-cipher">
          <div className={`q2-paper${aligned ? ' is-clear' : ''}`}>
            <p className="q2-note" aria-label={`The note: ${decoded}`}>
              {Array.from(decoded).map((c, i) => {
                const orig = note[i]
                return /[A-Z]/.test(c) ? (
                  <button type="button" key={i} className={pick === orig ? 'is-pick' : ''} onClick={() => (setPick(pick === orig ? null : orig), sfx.tick(1.3))}>
                    {c}
                  </button>
                ) : (
                  <span key={i}>{c}</span>
                )
              })}
            </p>
            <div className="q2-paper-foot">
              {aligned && <span className="q2-clear-tag">Readable!</span>}
              <span className="q2-sign">— ???</span>
            </div>
          </div>
          <div className="q2-wheel-box">
            <svg
              className="q2-wheel"
              viewBox="-140 -140 280 280"
              role="img"
              aria-label={`Cipher wheel, inner ring turned ${turn}: A sits over ${inner(0)}`}
              onWheel={(e) => {
                e.preventDefault()
                spin(e.deltaY < 0 ? 1 : -1)
              }}
              onPointerDown={(e) => {
                ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
                drag.current = { a: angle(e), t: turn }
              }}
              onPointerMove={(e) => {
                if (!drag.current) return
                let d = angle(e) - drag.current.a
                if (d > 180) d -= 360
                if (d < -180) d += 360
                const t = (((drag.current.t - Math.round(d / step)) % 26) + 26) % 26
                if (t !== turn) setTurnWithSfx(t)
              }}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
            >
              <circle r="134" className="q2-wheel-out" />
              <circle r={R2 + 16} className="q2-wheel-in" />
              {Array.from(ABC).map((c, i) => {
                const a = ((i * step - 90) * Math.PI) / 180
                const on = i === pickAt
                return (
                  <g key={c}>
                    <text x={Math.cos(a) * R1} y={Math.sin(a) * R1} className={`q2-w-out${on ? ' is-pick' : ''}`} transform={`rotate(${i * step} ${Math.cos(a) * R1} ${Math.sin(a) * R1})`}>
                      {c}
                    </text>
                    <line x1={Math.cos(a) * (R2 + 16)} y1={Math.sin(a) * (R2 + 16)} x2={Math.cos(a) * (R1 - 12)} y2={Math.sin(a) * (R1 - 12)} className="q2-w-tick" />
                  </g>
                )
              })}
              <g>
                {Array.from(ABC).map((_, i) => {
                  const a = ((i * step - 90) * Math.PI) / 180
                  const c = inner(i)
                  return (
                    <text key={i} x={Math.cos(a) * R2} y={Math.sin(a) * R2} className={`q2-w-in${c === pick ? ' is-pick' : ''}`} transform={`rotate(${i * step} ${Math.cos(a) * R2} ${Math.sin(a) * R2})`}>
                      {c}
                    </text>
                  )
                })}
              </g>
              <circle r="30" className="q2-wheel-hub" />
              <text className="q2-w-turn" y="7">
                {turn}
              </text>
            </svg>
            <div className="q2-spin">
              <button type="button" onClick={() => spin(-1)} aria-label="Turn the inner ring back one">
                <Icon name="chev" color={C.ink} size={18} style={{ rotate: '180deg' }} />
              </button>
              <span>Turn: {turn}</span>
              <button type="button" onClick={() => spin(1)} aria-label="Turn the inner ring on one">
                <Icon name="chev" color={C.ink} size={18} />
              </button>
            </div>
          </div>
        </div>
        <Answer label="What does it tell you to do?" value={answer} onChange={(v) => (setAnswer(v), setErr(''))} err={err} button="Do it" />
      </form>
    </Pop>
  )
}

// ── 4 · the snow globe ───────────────────────────────────────────────────

const KEYS: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }
const ARROW: Record<Dir, string> = { up: '-90deg', down: '90deg', left: '180deg', right: '0deg' }

/** tip the globe and the snowball slides till it hits something; light four stars, reach the gate */
export function Globe({ onSolved, onClose }: { onSolved: (digits: number[]) => void; onClose: () => void }) {
  const [maze, setMaze] = useState(newMaze)
  const [pos, setPos] = useState(maze.start)
  const [got, setGot] = useState(0)
  const [order, setOrder] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [won, setWon] = useState(false)
  const ball = useRef<HTMLElement>(null)
  const board = useRef<HTMLDivElement>(null)
  const all = (1 << maze.stars.length) - 1
  const wonRef = useRef(false)
  const state = useRef({ pos, got, order, busy })
  state.current = { pos, got, order, busy }

  const place = (i: number, quick = true) => {
    const [x, y] = xy(i)
    const to = { left: `${((x + 0.5) / SIZE) * 100}%`, top: `${((y + 0.5) / SIZE) * 100}%` }
    if (quick) gsap.set(ball.current, to)
    return to
  }
  useEffect(() => void place(maze.start), [maze]) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = (fresh = false) => {
    const m = fresh ? newMaze() : maze
    if (fresh) setMaze(m)
    setPos(m.start)
    setGot(0)
    setOrder([])
    if (fresh) setMoves(0)
    place(m.start)
  }

  const tip = (dir: Dir) => {
    const s = state.current
    if (s.busy || wonRef.current) return
    const r = slide(maze, s.pos, s.got, dir)
    if (!r.path.length) {
      // already against something: a little nudge, nothing moves
      sfx.tick(0.8)
      if (board.current && !reducedMotion()) {
        const [dx, dy] = DIRS[dir]
        gsap.fromTo(board.current, { x: dx * 4, y: dy * 4 }, { x: 0, y: 0, duration: 0.3, ease: 'elastic.out(1, 0.4)' })
      }
      return
    }
    setBusy(true)
    setMoves((m) => m + 1)
    setNote('')
    const [dx, dy] = DIRS[dir]
    const quick = reducedMotion()
    const tl = gsap.timeline()
    // the globe tips that way, and back
    if (!quick) {
      tl.to(board.current, { rotationX: -dy * 14, rotationY: dx * 14, duration: 0.18, ease: 'power2.out' }, 0)
      tl.to(board.current, { rotationX: 0, rotationY: 0, duration: 0.5, ease: 'elastic.out(1, 0.45)' }, 0.2 + r.path.length * 0.06)
    }
    sfx.slide(0.15 + r.path.length * 0.05, 0.8)
    const newOrder = [...s.order]
    let gotNow = s.got
    r.path.forEach((cell, k) => {
      const t = quick ? 0 : 0.08 + k * 0.06
      tl.to(ball.current, { ...place(cell, false), duration: quick ? 0 : 0.06, ease: 'none' }, t)
      const si = maze.stars.indexOf(cell)
      if (si >= 0 && !(gotNow & (1 << si))) {
        gotNow |= 1 << si
        newOrder.push(maze.nums[si])
        tl.call(() => sfx.chime(1.2 + newOrder.length * 0.1, 0.5), [], t)
      }
    })
    tl.call(() => {
      setPos(r.to)
      setGot(r.got)
      setOrder(newOrder)
      if (r.fell) {
        sfx.whoosh(0.4, false, 0.14)
        setNote('A hole! Back to the start.')
        gsap.fromTo(ball.current, { scale: 1 }, { scale: 0, duration: quick ? 0 : 0.35, ease: 'power2.in', onComplete: () => (gsap.set(ball.current, { scale: 1 }), reset(), setBusy(false)) })
        return
      }
      if (r.won) {
        wonRef.current = true
        setWon(true)
        sfx.jingle(0.6)
        setNote('Through the gate!')
        window.setTimeout(() => onSolved(newOrder), 1100)
        return
      }
      sfx.thud()
      setBusy(false)
    })
  }
  const tipRef = useRef(tip)
  tipRef.current = tip

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = KEYS[e.key]
      if (!d) return
      e.preventDefault()
      tipRef.current(d)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // a swipe across the globe tips it that way
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const lit = (i: number) => !!(got & (1 << i))

  return (
    <Pop label="The little snow globe" color={C.green} hint="Swipe, use the arrows or the arrow keys. Light all four stars, then reach the gate." onClose={onClose} wide>
      <div className="q2-body q2-globe-layout">
        <div className="q2-globe-wrap">
          <div
            className="q2-globe"
            ref={board}
            onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
            onPointerUp={(e) => {
              const s = swipe.current
              swipe.current = null
              if (!s) return
              const dx = e.clientX - s.x
              const dy = e.clientY - s.y
              if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
              tip(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
            }}
            role="application"
            aria-label={`Snow globe maze. Stars lit: ${order.length} of 4. Use the arrow keys.`}
          >
            <div className="q2-grid" style={{ '--n': SIZE } as CSSProperties}>
              {maze.grid.map((c, i) => {
                const si = maze.stars.indexOf(i)
                const gate = i === maze.gate
                return (
                  <span key={i} className={c === 1 ? 'is-wall' : c === 2 ? 'is-hole' : gate ? `is-gate${got === all ? ' is-open' : ''}` : ''}>
                    {si >= 0 && (
                      <i className={`q2-star${lit(si) ? ' is-lit' : ''}`}>
                        <Icon name="star" color={lit(si) ? C.amber : '#9FB4CC'} size={18} />
                        {lit(si) && <small>{maze.nums[si]}</small>}
                      </i>
                    )}
                    {gate && <Icon name="torii" color={got === all ? C.red : '#9FB4CC'} size={20} />}
                    {i === maze.start && <i className="q2-start" />}
                  </span>
                )
              })}
              <b className="q2-ball" ref={ball} aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="q2-side">
          <div className="q2-stars" aria-label={`Stars: ${order.join(', ') || 'none'}`}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={order[i] !== undefined ? 'is-lit' : ''}>
                {order[i] ?? <Icon name="star" color="#C7D5E4" size={16} />}
              </span>
            ))}
          </div>
          <p className="q2-read">
            Moves <b>{moves}</b> · best {maze.best}
          </p>
          <div className="q2-pad" aria-label="Tip the globe">
            {(['up', 'left', 'right', 'down'] as Dir[]).map((d) => (
              <button key={d} type="button" className={`is-${d}`} onClick={() => tip(d)} aria-label={`Tip ${d}`}>
                <Icon name="chev" color={C.ink} size={20} style={{ rotate: ARROW[d] }} />
              </button>
            ))}
          </div>
          <Status text={note} ok={won} />
          <div className="q2-tools">
            <Chip onClick={() => reset()} disabled={busy}>
              Restart
            </Chip>
            <Chip onClick={() => reset(true)} disabled={busy}>
              New maze
            </Chip>
          </div>
        </div>
      </div>
    </Pop>
  )
}

// ── 5 · the coin locker ──────────────────────────────────────────────────

export function Locker({ digits, onSolved, onClose }: { digits: number[]; onSolved: () => void; onClose: () => void }) {
  const [dials, setDials] = useState([0, 0, 0, 0])
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const turn = (i: number, by: number) => {
    setDials((d) => d.map((v, k) => (k === i ? (v + by + 10) % 10 : v)))
    setErr('')
    sfx.tick(0.9 + i * 0.1)
  }
  const tryIt = () => {
    // the code is the stars in the order they lit; an old save without them falls back to 1224
    if (dials.join('') === (digits.length === 4 ? digits.join('') : LOCKER)) {
      // the dials light one by one, the handle clacks, the door swings, the key glints inside
      setOpen(true)
      setErr('')
      const quick = reducedMotion()
      if (!quick) [0, 1, 2, 3].forEach((i) => window.setTimeout(() => sfx.tick(1.2 + i * 0.12), i * 120))
      window.setTimeout(() => sfx.clack(1), quick ? 0 : 560)
      window.setTimeout(() => sfx.chime(1, 0.8), quick ? 150 : 1150)
      return window.setTimeout(onSolved, quick ? 1000 : 2300)
    }
    setErr('Won’t budge.')
    nope(card.current)
  }
  return (
    <Pop
      label="Locker 1224"
      color={C.red}
      hint="The stars’ numbers, in the order the snowball lit them."
      onClose={onClose}
    >
      <div className="q2-body" ref={card}>
        {digits.length > 0 && (
          <div className="q2-clues" aria-label={`The stars said ${digits.join(', ')}`}>
            <span>Stars</span>
            {digits.map((d, i) => (
              <b key={i}>{d}</b>
            ))}
          </div>
        )}
        <div className={`q2-locker-frame${open ? ' is-open' : ''}`}>
          <div className="q2-locker-inside" aria-hidden="true">
            <span className="q2-locker-key">
              <Icon name="key" color="#8C9AAE" size={44} />
            </span>
          </div>
          <div className="q2-stage q2-locker" inert={open}>
          <div className="q2-locker-handle" aria-hidden="true" />
          <div className="q2-dials">
            {dials.map((v, i) => (
              <div key={i} className="q2-dial" style={{ '--i': i } as CSSProperties}>
                <button type="button" onClick={() => turn(i, 1)} aria-label={`Dial ${i + 1} up`}>
                  <Icon name="chev" color={C.ink} size={18} style={{ rotate: '-90deg' }} />
                </button>
                <output
                  tabIndex={0}
                  aria-label={`Dial ${i + 1}: ${v}`}
                  onWheel={(e) => turn(i, e.deltaY < 0 ? 1 : -1)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') (e.preventDefault(), turn(i, 1))
                    if (e.key === 'ArrowDown') (e.preventDefault(), turn(i, -1))
                    if (/^[0-9]$/.test(e.key)) setDials((d) => d.map((x, k) => (k === i ? Number(e.key) : x)))
                  }}
                >
                  {v}
                </output>
                <button type="button" onClick={() => turn(i, -1)} aria-label={`Dial ${i + 1} down`}>
                  <Icon name="chev" color={C.ink} size={18} style={{ rotate: '90deg' }} />
                </button>
              </div>
            ))}
          </div>
          </div>
        </div>
        <Status text={err} />
        <button type="button" className="q2-go is-big" onClick={tryIt} disabled={open}>
          <Icon name="key" color="#fff" size={16} /> Open
        </button>
      </div>
    </Pop>
  )
}

// ── on the page ──────────────────────────────────────────────────────────

/** something already on the page glows and opens a challenge when clicked (or Enter) */
export function Spot({ sel, label, color, onOpen }: { sel: string; label: string; color: string; onOpen: () => void }) {
  const open = useRef(onOpen)
  open.current = onOpen
  useEffect(() => {
    let undo = () => {}
    const grab = () => {
      const t = document.querySelector<HTMLElement>(sel)
      if (!t) return false
      const had = { tab: t.getAttribute('tabindex'), role: t.getAttribute('role'), label: t.getAttribute('aria-label') }
      // draggable things (the cast on the stage) swallow clicks: a press that barely moves counts too
      let at: { x: number; y: number } | null = null
      let last = 0
      const fire = () => {
        if (performance.now() - last < 400) return
        last = performance.now()
        open.current()
      }
      const click = (e: Event) => (e.preventDefault(), e.stopPropagation(), fire())
      const down = (e: PointerEvent) => (at = { x: e.clientX, y: e.clientY })
      const up = (e: PointerEvent) => {
        if (at && Math.hypot(e.clientX - at.x, e.clientY - at.y) < 6) fire()
        at = null
      }
      const key = (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && click(e)
      t.classList.add('q2-spot')
      t.style.setProperty('--c', color)
      t.setAttribute('title', label)
      if (had.tab === null) t.setAttribute('tabindex', '0')
      if (had.role === null) t.setAttribute('role', 'button')
      t.setAttribute('aria-label', label)
      t.addEventListener('click', click, true)
      t.addEventListener('keydown', key, true)
      t.addEventListener('pointerdown', down, true)
      window.addEventListener('pointerup', up, true)
      undo = () => {
        t.removeEventListener('pointerdown', down, true)
        window.removeEventListener('pointerup', up, true)
        t.classList.remove('q2-spot')
        t.style.removeProperty('--c')
        t.removeAttribute('title')
        if (had.tab === null) t.removeAttribute('tabindex')
        if (had.role === null) t.removeAttribute('role')
        if (had.label === null) t.removeAttribute('aria-label')
        else t.setAttribute('aria-label', had.label)
        t.removeEventListener('click', click, true)
        t.removeEventListener('keydown', key, true)
      }
      return true
    }
    // the page may still be animating in: look again until it's there
    const id = grab() ? 0 : window.setInterval(() => grab() && clearInterval(id), 250)
    return () => (clearInterval(id), undo())
  }, [sel, label, color])
  return null
}

/** the route for part 2, in the same corner as part 1's */
export function Route2({ stage, santaOpen }: { stage: Stage2; santaOpen: boolean }) {
  const [open, setOpen] = useState(false)
  const now: Record<Stage2, string> = {
    none: '',
    memories: 'Some memories changed. Tap Shima to go back through them',
    letter: santaOpen ? 'Write a letter in the Secret Santa tab' : 'Send a letter from the Message tab',
    signal: 'The clock on the Countdown page is blinking',
    reply: 'Answer her: tap the clock on the Countdown page',
    cipher: 'Her call sheet is on the Volumes page',
    globe: 'The snow globe fell onto the Birthdays page',
    locker: 'Locker 1224 is on the Message page',
    done: '',
  }
  const stops: { s: Stage2; icon: IconName; label: string }[] = [
    { s: 'memories', icon: 'film', label: 'Memories' },
    { s: 'letter', icon: 'envelope', label: 'Letter' },
    { s: 'signal', icon: 'sound', label: 'Cue light' },
    { s: 'reply', icon: 'bolt', label: 'Answer' },
    { s: 'cipher', icon: 'list', label: 'Call sheet' },
    { s: 'globe', icon: 'snow', label: 'Snow globe' },
    { s: 'locker', icon: 'key', label: 'Locker' },
  ]
  return (
    <aside className="qh q2-route" lang="en" aria-label="Secret Santa part 2">
      <div className={`qh-card${open ? ' is-open' : ''}`}>
        <button className="qh-head" onClick={() => setOpen(!open)} aria-expanded={open}>
          <Icon name="key" color={C.amber} size={18} />
          <span>The Tilt</span>
          <Icon name="chev" color={C.ink} size={16} style={{ rotate: open ? '90deg' : '-90deg' }} />
        </button>
        <ol className="qr">
          {stops.map((st) => {
            const done = past2(stage, st.s)
            const at = stage === st.s
            return (
              <li key={st.s} className={done ? 'is-done' : at ? 'is-at' : ''} title={st.label}>
                <span className="qr-dot">
                  <Icon name={done ? 'check' : st.icon} color={done ? '#fff' : at ? C.red : '#B9B2A4'} size={14} />
                </span>
              </li>
            )
          })}
        </ol>
        <p className="qh-now">{now[stage]}</p>
      </div>
    </aside>
  )
}

/** the Dimensional Gift: part 2 done (saved as the 'silver' key, so older saves keep it) */
export function DimensionalGift({ onClose }: { onClose: () => void }) {
  const key = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    btn.current?.focus({ preventScroll: true })
    if (!reducedMotion()) gsap.fromTo(key.current, { scale: 0, rotation: 200 }, { scale: 1, rotation: 0, duration: 1.4, ease: 'elastic.out(1, 0.5)' })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="qs qb" role="dialog" aria-modal="true" aria-label="The Dimensional Gift" lang="en">
      <div className="qg-backdrop q2-backdrop" onClick={onClose} />
      <div className="qb-card is-flat">
        <div className="qb-key is-gift" ref={key}>
          <Icon name="unwrapped" color="#fff" size={64} />
        </div>
        <span className="qb-kicker">Found in locker 1224</span>
        <h3>The Dimensional Gift</h3>
        <p>With Shima’s old letter and a photo signed “For my little star. Y.” It’s bigger on the inside. It opens in part 3.</p>
        <p className="qb-reward">
          <Icon name="snow" color={C.sky} size={16} />
          <span>
            <b>Rewards:</b> snow on every page, and Santa hats for Yuzuki and Makoto. Turn the snow off in Settings.
          </span>
        </p>
        <button ref={btn} className="sx-btn is-strong" style={{ '--c': C.sky } as CSSProperties} onClick={onClose}>
          Keep it
        </button>
      </div>
    </div>
  )
}

// ── between parts: the keys so far, and the countdown to the next part ───

/** "1d 4h", "3h 12m", "5m"; with `secs`, down to the second */
export function untilText(ms: number, secs = false) {
  if (ms <= 0) return 'now'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const parts = d ? [`${d}d`, `${h}h`, `${m}m`] : h ? [`${h}h`, `${m}m`] : [`${m}m`]
  if (secs) parts.push(`${s % 60}s`)
  return (secs ? parts : parts.slice(0, 2)).join(' ')
}
const whenText = (at: number) => new Date(at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** what each part leaves you with; the ones not out yet stay "???" until they're found */
const SK_KEYS: { id: string; name: string; part: 1 | PartNo; color: string; icon?: IconName }[] = [
  { id: 'ueno', name: 'Key of Ueno', part: 1, color: C.amber },
  { id: 'silver', name: 'Dimensional Gift', part: 2, color: C.violet, icon: 'unwrapped' },
  { id: 'third', name: '???', part: 3, color: C.red },
  { id: 'fourth', name: '???', part: 4, color: C.green },
  { id: 'final', name: '???', part: 5, color: C.sky, icon: 'star' },
]

/** the clock for the badge: every 30 s, or every second while its card is open */
function useNow(fast: boolean) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), fast ? 1000 : 30_000)
    return () => clearInterval(id)
  }, [fast])
  return now
}

/** bottom-left between parts: the keys found so far and how long until the next part */
export function SkipmasBadge({ keys, next }: { keys: string[]; next: PartNo }) {
  const [open, setOpen] = useState(false)
  const now = useNow(open)
  const left = PART_AT[next] - now
  const out = left <= 0
  return (
    <>
      <button className={`q2-sk${out ? ' is-out' : ''}`} onClick={() => (setOpen(true), sfx.chime(1.2, 0.5))} lang="en" aria-haspopup="dialog">
        <span className="q2-sk-tag">Skipmas 2026</span>
        <span className="q2-sk-keys" aria-label={`Found: ${SK_KEYS.filter((k) => keys.includes(k.id)).length} of ${SK_KEYS.length}`}>
          {SK_KEYS.map((k) => (
            <i key={k.id} className={keys.includes(k.id) ? 'is-got' : ''} style={{ '--k': k.color } as CSSProperties}>
              <Icon name={k.icon ?? 'key'} color={keys.includes(k.id) ? '#fff' : '#B9B2A4'} size={13} />
            </i>
          ))}
        </span>
        <span className="q2-sk-when">{out ? `${partName(next)} is out!` : `${partName(next)} · ${untilText(left)}`}</span>
      </button>
      {open && (
        <Pop
          label="Skipmas 2026"
          color={C.teal}
          hint={out ? (next === 2 ? 'Part 2 is out. Use the Key of Ueno at the ticket gate.' : `${partName(next)} is out.`) : `${partName(next)} opens in ${untilText(left, true)}.`}
          onClose={() => setOpen(false)}
        >
          <ul className="q2-sk-list">
            {SK_KEYS.map((k) => {
              const got = keys.includes(k.id)
              const at = k.part === 1 ? 0 : PART_AT[k.part]
              return (
                <li key={k.id} className={got ? 'is-got' : ''} style={{ '--k': k.color } as CSSProperties}>
                  <span className="q2-sk-icon">
                    <Icon name={k.icon ?? 'key'} color={got ? '#fff' : '#B9B2A4'} size={20} />
                  </span>
                  <span className="q2-sk-name">
                    <b>{got ? k.name : k.part >= 3 ? '???' : k.name}</b>
                    <small>{partName(k.part)}</small>
                  </span>
                  <span className="q2-sk-state">{got ? 'Found' : at > now ? whenText(at) : 'Waiting for you'}</span>
                </li>
              )
            })}
          </ul>
        </Pop>
      )}
    </>
  )
}

/** a pine for the snowy background: three tiers, the shady side darker, snow on each tier */
function ScapePine({ x, y, s = 1, far = false }: { x: number; y: number; s?: number; far?: boolean }) {
  const light = far ? '#B9CCDC' : '#5E8A78'
  const dark = far ? '#A9BDCF' : '#4A7262'
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {!far && <rect x="-6" y="-6" width="12" height="20" fill="#8A6E5A" />}
      {[0, 1, 2].map((k) => {
        const w = 52 - k * 13
        const top = -40 - k * 34
        return (
          <g key={k}>
            <polygon points={`${-w},${top + 46} 0,${top} ${w},${top + 46}`} fill={light} />
            <polygon points={`0,${top} ${w},${top + 46} 0,${top + 46}`} fill={dark} />
            <path d={`M${-w * 0.5} ${top + 26} Q0 ${top + 8} ${w * 0.5} ${top + 26} L${w * 0.28} ${top + 20} L0 ${top + 4} L${-w * 0.28} ${top + 20} Z`} fill="#FFFFFF" />
          </g>
        )
      })}
    </g>
  )
}

/** a little house in the village: snow on the roof, warm windows, a wisp from the chimney */
function ScapeHouse({ x, y, w = 70, wall = '#E7D8C8', roof = '#B86A6F' }: { x: number; y: number; w?: number; wall?: string; roof?: string }) {
  const h = w * 0.62
  return (
    <g>
      <rect x={x + w * 0.62} y={y - h - 30} width="10" height="22" fill="#8C7E70" />
      <path d={`M${x + w * 0.62 + 5} ${y - h - 34} q-10 -12 0 -22 q10 -10 0 -22`} fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
      <rect x={x} y={y - h} width={w} height={h} fill={wall} />
      <polygon points={`${x - 8},${y - h} ${x + w / 2},${y - h - 30} ${x + w + 8},${y - h}`} fill={roof} />
      <path d={`M${x - 8} ${y - h} L${x + w / 2} ${y - h - 30} L${x + w + 8} ${y - h} L${x + w} ${y - h + 5} L${x + w / 2} ${y - h - 22} L${x} ${y - h + 5} Z`} fill="#FFFFFF" />
      <rect x={x + w * 0.18} y={y - h * 0.68} width={w * 0.2} height={h * 0.3} fill="#FFD27A" />
      <rect x={x + w * 0.58} y={y - h * 0.68} width={w * 0.2} height={h * 0.3} fill="#FFD27A" />
    </g>
  )
}

/**
 * The reward for part 2: the snow she shook up, settled on every page. A small winter landscape
 * along the bottom (pale hills, a pine forest, a village with its windows lit, a lamp post strung
 * with lights, a snowman) and a pine garland with baubles hung along the top. All of it sits
 * behind the page, pale enough to read over.
 */
export function SnowScape() {
  useEffect(() => {
    document.documentElement.classList.add('q2-snowy')
    return () => document.documentElement.classList.remove('q2-snowy')
  }, [])
  const BULBS = ['#FFD36B', '#FF8FA8', '#8FD3FF', '#B8F0A8']
  return (
    <div className="q2-scape" aria-hidden="true">
      {/* the garland across the top: one stretch of it, repeated, so nothing gets stretched */}
      <svg className="q2-garland" width="100%" height="64">
        <defs>
          <pattern id="q2-garland" width="240" height="64" patternUnits="userSpaceOnUse">
            <path d="M0 10 Q60 42 120 14 Q180 42 240 10" fill="none" stroke="#5E8A78" strokeWidth="14" strokeLinecap="round" />
            <path d="M0 10 Q60 42 120 14 Q180 42 240 10" fill="none" stroke="#4A7262" strokeWidth="5" strokeDasharray="3 9" strokeLinecap="round" />
            <line x1="60" y1="31" x2="60" y2="42" stroke="#C9B8A2" strokeWidth="2" />
            <circle cx="60" cy="50" r="10" fill="#D9535E" />
            <rect x="56" y="38" width="8" height="5" fill="#D9A94A" />
            <line x1="180" y1="31" x2="180" y2="40" stroke="#C9B8A2" strokeWidth="2" />
            <circle cx="180" cy="48" r="9" fill="#3F8FD2" />
            <rect x="176" y="36" width="8" height="5" fill="#D9A94A" />
            <circle cx="30" cy="24" r="4" fill="#FFD36B" />
            <circle cx="96" cy="26" r="4" fill="#FF8FA8" />
            <circle cx="148" cy="26" r="4" fill="#8FD3FF" />
            <circle cx="214" cy="22" r="4" fill="#B8F0A8" />
            <path d="M120 14 l-10 -8 l0 16 z M120 14 l10 -8 l0 16 z" fill="#C2525C" />
            <circle cx="120" cy="14" r="4" fill="#A9434D" />
          </pattern>
        </defs>
        <rect width="100%" height="64" fill="url(#q2-garland)" />
      </svg>

      {/* the landscape along the bottom */}
      <svg className="q2-land" viewBox="0 0 1600 400" preserveAspectRatio="xMidYMax slice">
        {/* far hills and their pines, pale */}
        <path d="M0 210 C160 150 300 190 460 160 S760 120 900 170 S1220 140 1360 160 S1540 150 1600 170 V400 H0 Z" fill="#DCE7F2" />
        {[80, 150, 230, 610, 680, 1040, 1110, 1180, 1470, 1530].map((x, i) => (
          <ScapePine key={i} x={x} y={190 - (i % 3) * 8} s={0.55 + (i % 2) * 0.12} far />
        ))}
        {/* the village on the middle hill, windows lit */}
        <path d="M0 270 C200 230 380 250 560 236 S900 220 1080 244 S1400 236 1600 252 V400 H0 Z" fill="#EAF1F8" />
        <ScapeHouse x={600} y={250} w={74} />
        <ScapeHouse x={690} y={246} w={60} wall="#DCE6EF" roof="#6E7FA6" />
        <ScapeHouse x={770} y={250} w={84} wall="#EFE2D0" roof="#B86A6F" />
        <ScapeHouse x={870} y={254} w={58} wall="#E4D7CA" roof="#7E9C86" />
        {/* the near drifts, with pines either side */}
        <path d="M0 320 C180 290 360 310 520 300 S860 280 1040 304 S1380 296 1600 310 V400 H0 Z" fill="#F7FAFD" stroke="#D3E0EE" strokeWidth="3" />
        <ScapePine x={70} y={330} s={1.3} />
        <ScapePine x={170} y={322} s={0.95} />
        <ScapePine x={1450} y={326} s={1.2} />
        <ScapePine x={1540} y={334} s={1.45} />
        {/* a lamp post, strung with lights to the nearest pine */}
        <g>
          <rect x="1300" y="196" width="8" height="120" fill="#5A6478" />
          <rect x="1290" y="180" width="28" height="24" rx="5" fill="#5A6478" />
          <rect x="1295" y="185" width="18" height="14" rx="3" fill="#FFE3A0" />
          <circle cx="1304" cy="192" r="26" fill="#FFE3A0" opacity="0.25" />
          <path d="M1304 214 Q1380 262 1450 226" fill="none" stroke="#5A6478" strokeWidth="2" />
          {[0, 1, 2, 3, 4, 5].map((k) => {
            const t = (k + 0.5) / 6
            const x = 1304 + (1450 - 1304) * t
            const y = 214 + (226 - 214) * t + Math.sin(Math.PI * t) * 30
            return <circle key={k} className="q2-bulb" cx={x} cy={y + 5} r="5" fill={BULBS[k % BULBS.length]} style={{ animationDelay: `${k * 0.4}s` }} />
          })}
        </g>
        {/* a fence half under the snow, and a snowman */}
        {[0, 1, 2, 3, 4, 5, 6].map((k) => (
          <rect key={k} x={260 + k * 34} y="296" width="8" height="30" fill="#B9A48E" />
        ))}
        <rect x="256" y="304" width="240" height="6" fill="#B9A48E" />
        <g>
          <circle cx="1210" cy="320" r="26" fill="#FFFFFF" stroke="#D3E0EE" strokeWidth="3" />
          <circle cx="1210" cy="282" r="18" fill="#FFFFFF" stroke="#D3E0EE" strokeWidth="3" />
          <path d="M1194 294 Q1210 302 1226 294 L1226 300 Q1210 308 1194 300 Z" fill="#D9535E" />
          <circle cx="1204" cy="279" r="2.5" fill="#4A4A5A" />
          <circle cx="1216" cy="279" r="2.5" fill="#4A4A5A" />
          <polygon points="1210,284 1224,288 1210,290" fill="#F07A3A" />
          <rect x="1197" y="252" width="26" height="12" fill="#4A4A5A" />
          <rect x="1192" y="262" width="36" height="5" fill="#4A4A5A" />
        </g>
      </svg>
      {/* glints in the snow */}
      {Array.from({ length: 16 }, (_, i) => (
        <i key={i} style={{ '--x': `${(i * 41 + 7) % 97}%`, '--y': `${2 + ((i * 13) % 12)}vh`, '--d': `${(i * 0.53) % 3.4}s` } as CSSProperties} />
      ))}
    </div>
  )
}
