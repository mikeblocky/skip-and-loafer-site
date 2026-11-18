import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { gsap } from '../../gsap'
import { C } from '../../data'
import { Icon } from '../../icons'
import { BadBox, bust, GoodBox, MiniBox, MiniMail } from './GuideScenes'

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
      <span className="gd-num">Step 1</span>
      Write a short letter to another fan.
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
      <span className="gd-num">Step 2</span>
      It’s sealed and dropped in one shared mailbox, with no name on it unless you sign it.
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
      <span className="gd-num">Step 3</span>
      Anyone who checks the mail might get yours, and you can open one too.
    </p>
</div>,
]
// the header's group shot: Mitsumi up front, friends behind her (right edge in px, width, drop from the top)
const CAST = [
  { id: 'makoto', right: 104, w: 74, top: 30 },
  { id: 'mika', right: -24, w: 74, top: 32 },
  { id: 'shima', right: 64, w: 88, top: 12 },
  { id: 'yuzuki', right: -6, w: 86, top: 22 },
  { id: 'mitsumi', right: 24, w: 100, top: 20 },
]

const SLIDES: { node: ReactNode; secs: number }[] = [
  ...STEPS.map((node) => ({ node, secs: 5 })),
  { node: <GoodBox />, secs: 6.8 },
  { node: <BadBox />, secs: 6.8 },
]

export function Guide() {
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
        {CAST.map((c) => (
          <span
            key={c.id}
            className={`gd-hero-char${c.id === 'mitsumi' ? ' is-lead' : ''}`}
            style={{ backgroundImage: `url(/characters/${c.id}.png)`, right: c.right, width: c.w, top: c.top }}
          />
        ))}
        <i className="gd-tape" />
        <h3>How it works</h3>
      </div>

      <div className="gd-slides" ref={area} aria-live="polite">
        <div className="gd-slide" key={at}>
          {SLIDES[at].node}
        </div>
      </div>

      <div className="gd-nav">
        <button className="gd-arrow is-prev" onClick={() => go(at - 1, -1)} aria-label="Previous">
          <Icon name="chev" color={C.pink} size={18} />
        </button>
        <div className="gd-dots">
          {SLIDES.map((sl, i) => (
            <button
              key={i}
              className={`gd-dot${i === at ? ' is-on' : i < at ? ' is-done' : ''}`}
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
          <Icon name="chev" color={C.pink} size={18} />
        </button>
      </div>

      <p className="msg-fine">Letters with links or contact details can’t be sent, and letters readers report are taken down.</p>
    </aside>
  )
}
