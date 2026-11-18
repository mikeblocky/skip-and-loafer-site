import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { gsap } from './gsap'
import { C, CHARACTERS, RAINBOW } from './data'
import { Stage, type StageHandle, type Mode } from './components/Stage'
import { Countdown } from './components/Countdown'
import { Volumes } from './components/Volumes'
import { Birthdays } from './components/Birthdays'
import { Anime } from './components/Anime'
import { Message } from './components/Message'
import { Bookmarks, type NavId } from './components/Bookmarks'
import { Viewer } from './components/Viewer'
import { preloadCovers } from './coverColors'
import { FlexText } from './components/FlexText'
import { Icon } from './icons'
import { Timer } from './components/Timer'
import { Secrets } from './components/secrets/Secrets'
import { sfx } from './sfx'

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = rej
    i.src = src
  })
}

const qa = <T extends Element = HTMLElement>(s: string) => Array.from(document.querySelectorAll<T>(s))

export default function App() {
  const [aspects, setAspects] = useState<Record<string, number> | null>(null)
  const [view, setView] = useState<Mode>('countdown')
  const [ready, setReady] = useState(false)
  const [book, setBook] = useState<number | null>(null)
  const stage = useRef<StageHandle>(null)
  const intro = useRef<gsap.core.Timeline | null>(null)
  const busy = useRef(false)
  // null = still deciding, false = waiting on the sound gate, true = go
  const [started, setStarted] = useState<boolean | null>(null)
  const [soundOn, setSoundOn] = useState(sfx.on)
  useEffect(() => sfx.subscribe(setSoundOn), [])

  useEffect(() => {
    Promise.all([
      Promise.all(CHARACTERS.map((c) => loadImg(c.src))),
      document.fonts.load("900 60px Allo"),
      document.fonts.load("900 40px 'M PLUS Rounded 1c'", 'スキップとローファー'),
    ]).then(([imgs]) => {
      const a: Record<string, number> = {}
      imgs.forEach((img, i) => (a[CHARACTERS[i].id] = img.naturalWidth / img.naturalHeight))
      setAspects(a)
      // the browser will only play sound after a click; ask once if it is blocking us
      setStarted(!sfx.on || sfx.canAutoplay())
      preloadCovers()
    })
  }, [])

  const runIntro = useCallback(() => {
    const s = stage.current
    if (!s) return
    busy.current = true
    setReady(false)
    intro.current?.kill()
    s.prepare()

    const ui = qa('.view [data-intro="ui"]')
    const chrome = qa('.bookmarks, .wordmark, .timer')

    gsap.set(ui, { autoAlpha: 0, y: 60, scale: 0.85 })
    gsap.set(chrome, { y: -170 })
    gsap.set('.sound-toggle', { scale: 0, rotation: -90 })
    gsap.set('.content', { autoAlpha: 1 })

    const tl = gsap.timeline({
      onComplete: () => {
        busy.current = false
        intro.current = null
        s.enable()
        setReady(true)
      },
    })
    // swell() leads into jingle(): its pickup notes land exactly at 2.8s.
    tl.call(() => sfx.swell(2.75), [], 0.05)
    tl.add(s.intro(), 0)
    tl.call(() => sfx.jingle(), [], 2.8)
    tl.to(ui, { autoAlpha: 1, y: 0, scale: 1, duration: 0.85, ease: 'back.out(1.4)', stagger: 0.08 }, 2.75)
    tl.to(chrome, { y: 0, duration: 1.1, ease: 'elastic.out(1, 0.75)', stagger: 0.08 }, 3.0)
    tl.to('.sound-toggle', { scale: 1, rotation: 0, duration: 0.8, ease: 'back.out(1.4)' }, 3.2)
    intro.current = tl

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) tl.progress(1)
  }, [])

  // fast-forward the intro on any click or key
  useEffect(() => {
    const ff = (e: Event) => {
      if (!intro.current) return
      if (e.target instanceof Element && e.target.closest('.bookmarks')) return
      intro.current.timeScale(4)
    }
    window.addEventListener('pointerdown', ff)
    window.addEventListener('keydown', ff)
    return () => {
      window.removeEventListener('pointerdown', ff)
      window.removeEventListener('keydown', ff)
    }
  }, [])

  // every button and clickable thing blips on hover and clicks on press
  useEffect(() => {
    const SEL = 'button, a[href], [role="button"], .bd-pin'
    let lastHover: Element | null = null
    const over = (e: PointerEvent) => {
      const el = (e.target as Element).closest?.(SEL) ?? null
      if (el && el !== lastHover && e.pointerType === 'mouse') sfx.blip(0.9 + Math.random() * 0.3)
      lastHover = el
    }
    const press = (e: MouseEvent) => {
      if ((e.target as Element).closest?.(SEL)) sfx.click(0.95 + Math.random() * 0.15)
    }
    let acc = 0
    const wheel = (e: WheelEvent) => {
      acc += Math.abs(e.deltaY) + Math.abs(e.deltaX)
      if (acc < 60) return
      acc = 0
      sfx.tick(e.deltaY > 0 ? 0.85 : 1.15, 0.8)
    }
    let lastY = window.scrollY
    const scroll = () => {
      if (Math.abs(window.scrollY - lastY) < 70) return
      sfx.tick(window.scrollY > lastY ? 0.85 : 1.15, 0.8)
      lastY = window.scrollY
    }
    document.addEventListener('pointerover', over)
    document.addEventListener('click', press)
    window.addEventListener('wheel', wheel, { passive: true })
    window.addEventListener('scroll', scroll, { passive: true })
    return () => {
      document.removeEventListener('pointerover', over)
      document.removeEventListener('click', press)
      window.removeEventListener('wheel', wheel)
      window.removeEventListener('scroll', scroll)
    }
  }, [])

  const begin = async (withSound: boolean) => {
    sfx.setOn(withSound)
    if (withSound) await sfx.unlock()
    setStarted(true)
  }

  const toggleSound = async () => {
    const next = !soundOn
    sfx.setOn(next)
    if (next) {
      await sfx.unlock()
      sfx.chime(1.5, 0.7)
    }
  }

  useLayoutEffect(() => {
    if (aspects && started) runIntro()
  }, [aspects, started, runIntro])

  const wipe = (swap: () => void) => {
    busy.current = true
    const bars = qa('.wipe i')
    const tl = gsap.timeline({ onComplete: () => (busy.current = false) })
    tl.set('.wipe', { autoAlpha: 1 })
    // Short version of the opening build-up, cresting as the bars fully cover the page.
    const cover = 0.42 + 0.045 * (bars.length - 1)
    tl.call(() => sfx.transition(cover), [], 0)
    tl.call(() => sfx.whoosh(0.6, true, 0.08), [], cover)
    tl.fromTo(bars, { scaleY: 0, transformOrigin: '50% 0%' }, { scaleY: 1, duration: 0.42, ease: 'power3.in', stagger: 0.045 })
    tl.call(swap)
    tl.to(bars, { scaleY: 0, transformOrigin: '50% 100%', duration: 0.55, ease: 'power3.out', stagger: 0.045 })
    tl.set('.wipe', { autoAlpha: 0 })
    return tl
  }

  const onNav = (id: NavId) => {
    if (busy.current) {
      if (intro.current) intro.current.timeScale(4)
      return
    }
    if (id === 'replay') {
      setBook(null)
      if (view !== 'countdown') {
        wipe(() => {
          flushSync(() => setView('countdown'))
          stage.current?.setMode('countdown')
          window.scrollTo(0, 0)
        }).call(() => runIntro())
      } else {
        runIntro()
      }
      return
    }
    if (id === view) return
    wipe(() => {
      flushSync(() => setView(id))
      window.scrollTo(0, 0)
      stage.current?.setMode(id)
      const els = qa('.view [data-intro="ui"]')
      gsap.fromTo(
        els,
        { autoAlpha: 0, y: 70, scale: 0.85 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, ease: 'back.out(1.4)', stagger: 0.07, delay: 0.25 },
      )
    })
  }

  return (
    <>
      <div className="paper" />
      {!aspects && (
        <div className="loader" aria-label="Loading">
          {RAINBOW.slice(0, 4).map((c, i) => (
            <i key={i} style={{ background: c, animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      )}
{aspects && <Stage ref={stage} aspects={aspects} />}
      {aspects && started === false && (
        <div className="gate">
          <button className="gate-go" onClick={() => begin(true)} aria-label="Start with sound">
            <Icon name="sound" color="#fff" size={46} />
          </button>
          <button className="gate-quiet" onClick={() => begin(false)}>
            no sound
          </button>
        </div>
      )}
      <button
        className="sound-toggle"
        onClick={toggleSound}
        aria-label={soundOn ? 'Mute sounds' : 'Turn sounds on'}
        aria-pressed={soundOn}
      >
        <Icon name={soundOn ? 'sound' : 'mute'} color="#1D1B2C" size={24} />
      </button>

      <FlexText
        as="div"
        className="wordmark"
        words={[
          { t: 'Skip', w: 900, c: C.pink },
          { t: 'and', w: 300, oblique: true, c: C.orange },
          { t: 'Loafer', w: 900, c: C.blue },
        ]}
      />
      <Bookmarks view={view} onSelect={onNav} />
      <Timer onOpen={() => onNav('countdown')} hidden={view === 'countdown'} />

      <main className={`content${ready ? ' is-ready' : ''}`}>
        {view === 'countdown' && <Countdown />}
        {view === 'volumes' && <Volumes hidden={book} onOpen={(i) => setBook(i)} />}
        {view === 'birthdays' && <Birthdays />}
        {view === 'anime' && <Anime />}
        {view === 'message' && <Message />}
      </main>

      {book !== null && view === 'volumes' && (
        <Viewer key="viewer" index={book} onIndex={setBook} onClose={() => setBook(null)} />
      )}

      {ready && <Secrets />}

      <div className="wipe" aria-hidden="true">
        {['#F53D84', '#FBBA14', '#246BE8', '#12B266', '#7A45E0', '#F86E1A'].map((c) => (
          <i key={c} style={{ background: c }} />
        ))}
      </div>
    </>
  )
}
