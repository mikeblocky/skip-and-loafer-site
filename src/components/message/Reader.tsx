import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { gsap } from '../../gsap'
import { C } from '../../data'
import { Icon } from '../../icons'
import { sfx } from '../../sfx'
import { safeColor } from '../../letterRules'
import { ANON, api, clientId, post, remember, store, type Letter } from './mail'
import { dateOf, paper, reduced, vars, type Geo } from './geometry'
import { Envelope, Folding, parts, Sheet, turn } from './Paper'

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

export function Reader({ g, total, onChange, onWrite }: { g: Geo; total: number | null; onChange: () => void; onWrite: () => void }) {
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
