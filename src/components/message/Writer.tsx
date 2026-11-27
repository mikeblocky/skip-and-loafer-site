import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import { gsap } from '../../gsap'
import { C } from '../../data'
import { Icon } from '../../icons'
import { sfx } from '../../sfx'
import { cleanSigner, cleanText, LETTER_MAX, LETTER_MIN, NAME_MAX, problem, safeColor, STATIONERY } from '../../letterRules'
import { clientId, post, remember, store } from './mail'
import { questLetter } from '../../quest'
import { dateOf, PAPER, paper, reduced, vars, type Geo } from './geometry'
import { Envelope, Folding, parts, Sheet, turn } from './Paper'
import { centre, confetti } from './confetti'
import { serverText, useT } from '../../i18n'

type WritePhase = 'compose' | 'sending' | 'sent'

export function Writer({ g, onSent, onOpen, stats }: { g: Geo; onSent: () => void; onOpen: () => void; stats: { opens: number; sent: number } }) {
  const [text, setText] = useState(() => store.read<string>('sl-msg-draft', ''))
  const [from, setFrom] = useState(() => store.read<string>('sl-msg-from', ''))
  const [color, setColor] = useState<string>(() => safeColor(store.read<string>('sl-msg-color', STATIONERY[0])))
  const [phase, setPhase] = useState<WritePhase>('compose')
  const [err, setErr] = useState<string | null>(null)
  const [round, setRound] = useState(0)
  const [sentAt, setSentAt] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const { t: tr } = useT()

  useEffect(() => store.write('sl-msg-draft', text), [text])
  useEffect(() => store.write('sl-msg-from', from), [from])
  useEffect(() => store.write('sl-msg-color', color), [color])
  useEffect(() => () => void tl.current?.kill(), [])

  const body = cleanText(text)
  const signer = cleanSigner(from)
  const len = Array.from(body).length
  const [fits, setFits] = useState(true)
  const why = problem(body, signer) ?? (fits ? null : 'full')
  // don't nag before there's something to judge
  const said = err ?? (len >= LETTER_MIN || len > LETTER_MAX ? why : null)
  const shown = said && (said === 'full' ? tr('msg.full') : serverText(said, tr))

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
    // a little puff of paper as the wax goes on (not when a refusal rewinds past it)
    t.call(() => {
      if (t.reversed()) return
      const p = centre(seal)
      confetti(p.x, p.y, { n: 14, spread: 170, reach: 80, colors: [color, C.yellow, C.pink, C.blue] })
    }, [], 4.27)
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
    // it leaves a trail of sparkles behind it
    for (let i = 0; i < 12; i++) {
      t.call(() => {
        const p = centre(seal)
        confetti(p.x, p.y, { n: 3, spread: 360, reach: 16, size: 5, fall: 26, duration: 0.8, shape: 'dot', colors: [color, C.yellow] })
      }, [], `sealed+=${(0.34 + i * 0.07).toFixed(2)}`)
    }
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
        questLetter('message')
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
        <Envelope label={tr('msg.envTo')} icon={paper(color).icon} />
        <div className="lt-holder">
          {phase === 'compose' ? (
            <div className="lt lt-flat">
              <Sheet icon={paper(color).icon} fit={text} onFit={setFits}>
                <textarea
                  className="lt-text"
                  value={text}
                  maxLength={LETTER_MAX + 40}
                  placeholder={tr('msg.placeholder')}
                  onChange={(e) => {
                    setText(e.target.value)
                    setErr(null)
                  }}
                  aria-label={tr('msg.yourLetter')}
                />
                <div className="lt-sign">
                  —{' '}
                  <input
                    value={from}
                    maxLength={NAME_MAX}
                    placeholder={tr('msg.anon')}
                    onChange={(e) => setFrom(e.target.value)}
                    aria-label={tr('msg.signAs')}
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
        <div className="wr-papers" role="radiogroup" aria-label={tr('msg.paper')}>
          {STATIONERY.map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={c === color}
              aria-label={tr('msg.paperOf', { name: tr(PAPER[c].name) })}
              title={tr(PAPER[c].name)}
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
            {shown ?? tr('msg.signHint')}
          </p>
          <span className={`wr-count${len > LETTER_MAX ? ' is-over' : ''}`}>
            {len}/{LETTER_MAX}
          </span>
        </div>

        <button className="msg-btn wr-send" onClick={send} disabled={!!why || phase !== 'compose'}>
          <Icon name="plane" color="#fff" size={22} />
          {tr('msg.send')}
        </button>
        {stats.sent > 0 && (
          <p className="wr-stats">
            {tr(stats.opens === 0 ? 'msg.stats0' : stats.opens === 1 ? 'msg.stats1' : 'msg.statsN', { n: stats.sent, k: stats.opens })}
          </p>
        )}
      </div>
    </div>
  )
}

function Sent({ at, onAgain, onOpen }: { at: number; onAgain: () => void; onOpen: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const { t: tr } = useT()
  useLayoutEffect(() => {
    const q = gsap.utils.selector(ref)
    const t = gsap.timeline()
    t.from(q('.pm'), { scale: 2.4, autoAlpha: 0, rotation: -40, duration: 0.32, ease: 'power3.in' })
    t.call(() => {
      sfx.stamp()
      const p = centre(q('.pm')[0])
      confetti(p.x, p.y, { n: 22, spread: 200, reach: 130, size: 8 })
    })
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
      <h3>{tr('msg.sentTitle')}</h3>
      <p>{tr('msg.sentText')}</p>
      <div className="sent-btns">
        <button className="msg-btn" onClick={onAgain}>
          <Icon name="pencil" color="#fff" size={22} />
          {tr('msg.another')}
        </button>
        <button className="msg-btn is-ghost" onClick={onOpen}>
          <Icon name="envelope" color={C.red} size={22} />
          {tr('msg.openOne')}
        </button>
      </div>
    </div>
  )
}
