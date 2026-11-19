import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { C } from '../data'
import { Icon } from '../icons'
import { sfx } from '../sfx'
import { longDate, shortDate, UPDATES } from '../changelog'

/**
 * Two little cards that greet people. The fan-site notice shows once, on someone's first visit.
 * The "what's new" card shows once per update to people who've been here before, and anyone
 * can open it again from the button by the sound toggle to flip back through older updates.
 */

const NOTICE_KEY = 'sl-fan-notice'
const SEEN_KEY = 'sl-news-seen'

const read = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* private mode: they'll just see it again next time */
  }
}
/**
 * Has this browser been here before? Checked as the page loads, before anything new is saved:
 * any of the site's own saved bits (letters, secrets, the game, subtitles…) means yes.
 */
const RETURNING = (() => {
  try {
    return Object.keys(localStorage).some((k) => k.startsWith('sl-') && k !== NOTICE_KEY && k !== SEEN_KEY && k !== 'sl-sound')
  } catch {
    return false
  }
})()

/** the gang peeking up from the bottom of a card's header, like the Message guide */
const src = (id: string) => `/characters/${id}.webp`
const NOTICE_CAST = [
  { id: 'makoto', right: 112, w: 74, top: 34 },
  { id: 'yuzuki', right: -8, w: 86, top: 24 },
  { id: 'mitsumi', right: 36, w: 100, top: 20 },
]
const NEWS_CAST = [
  { id: 'ujie', right: 118, w: 70, top: 30 },
  { id: 'mika', right: -20, w: 74, top: 32 },
  { id: 'shima', right: 70, w: 88, top: 12 },
  { id: 'yasaka', right: 8, w: 84, top: 26 },
]

function Card({
  label,
  color,
  title,
  cast,
  onClose,
  swap,
  children,
}: {
  swap?: boolean
  label: string
  color: string
  title: string
  cast: typeof NOTICE_CAST
  onClose: () => void
  children: ReactNode
}) {
  const close = useRef<HTMLButtonElement>(null)
  const closeFn = useRef(onClose)
  closeFn.current = onClose
  // focus the × when the card opens, Escape closes it, and focus goes back where it was after
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    close.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeFn.current()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      before?.focus?.({ preventScroll: true })
    }
  }, [])
  return (
    // swap: this card replaces another one, so the blurred backdrop is already up
    <div className={`nt${swap ? ' is-swap' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
      <div className="nt-backdrop" onClick={onClose} />
      <button className="round-btn nt-x" ref={close} onClick={onClose} aria-label="Close">
        <Icon name="close" color={C.ink} size={22} />
      </button>
      <div className="nt-card">
        <header className="nt-hero" style={{ '--hc': color } as CSSProperties}>
          {cast.map((c) => (
            <span
              key={c.id}
              className={`nt-hero-char${c.id === cast[cast.length - 1].id ? ' is-lead' : ''}`}
              style={{ backgroundImage: `url(${src(c.id)})`, right: c.right, width: c.w, top: c.top }}
            />
          ))}
          <i className="nt-tape" />
          <h2>{title}</h2>
        </header>
        {children}
      </div>
    </div>
  )
}

function Notice({ onClose, swap, again }: { onClose: () => void; swap?: boolean; again?: boolean }) {
  return (
    <Card label="About this site" color={C.pink} title="Hi!" cast={NOTICE_CAST} onClose={onClose} swap={swap}>
      <div className="nt-body nt-notice">
        <p>This is a fan site! I made it because I really like Skip and Loafer.</p>
        <p>
          It’s not official, and it’s not connected to <b>Takamatsu‑sensei</b>, <b>Kodansha</b>, or anyone who works on
          the manga or anime.
        </p>
        <p>
          All the characters, art and music belong to Takamatsu‑sensei, the anime production team and the musicians. If you like the series, please support it by buying the
          volumes or watching the anime on an official site.
        </p>
        <p>Have fun looking around :)</p>
      </div>
      <footer className="nt-foot">
        {/* opened again from "about this site": no need to promise it won't show */}
        <span className="nt-fine">{again ? '' : 'You’ll only see this once.'}</span>
        <button className="nt-btn" onClick={onClose} style={{ '--c': C.pink } as CSSProperties}>
          Okay
        </button>
      </footer>
    </Card>
  )
}

function News({
  start,
  unseen,
  onClose,
  onAbout,
  swap,
}: {
  start: number
  unseen: number
  onClose: () => void
  onAbout: () => void
  swap?: boolean
}) {
  const [at, setAt] = useState(start)
  const [dir, setDir] = useState(0)
  const strip = useRef<HTMLDivElement>(null)
  const u = UPDATES[at]
  const go = (n: number) => {
    if (n < 0 || n >= UPDATES.length || n === at) return
    setDir(n > at ? 1 : -1)
    setAt(n)
    sfx.rustle()
  }
  // keep the picked thumbnail in view in the history strip
  useEffect(() => {
    const el = strip.current?.children[at] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [at])

  return (
    <Card label="What's new" color={C.blue} title="What’s new" cast={NEWS_CAST} onClose={onClose} swap={swap}>
      <article key={u.id} className={`nt-body nt-entry${dir > 0 ? ' from-right' : dir < 0 ? ' from-left' : ''}`}>
        <div className="nt-head">
          <span className="nt-thumb is-big" style={{ '--c': u.color } as CSSProperties}>
            <Icon name={u.icon} color={u.color} size={30} />
          </span>
          <div>
            <h3>
              {u.title}
              {at < unseen && <b className="nt-new">new</b>}
            </h3>
            <time dateTime={u.at}>{longDate(u.at)}</time>
          </div>
        </div>
        {u.shot && (
          // a snapshot, taped onto the card like a photo
          <figure className="nt-shot" style={{ '--c': u.color } as CSSProperties}>
            <img src={u.shot.src} alt={u.shot.alt} loading="lazy" decoding="async" />
            <i className="nt-shot-tape" />
          </figure>
        )}
        <p className="nt-intro">{u.intro}</p>
        <ul className="nt-items">
          {u.items.map((t, i) => (
            <li key={i} style={{ '--c': u.color } as CSSProperties}>
              {t}
            </li>
          ))}
        </ul>
        {u.parts?.map((p) => (
          // a bigger update, one part per thing: its title, a looping clip, how to get there, and a list
          <section key={p.title} className="nt-part" style={{ '--c': p.color } as CSSProperties}>
            <h4>
              <span className="nt-thumb">
                <Icon name={p.icon} color={p.color} size={18} />
              </span>
              {p.title}
            </h4>
            {p.clip && (
              <figure className="nt-shot">
                <img src={p.clip.src} alt={p.clip.alt} loading="lazy" decoding="async" />
                <i className="nt-shot-tape" />
              </figure>
            )}
            {p.how && (
              <p className="nt-how">
                <b>How to find it</b>
                {p.how}
              </p>
            )}
            <ul className="nt-items">
              {p.items.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>
        ))}
      </article>

      <nav className="nt-history" aria-label="Earlier updates">
        <button className="nt-arrow is-prev" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Newer update">
          <Icon name="chev" color={C.blue} size={18} />
        </button>
        <div className="nt-strip" ref={strip}>
          {UPDATES.map((x, i) => (
            <button
              key={x.id}
              className={`nt-pick${i === at ? ' is-on' : ''}`}
              onClick={() => go(i)}
              aria-label={`${x.title}, ${shortDate(x.at)}`}
              aria-current={i === at ? 'true' : undefined}
              title={x.title}
            >
              <span className="nt-thumb" style={{ '--c': x.color } as CSSProperties}>
                <Icon name={x.icon} color={x.color} size={20} />
                {i < unseen && <i className="nt-dot" />}
              </span>
              <span className="nt-when">{shortDate(x.at)}</span>
            </button>
          ))}
        </div>
        <button className="nt-arrow" onClick={() => go(at + 1)} disabled={at === UPDATES.length - 1} aria-label="Older update">
          <Icon name="chev" color={C.blue} size={18} />
        </button>
      </nav>

      <footer className="nt-foot">
        <button className="nt-link" onClick={onAbout}>
          about this site
        </button>
        <button className="nt-btn" onClick={onClose} style={{ '--c': C.blue } as CSSProperties}>
          Nice
        </button>
      </footer>
    </Card>
  )
}

/** Shows the right card once the intro has played, plus the button to bring "what's new" back. */
export function Notes({ ready }: { ready: boolean }) {
  const [open, setOpen] = useState<'notice' | 'news' | null>(null)
  /** how many updates at the top of the list this person hasn't seen yet */
  const [unseen, setUnseen] = useState(0)
  /** one card is taking over from another (notice → news, or back) */
  const [swap, setSwap] = useState(false)
  const decided = useRef(false)

  const unseenNow = () => {
    const seen = read(SEEN_KEY)
    const i = UPDATES.findIndex((u) => u.id === seen)
    // never saw the card at all: only the latest counts as new, the rest is just history
    return i < 0 ? 1 : i
  }
  const showNews = (from?: 'notice') => {
    setSwap(from === 'notice')
    setUnseen(unseenNow())
    // once is enough: it's marked as seen the moment it opens
    write(SEEN_KEY, UPDATES[0].id)
    setOpen('news')
    sfx.rustle()
  }

  useEffect(() => {
    if (!ready || decided.current) return
    decided.current = true
    const t = window.setTimeout(() => {
      if (!read(NOTICE_KEY)) {
        setSwap(false)
        setOpen('notice')
        sfx.rustle()
      } else if (unseenNow() > 0) showNews()
    }, 600)
    return () => window.clearTimeout(t)
  }, [ready])

  const closeNotice = () => {
    const first = !read(NOTICE_KEY)
    write(NOTICE_KEY, '1')
    // someone who'd been here before the notice existed still gets the news after it;
    // a brand new visitor doesn't need the history of a site they've never seen
    if (first && RETURNING && unseenNow() > 0) return showNews('notice')
    if (first) write(SEEN_KEY, UPDATES[0].id)
    setOpen(null)
  }

  return (
    <>
      {ready && (
        <button className="news-toggle" onClick={() => showNews()} aria-label="What's new" title="What’s new">
          <Icon name="bunting" color={C.blue} size={22} />
        </button>
      )}
      {open === 'notice' && <Notice onClose={closeNotice} swap={swap} again={swap} />}
      {open === 'news' && (
        <News
          start={0}
          unseen={unseen}
          swap={swap}
          onClose={() => setOpen(null)}
          onAbout={() => {
            setSwap(true)
            setOpen('notice')
          }}
        />
      )}
    </>
  )
}
