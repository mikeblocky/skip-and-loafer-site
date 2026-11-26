import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { C, NEXT_CHAPTER_NUMBER, releaseWindow } from '../data'
import { FlexText, type Word } from './FlexText'
import { sfx } from '../sfx'
import { formatTime, settings, useSettings } from '../settings'
import { useT, type Lang } from '../i18n'
import { questHint } from '../quest'

function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    let id = 0
    const tick = () => {
      setNow(Date.now())
      id = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
    }
    tick()
    return () => clearTimeout(id)
  }, [])
  return now
}

// fridge-magnet numbers: every digit always wears the same colour. Consecutive digits sit
// three steps apart on the wheel so a ticking block never flips to a near-identical hue.
const WHEEL = [C.pink, C.orange, C.amber, C.green, C.teal, C.sky, C.blue, C.indigo, C.violet, C.magenta]
const digitColor = (d: string) => WHEEL[(Number(d) * 3) % WHEEL.length] ?? C.ink

/** One digit on a coloured block. Every change flips a fresh block down over the old one. */
export function Block({ d, quiet = false }: { d: string; quiet?: boolean }) {
  const [s, set] = useState(() => ({ d, k: 0, c: digitColor(d), prev: null as null | { d: string; c: string } }))
  useLayoutEffect(() => {
    set((p) => (p.d === d ? p : { d, k: p.k + 1, c: digitColor(d), prev: { d: p.d, c: p.c } }))
  }, [d])
  // the clack lands with the flip, slightly different every time
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (quiet || !settings.get().clacks) return
    const id = window.setTimeout(() => {
      // not over the intro: the page is only ready once it has played (and again after Replay)
      if (document.querySelector('.content.is-ready')) sfx.clack(0.85 + Math.random() * 0.35)
    }, 230)
    return () => clearTimeout(id)
  }, [d])
  const face = (digit: string, color: string, cls: string, key: string) => (
    <span key={key} className={`block ${cls}`} style={{ background: color, color: '#fff' }}>
      {digit}
    </span>
  )
  return (
    <span className="block-slot">
      {s.prev && face(s.prev.d, s.prev.c, 'block-under', `u${s.k}`)}
      {face(s.d, s.c, s.k ? 'block-flip' : '', `b${s.k}`)}
    </span>
  )
}

// each unit floats at its own depth: offset, tilt, size, parallax strength, bob timing
const LAYOUT = [
  { dy: -34, r: -6, s: 1.04, depth: 1.25, bob: 3.4, c: C.pink },
  { dy: 26, r: 4, s: 0.86, depth: 0.6, bob: 4.1, c: C.blue },
  { dy: -10, r: -3, s: 1.12, depth: 1.5, bob: 3.0, c: C.orange },
  { dy: 40, r: 7, s: 0.92, depth: 0.85, bob: 3.7, c: C.green },
]

function Unit({ value, label, i }: { value: number; label: string; i: number }) {
  const L = LAYOUT[i]
  const str = String(value).padStart(2, '0')
  return (
    <div className="unit" data-intro="ui">
      <div
        className="unit-par"
        style={{ '--dy': `${L.dy}px`, '--r': `${L.r}deg`, '--s': L.s, '--depth': L.depth } as CSSProperties}
      >
        <div className="unit-float" style={{ animationDuration: `${L.bob}s`, animationDelay: `${-i * 0.9}s` }}>
          <div className="unit-blocks">
            {str.split('').map((ch, k) => (
              <Block key={k} d={ch} />
            ))}
          </div>
          <div className="unit-label" style={{ color: L.c }}>
            {label}
          </div>
        </div>
      </div>
    </div>
  )
}

/** the headline's words take these looks in turn; the chapter number is always big and orange */
const LOOKS: Omit<Word, 't'>[] = [
  { w: 900, c: C.pink },
  { w: 320, oblique: true, c: C.teal },
  { w: 640, c: C.blue },
  { w: 420, oblique: true, c: C.red },
  { w: 760, c: C.green },
  { w: 900, c: C.violet },
]
/** scripts where a fake slant looks wrong: keep their words upright */
const UPRIGHT = new Set<Lang>(['ja', 'ko', 'zh-Hans', 'zh-Hant', 'th'])

/** "Next|chapter|{n}|…" from the language file → styled words (English comes out as it always was) */
function headline(src: string, lang: Lang): Word[] {
  let k = 0
  return src.split('|').map((part) => {
    if (part.includes('{n}')) return { t: part.replace('{n}', String(NEXT_CHAPTER_NUMBER)), w: 900, c: C.orange }
    const look = LOOKS[k++ % LOOKS.length]
    return { t: part, ...look, oblique: look.oblique && !UPRIGHT.has(lang) }
  })
}

export function Countdown() {
  const now = useNow()
  // 12/24h and which time zones to show come from settings
  const { zone } = useSettings()
  const { t, lang } = useT()
  const head = headline(t(NEXT_CHAPTER_NUMBER !== null ? 'cd.title' : 'cd.titleNoNum'), lang)
  const clock = useRef<HTMLDivElement>(null)
  const { next } = releaseWindow(now)
  const diff = Math.max(0, next - now)
  const days = Math.floor(diff / 864e5)
  const hours = Math.floor((diff % 864e5) / 36e5)
  const mins = Math.floor((diff % 36e5) / 6e4)
  const secs = Math.floor((diff % 6e4) / 1e3)

  // pointer parallax: nearer units drift further
  useEffect(() => {
    const el = clock.current
    if (!el) return
    const onMove = (e: PointerEvent) => {
      el.style.setProperty('--px', (e.clientX / window.innerWidth - 0.5).toFixed(3))
      el.style.setProperty('--py', (e.clientY / window.innerHeight - 0.5).toFixed(3))
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <section className="view view-countdown">
      <FlexText key={lang} className="cd-title" words={head} data-intro="ui" data-safe="" />

      {/* Secret Santa: one of ???'s riddles says to knock on the clock at the right second */}
      <div className="clock" ref={clock} data-safe="" onClick={() => questHint({ kind: 'clock', secs })}>
        <Unit i={0} value={days} label={t('cd.days')} />
        <Unit i={1} value={hours} label={t('cd.hours')} />
        <Unit i={2} value={mins} label={t('cd.minutes')} />
        <Unit i={3} value={secs} label={t('cd.seconds')} />
      </div>

      <p className="cd-when" data-intro="ui" data-safe="">
        {zone !== 'local' && <span style={{ color: C.pink }}>{t('cd.jst', { time: formatTime(next, 'Asia/Tokyo') })}</span>}
        {zone === 'both' && <span className="cd-dot" />}
        {zone !== 'jst' && <span style={{ color: C.blue }}>{t('cd.local', { time: formatTime(next) })}</span>}
      </p>
    </section>
  )
}
