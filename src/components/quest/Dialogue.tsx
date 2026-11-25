import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { gsap } from '../../gsap'
import { C, CHARACTERS } from '../../data'
import { Icon, type IconName } from '../../icons'
import { sfx } from '../../sfx'
import { reducedMotion } from '../../settings'
import { SantaHat } from './SantaHat'
import { SceneBg, type Backdrop } from './SceneBg'

export type Speaker = 'shima' | 'mitsumi'
/** ??? never appears: they write letters, and speak out of nowhere. The narrator tells the rest. */
export type Voice = Speaker | 'unknown' | 'narrator'

/**
 * One line of a scene. The text can carry effects:
 *   *words*          in italics, for weight
 *   {shake:words}    the letters tremble (shouting, panic)
 *   {wave:words}     the letters bob (sing-song, teasing)
 *   {small:words}    quiet, faded (muttering, a whisper)
 *   {big:words}      big and bold (a shout)
 *   {glow:words}     softly glowing (??? and anything a bit magic)
 * and the whole moment can have one too (`fx`): the screen shakes, flashes white, goes dark for
 * a blink, a burst of snow, or the talk box glows.
 */
export interface Line {
  who: Voice
  text: string
  /** phone: said down the phone · letter: read out from a letter · voice: from nowhere */
  via?: 'phone' | 'letter' | 'voice' | 'memory'
  /** a label of its own beside the name, e.g. "eight years old" */
  tag?: string
  /** poof: a Santa hat lands on Mitsumi's head too */
  fx?: 'shake' | 'flash' | 'dark' | 'snow' | 'glow' | 'poof'
  /**
   * How the speaker moves as the line starts. Without one, it's read off the line: shaky text
   * shakes, a shout or an exclamation hops, sing-song text sways.
   *   spin   turns all the way round on the spot, like a globe (a 3D turn, not a cartwheel)
   *   shake  trembles side to side
   *   hop    a quick jump
   *   sway   leans one way, then back
   *   nod    a little squash, like nodding along
   */
  anim?: Move
}
/**
 * How someone arrives: already standing there, pops up from below, walks on from their side,
 * or walks on and then nearly jumps out of their skin (a flip: front, back or sideways).
 */
export type Entry = 'here' | 'pop' | 'walk' | 'shock'
export type Move = 'spin' | 'shake' | 'hop' | 'sway' | 'nod'

/** the move a line gets when it doesn't name one */
function moveFor(line: Line): Move | undefined {
  if (line.anim) return line.anim
  const t = line.text
  if (t.includes('{shake:') || line.fx === 'shake') return 'shake'
  if (t.includes('{big:') || /[!?]!\}?$|!\}?$/.test(t.trim())) return 'hop'
  if (t.includes('{wave:')) return 'sway'
  if (/^(yeah|yep|okay|right|deal)\b/i.test(t)) return 'nod'
  return undefined
}

/** the title card a chapter opens on */
export interface Chapter {
  n: number
  title: string
  /** one line under the title */
  note?: string
}

/** each voice blips at its own pitch, like an old RPG; ??? is low and slow; narration is quiet */
const PITCH: Record<Voice, number> = { shima: 0.78, mitsumi: 1.25, unknown: 0.5, narrator: 0.95 }
const CPS = 40
const SIDE: Record<Speaker, 'left' | 'right'> = { mitsumi: 'left', shima: 'right' }
const VIA: Record<NonNullable<Line['via']>, { icon: IconName; label: string }> = {
  phone: { icon: 'phone', label: 'on the phone' },
  letter: { icon: 'envelope', label: 'the letter' },
  voice: { icon: 'snow', label: 'from somewhere' },
  memory: { icon: 'film', label: 'remembering' },
}
const FULL: Record<string, string> = { mitsumi: 'Iwakura Mitsumi', shima: 'Shima Sousuke' }

const info = (id: Voice) =>
  id === 'unknown' ? { name: '???', color: C.ink, src: '' } : id === 'narrator' ? { name: '', color: '#8a7559', src: '' } : CHARACTERS.find((c) => c.id === id)!

// ── the text effects ─────────────────────────────────────────────────────

type Fx = 'em' | 'shake' | 'wave' | 'small' | 'big' | 'glow'
interface Seg {
  text: string
  fx?: Fx
}
/** "{shake:Shima-kun!} I *did*" → segments with their effects; the braces and stars never show */
function parse(s: string): Seg[] {
  const out: Seg[] = []
  const re = /\{(shake|wave|small|big|glow):([^}]*)\}|\*([^*]+)\*/g
  let last = 0
  for (let m; (m = re.exec(s)); ) {
    if (m.index > last) out.push({ text: s.slice(last, m.index) })
    out.push(m[1] ? { text: m[2], fx: m[1] as Fx } : { text: m[3], fx: 'em' })
    last = re.lastIndex
  }
  if (last < s.length) out.push({ text: s.slice(last) })
  return out
}
const plain = (segs: Seg[]) => segs.map((x) => x.text).join('')

/** the line, typed out to `shown` letters; the rest keeps its room (hidden) so nothing reflows */
function Typed({ segs, shown }: { segs: Seg[]; shown: number }) {
  let n = 0
  return (
    <>
      {segs.map((seg, i) => {
        const chars = Array.from(seg.text).map((ch, k) => {
          const at = n++
          const hidden = at >= shown
          if (!seg.fx || seg.fx === 'em' || seg.fx === 'small' || seg.fx === 'big') {
            return hidden ? (
              <span key={k} className="qd-hide">
                {ch}
              </span>
            ) : (
              <Fragment key={k}>{ch}</Fragment>
            )
          }
          // shake, wave and glow move letter by letter
          return (
            <span key={k} className={`qd-ch${hidden ? ' qd-hide' : ''}`} style={{ '--k': k } as CSSProperties}>
              {ch === ' ' ? ' ' : ch}
            </span>
          )
        })
        return (
          <span key={i} className={seg.fx ? `qd-fx-${seg.fx}` : undefined}>
            {chars}
          </span>
        )
      })}
    </>
  )
}

// ── the chapter card ─────────────────────────────────────────────────────

/** a chapter opens on its title, in the site's own sticker-and-paper look */
function ChapterCard({ ch, onGo }: { ch: Chapter; onGo: () => void }) {
  return (
    <div className="qc" onClick={(e) => (e.stopPropagation(), onGo())}>
      <div className="qc-card">
        <span className="qc-kicker">
          <Icon name="snow" color="#fff" size={14} />
          Secret Santa · Part 1 · Chapter {ch.n}
        </span>
        <h3 className="qc-title">{ch.title}</h3>
        {ch.note && <p className="qc-note">{ch.note}</p>}
        <span className="qc-go">
          Tap to start <Icon name="chev" color={C.sky} size={16} />
        </span>
      </div>
    </div>
  )
}

// ── the scene ────────────────────────────────────────────────────────────

/**
 * An RPG-style talk box: the cast stands along the bottom in front of a painted backdrop,
 * whoever's talking bounces while their words type out, and a click (or Enter / Space) finishes
 * the line, then moves on. A flashback (`past`) is washed out like an old photo, with a caption
 * saying when it was. A chapter opens on its title card.
 */
export function Dialogue({
  lines,
  cast,
  dark,
  past,
  bg,
  chapter,
  hat = true,
  mitsumiHat = false,
  snow = false,
  exit = false,
  when,
  onDone,
}: {
  lines: Line[]
  /** who is on screen, and how each of them arrives (in order) */
  cast: [Speaker, Entry][]
  dark?: boolean
  /** a flashback: when and where, e.g. "One week earlier · the shoe lockers" */
  past?: string
  /** a painted place behind them; without one, the site shows through */
  bg?: Backdrop
  chapter?: Chapter
  /** Shima in his Santa hat (a shocked Shima gets his the moment he jumps) */
  hat?: boolean
  /** Mitsumi already has hers (she gets it with a line's `fx: 'poof'`) */
  mitsumiHat?: boolean
  /** snow falling over the whole scene */
  snow?: boolean
  /** after the last line, the two of them walk off together */
  exit?: boolean
  /** when and where, for a scene that isn't a flashback, e.g. "The next morning · the school gate" */
  when?: string
  onDone: () => void
}) {
  const shocked = cast.some(([, how]) => how === 'shock')
  const [card, setCard] = useState(!!chapter)
  const [at, setAt] = useState(0)
  const [shown, setShown] = useState(0)
  const [live, setLive] = useState(false)
  const [startled, setStartled] = useState(false)
  const [hatOn, setHatOn] = useState(hat && !shocked)
  const [mitsuHat, setMitsuHat] = useState(mitsumiHat)
  const leaving = useRef(false)
  // a line with fx 'snow' starts it snowing for the rest of the scene
  const [snowing, setSnowing] = useState(snow)
  const puffM = useRef<HTMLSpanElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const sprites = useRef<Record<string, HTMLDivElement | null>>({})
  const box = useRef<HTMLDivElement>(null)
  const puff = useRef<HTMLSpanElement>(null)
  const flash = useRef<HTMLDivElement>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const line = lines[at]
  const segs = parse(line.text)
  const text = plain(segs)
  const full = shown >= text.length

  // the cast arrives one after another, then the talk box slides up (after the chapter card)
  useEffect(() => {
    if (card) return
    const quick = reducedMotion()
    const tl = gsap.timeline({ onComplete: () => setLive(true) })
    let t = past || bg ? 0.6 : 0.15
    cast.forEach(([id, how]) => {
      const el = sprites.current[id]
      if (!el) return
      if (quick || how === 'here') {
        if (how === 'shock') setHatOn(hat)
        return void gsap.set(el, { autoAlpha: 1 })
      }
      if (how === 'pop') {
        tl.fromTo(el, { y: 260, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'back.out(1.3)' }, t)
        tl.call(() => sfx.pop(0.7), [], t + 0.2)
        t += 0.35
        return
      }
      // walking on: in from their own side, a little hop on every step
      const dir = SIDE[id] === 'left' ? -1 : 1
      const steps = 7
      tl.set(el, { x: dir * window.innerWidth * 0.6, autoAlpha: 1 }, t)
      tl.to(el, { x: 0, duration: 2.1, ease: 'power1.out' }, t)
      for (let s = 0; s < steps; s++) {
        tl.to(el, { y: -16, rotation: s % 2 ? 3 : -3, duration: 0.14, ease: 'power2.out' }, t + s * 0.29)
        tl.to(el, { y: 0, duration: 0.14, ease: 'power2.in' }, t + 0.14 + s * 0.29)
        tl.call(() => sfx.tick(0.7 + (s % 2) * 0.1, 0.7), [], t + 0.28 + s * 0.29)
      }
      tl.to(el, { rotation: 0, duration: 0.25 }, t + 2.1)
      t += 2.3
      if (how === 'shock') {
        // poof: out of nowhere, a Santa hat on his head. A beat, the "!", then up he goes.
        tl.call(() => (setHatOn(hat), sfx.pop(1.6), sfx.chime(1.6, 0.5)), [], t + 0.1)
        tl.fromTo(puff.current, { scale: 0.2, autoAlpha: 1 }, { scale: 1.6, autoAlpha: 0, duration: 0.6, ease: 'power2.out' }, t + 0.1)
        tl.call(() => (setStartled(true), sfx.clank(1.3), sfx.boing()), [], t + 0.75)
        tl.to(el, { y: -window.innerHeight * 0.22, duration: 0.38, ease: 'power2.out' }, t + 0.8)
        tl.call(() => sfx.whoosh(0.5, true, 0.18), [], t + 0.8)
        // a full turn on the spot in mid-air, like a globe spinning (one way or the other)
        tl.to(el, { rotationY: Math.random() < 0.5 ? 360 : -360, duration: 0.76, ease: 'power1.inOut' }, t + 0.8)
        tl.to(el, { y: 0, duration: 0.38, ease: 'power2.in' }, t + 1.18)
        tl.call(() => sfx.thud(), [], t + 1.56)
        // a full turn is no turn: reset it so nothing spins back
        tl.set(el, { rotation: 0, rotationY: 0 }, t + 1.56)
        tl.to(el, { scaleY: 0.9, scaleX: 1.06, transformOrigin: '50% 100%', duration: 0.08 }, t + 1.56)
        tl.to(el, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' }, t + 1.64)
        t += 2
      }
    })
    if (quick) {
      gsap.set(box.current, { autoAlpha: 1 })
      tl.progress(1)
    } else tl.fromTo(box.current, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'back.out(1.4)' }, t)
    return () => void tl.kill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card])

  // the "!" only hangs around for a moment once the talking starts
  useEffect(() => {
    if (!startled || !live) return
    const id = window.setTimeout(() => setStartled(false), 1400)
    return () => clearTimeout(id)
  }, [startled, live])

  // the moment's effect, as the line begins
  useEffect(() => {
    if (!live || !line.fx) return
    const quick = reducedMotion()
    if (line.fx === 'shake') {
      sfx.thud()
      if (!quick) gsap.fromTo(root.current, { x: -14 }, { x: 0, duration: 0.7, ease: 'elastic.out(1.4, 0.2)', clearProps: 'x' })
    } else if (line.fx === 'flash' || line.fx === 'dark') {
      sfx.whoosh(0.4, line.fx === 'flash', 0.12)
      gsap.fromTo(
        flash.current,
        { autoAlpha: quick ? 0.4 : 1, backgroundColor: line.fx === 'flash' ? '#ffffff' : '#08070f' },
        { autoAlpha: 0, duration: line.fx === 'flash' ? 0.8 : 1.2, ease: 'power2.in' },
      )
    } else if (line.fx === 'snow') {
      setSnowing(true)
      sfx.rustle()
      if (!quick) burst(root.current!)
    } else if (line.fx === 'glow') sfx.chime(0.8, 0.5)
    else if (line.fx === 'poof') {
      // poof: hers turns up out of nowhere too, and she jumps
      setMitsuHat(true)
      sfx.pop(1.6)
      sfx.chime(1.6, 0.5)
      const el = sprites.current.mitsumi
      gsap.fromTo(puffM.current, { scale: 0.2, autoAlpha: 1 }, { scale: 1.6, autoAlpha: 0, duration: 0.6, ease: 'power2.out' })
      if (el && !quick) {
        gsap
          .timeline()
          .to(el, { y: -70, duration: 0.25, ease: 'power2.out' })
          .call(() => sfx.boing())
          .to(el, { y: 0, duration: 0.3, ease: 'bounce.out' })
      }
    }
  }, [at, live]) // eslint-disable-line react-hooks/exhaustive-deps

  // type the line out, blipping as it goes, and breathing at the punctuation
  useEffect(() => {
    if (!live || full) return
    const ch = text[shown - 1] ?? ''
    const pause = '.!?…'.includes(ch) && text[shown] === ' ' ? 260 : ch === ',' || ch === '—' ? 110 : 0
    const slow = line.who === 'unknown' ? 1.7 : line.who === 'narrator' ? 0.8 : 1
    const id = window.setTimeout(
      () => {
        const next = reducedMotion() ? text.length : shown + 1
        setShown(next)
        if (line.who !== 'narrator' && next % 2 === 0 && text[next - 1] !== ' ')
          sfx.blip(PITCH[line.who] * (line.via === 'phone' ? 1.08 : 1) * (0.95 + Math.random() * 0.1))
      },
      (1000 / CPS) * slow + pause,
    )
    return () => clearTimeout(id)
  }, [live, full, shown, line, text])

  // the speaker's move as the line starts (in person only: not on the phone, not a memory)
  useEffect(() => {
    if (!live || reducedMotion() || line.who === 'unknown' || line.who === 'narrator' || line.via) return
    const el = sprites.current[line.who]
    const move = moveFor(line)
    if (!el || !move) return
    gsap.killTweensOf(el, 'x,rotation,rotationY,scaleX,scaleY')
    const tl = gsap.timeline()
    if (move === 'spin') {
      // round on the spot, with a little lift so it doesn't scrape the floor
      tl.fromTo(el, { rotationY: 0 }, { rotationY: Math.random() < 0.5 ? 360 : -360, duration: 0.85, ease: 'power2.inOut' }, 0)
      tl.to(el, { y: -26, duration: 0.42, ease: 'power2.out' }, 0)
      tl.to(el, { y: 0, duration: 0.43, ease: 'power2.in' }, 0.42)
      tl.set(el, { rotationY: 0 })
      tl.call(() => sfx.whoosh(0.4, true, 0.08), [], 0)
    } else if (move === 'shake') {
      tl.fromTo(el, { x: -10 }, { x: 10, duration: 0.05, repeat: 7, yoyo: true, ease: 'none' })
      tl.to(el, { x: 0, duration: 0.1 })
    } else if (move === 'hop') {
      tl.to(el, { y: -34, duration: 0.16, ease: 'power2.out' })
      tl.to(el, { y: 0, duration: 0.3, ease: 'bounce.out' })
    } else if (move === 'sway') {
      tl.to(el, { rotation: -5, transformOrigin: '50% 100%', duration: 0.35, ease: 'sine.inOut' })
      tl.to(el, { rotation: 4, duration: 0.5, ease: 'sine.inOut' })
      tl.to(el, { rotation: 0, duration: 0.35, ease: 'sine.inOut' })
    } else if (move === 'nod') {
      tl.to(el, { scaleY: 0.96, scaleX: 1.02, transformOrigin: '50% 100%', duration: 0.12, repeat: 1, yoyo: true, ease: 'power1.inOut' })
    }
    return () => void tl.progress(1).kill()
  }, [at, live]) // eslint-disable-line react-hooks/exhaustive-deps

  // whoever is talking (in person) bounces while the words come out
  useEffect(() => {
    if (line.who === 'unknown' || line.who === 'narrator' || line.via) return
    const el = sprites.current[line.who]?.firstElementChild
    if (!el || !live || full || reducedMotion()) return
    const tw = gsap.to(el, { y: -14, duration: 0.14, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    return () => {
      tw.kill()
      gsap.to(el, { y: 0, duration: 0.25, ease: 'back.out(2)' })
    }
  }, [line, live, full])

  const next = () => {
    if (card) {
      sfx.rustle()
      return setCard(false)
    }
    if (!live) return
    if (!full) return setShown(text.length)
    sfx.click(1.1)
    if (at + 1 >= lines.length) {
      if (!exit || reducedMotion()) return doneRef.current()
      // off they go, side by side, hopping along to the right
      if (leaving.current) return
      leaving.current = true
      const tl = gsap.timeline({ onComplete: () => doneRef.current() })
      tl.to(box.current, { y: 40, autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, 0)
      cast.forEach(([id], i) => {
        const el = sprites.current[id]
        if (!el) return
        const t0 = 0.2 + i * 0.15
        tl.to(el, { x: window.innerWidth * 1.1, duration: 2.6, ease: 'power1.in' }, t0)
        for (let k = 0; k < 8; k++) {
          tl.to(el, { y: -14, rotation: k % 2 ? 3 : -3, duration: 0.15, ease: 'power2.out' }, t0 + k * 0.31)
          tl.to(el, { y: 0, duration: 0.15, ease: 'power2.in' }, t0 + 0.15 + k * 0.31)
          if (i === 0) tl.call(() => sfx.tick(0.75 + (k % 2) * 0.1, 0.6), [], t0 + 0.3 + k * 0.31)
        }
      })
      return
    }
    setAt(at + 1)
    setShown(0)
  }
  const nextRef = useRef(next)
  nextRef.current = next

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      e.stopPropagation()
      nextRef.current()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const who = info(line.who)
  const last = at + 1 >= lines.length
  const via = line.via && VIA[line.via]
  const narr = line.who === 'narrator'
  let label: ReactNode = null
  if (!narr)
    label = (
      <span className="qd-name">
        {via && <Icon name={via.icon} color="#fff" size={15} />}
        {who.name}
        {(line.tag || via) && <small>{line.tag ?? via!.label}</small>}
      </span>
    )
  return (
    <div
      ref={root}
      className={[
        'qs qd',
        dark && 'is-dark',
        past && 'is-past',
        bg && 'has-bg',
        line.who === 'unknown' && 'is-unknown',
        narr && 'is-narration',
        line.fx === 'glow' && live && 'is-glow',
      ]
        .filter(Boolean)
        .join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label={past ? `Flashback: ${past}` : 'Conversation'}
      lang="en"
      onClick={next}
    >
      {bg && <SceneBg kind={bg} />}
      {snowing && (
        <div className="qd-snow" aria-hidden="true">
          {Array.from({ length: 40 }, (_, i) => (
            <i key={i} style={{ '--x': `${(i * 37) % 100}%`, '--d': `${(i * 0.41) % 8}s`, '--s': `${0.5 + ((i * 7) % 10) / 12}` } as CSSProperties}>
              <Icon name="snow" color="#fff" size={16} />
            </i>
          ))}
        </div>
      )}
      {(past || when) && !card && <span className="qd-when">{past ?? when}</span>}
      <div className="qd-cast" aria-hidden="true">
        {cast.map(([id]) => (
          <div
            key={id}
            className={`qd-char is-${SIDE[id]}${id === line.who && !line.via && live ? ' is-talking' : ''}`}
            ref={(el) => void (sprites.current[id] = el)}
            style={{ visibility: 'hidden' }}
            title={FULL[id]}
          >
            <div className="qd-fig">
              <img src={info(id).src} alt="" draggable={false} />
              {id === 'shima' && hatOn && <SantaHat />}
              {id === 'mitsumi' && mitsuHat && <SantaHat className="is-mitsumi" />}
              {id === 'mitsumi' && <span className="qd-puff is-mitsumi" ref={puffM} />}
              {id === 'shima' && shocked && <span className="qd-puff" ref={puff} />}
              {id === 'shima' && startled && <span className="qd-bang">!</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="qd-box" ref={box} style={{ '--c': who.color, visibility: 'hidden' } as CSSProperties}>
        {label}
        {/* the whole line is there for screen readers straight away; the typing is just for show */}
        <p className="qd-text" aria-live="polite">
          <span aria-hidden="true">
            <Typed segs={segs} shown={shown} />
          </span>
          <span className="qd-sr">{text}</span>
        </p>
        <span className={`qd-more${full && live ? ' is-on' : ''}`} aria-hidden="true">
          <Icon name={last ? 'check' : 'chev'} color={narr ? '#8a7559' : who.color} size={20} style={last ? undefined : { rotate: '90deg' }} />
        </span>
        <span className="qd-sr">Press Enter to continue</span>
      </div>
      <div className="qd-flash" ref={flash} aria-hidden="true" />
      {card && chapter && <ChapterCard ch={chapter} onGo={next} />}
    </div>
  )
}

/** a puff of snowflakes across the scene */
function burst(host: HTMLElement) {
  const r = host.getBoundingClientRect()
  for (let k = 0; k < 26; k++) {
    const p = document.createElement('i')
    p.className = 'qm-flake'
    p.style.zIndex = '8500'
    document.body.appendChild(p)
    gsap.set(p, { left: r.width / 2, top: r.height * 0.55, scale: gsap.utils.random(0.6, 1.8) })
    gsap.to(p, {
      x: gsap.utils.random(-r.width * 0.45, r.width * 0.45),
      y: gsap.utils.random(-r.height * 0.5, r.height * 0.1),
      opacity: 0,
      duration: gsap.utils.random(0.9, 1.6),
      ease: 'power2.out',
      onComplete: () => p.remove(),
    })
  }
}
