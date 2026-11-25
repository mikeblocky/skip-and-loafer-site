import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { gsap } from '../gsap'
import { C } from '../data'
import { FlexText } from './FlexText'
import { Brush, Circ, Dots, Green, Hl, Story, Strong, Wavy } from './Marker'
import { Photos } from './Photos'
import { Player } from './Player'
import { Icon } from '../icons'
import { sfx } from '../sfx'
import { ED_S1, OP_S1 } from '../lyrics'
import { openSecret } from '../secrets'
import { monthYear, useT, type Key } from '../i18n'

const s1 = (n: number) => `/anime/s1/${n}.jpg`
const s2 = (n: number) => `/anime/s2/${n}.webp`

// marks follow the Japanese key-visual copy: the perfect life plan highlighted, the
// "slightly off" quirk circled and ticked, the overlap waved, the restless feelings dotted.
// The words live in the dictionaries, with tags for the marks (see src/i18n/pages/en.ts).
const MARKS: Record<string, (c: ReactNode) => ReactNode> = {
  hl: (c) => <Hl>{c}</Hl>,
  b: (c) => <Strong>{c}</Strong>,
  circ: (c) => <Circ>{c}</Circ>,
  circy: (c) => <Circ c="yellow">{c}</Circ>,
  brush: (c) => <Brush>{c}</Brush>,
  wavy: (c) => <Wavy>{c}</Wavy>,
  dots: (c) => <Dots>{c}</Dots>,
  green: (c) => <Green>{c}</Green>,
}

/** "a <hl>big</hl> day" → text with the marker components around the tagged words (tags nest) */
function marked(s: string): ReactNode {
  const out: ReactNode[] = []
  const re = /<(\w+)>([\s\S]*?)<\/\1>/g
  let at = 0
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > at) out.push(s.slice(at, m.index))
    const wrap = MARKS[m[1]] ?? ((c: ReactNode) => c)
    out.push(<Fragment key={m.index}>{wrap(marked(m[2]))}</Fragment>)
    at = m.index + m[0].length
  }
  if (at < s.length) out.push(s.slice(at))
  return out.length === 1 ? out[0] : <>{out}</>
}

const lines = (season: number, n: number): Key[] => Array.from({ length: n }, (_, i) => `anime.s${season}.${i + 1}` as Key)

interface SeasonInfo {
  n: number
  color: string
  stills: string[]
  lines: Key[]
  chip: Key
  soon?: boolean
  /** when it airs: [year, month] */
  airs: [number, number]
  videos?: boolean
}

const SEASONS: SeasonInfo[] = [
  {
    n: 1,
    color: C.blue,
    stills: [1, 2, 3, 4, 5, 6].map(s1),
    lines: lines(1, 9),
    airs: [2023, 4],
    chip: 'anime.s1chip',
    videos: true,
  },
  {
    n: 2,
    color: C.green,
    stills: [1, 2, 3, 4, 5, 6].map(s2),
    lines: lines(2, 10),
    airs: [2027, 4],
    chip: 'anime.s2chip',
    soon: true,
  },
]

/** A little retro TV. Its screen flips through the season's stills while it's switched on. */
function TV({ s, on, onPick, tilt }: { s: SeasonInfo; on: boolean; onPick: () => void; tilt: number }) {
  const [frame, setFrame] = useState(0)
  const [flash, setFlash] = useState(0)
  const { t, locale } = useT()
  useEffect(() => {
    if (!on) return
    setFlash((f) => f + 1)
    const id = window.setInterval(() => setFrame((f) => (f + 1) % s.stills.length), 2400)
    return () => clearInterval(id)
  }, [on, s.stills.length])

  return (
    <button
      className={`tv${on ? ' is-on' : ''}`}
      style={{ '--c': s.color, '--t': `${tilt}deg` } as CSSProperties}
      onClick={onPick}
      aria-pressed={on}
      aria-label={t('anime.seasonN', { n: s.n })}
    >
      <span className="tv-ant tv-ant-l" />
      <span className="tv-ant tv-ant-r" />
      <span className="tv-body">
        <span className="tv-screen">
          {s.stills.map((src, i) => (
            <img key={src} src={src} alt="" className={i === frame ? 'is-shown' : ''} draggable={false} />
          ))}
          <span key={flash} className="tv-static" />
          <span className="tv-glare" />
          {!on && (
            <span className="tv-play">
              <Icon name="play" color="#fff" size={26} />
            </span>
          )}
        </span>
        <span className="tv-side">
          <i className="tv-knob" />
          <i className="tv-knob tv-knob-b" />
          <span className="tv-grille" />
        </span>
      </span>
      <span className="tv-legs" />
      <span className="tv-label">
        <b>{t('anime.seasonN', { n: s.n })}</b>
        <small>{monthYear(s.airs[0], s.airs[1], locale)}</small>
      </span>
    </button>
  )
}

function SeasonDetail({ s }: { s: SeasonInfo }) {
  const body = useRef<HTMLDivElement>(null)
  const { t } = useT()
  return (
    <section className="season" style={{ '--c': s.color } as CSSProperties} aria-label={t('anime.seasonN', { n: s.n })}>
      <header className="season-head">
        <span className="season-no">
          <span>{t('anime.season')}</span>
          <b>{s.n}</b>
        </span>
        <div className="season-chips">
          <span className={`s-chip${s.soon ? ' s-chip-soon' : ''}`}>{t(s.chip)}</span>
        </div>
      </header>
      <div className="season-body" ref={body}>
        <Photos srcs={s.stills} bodyRef={body} />
        <Story lines={s.lines.map((k) => marked(t(k)))} />
      </div>
      {s.videos && (
        <div className="season-videos">
          <Player
            src="/anime/s1/op.mp4"
            poster={s1(5)}
            kind={t('anime.opening')}
            titleJp="メロウ"
            title="Mellow"
            artistJp="須田景凪"
            artist="Keina Suda"
            color={C.pink}
            subs={OP_S1}
            song="op"
          />
          <Player
            src="/anime/s1/ed.mp4"
            poster={s1(6)}
            kind={t('anime.ending')}
            titleJp="ハナウタとまわり道"
            title="Hanauta to Mawarimichi"
            artistJp="逢田梨香子"
            artist="Rikako Aida"
            color={C.violet}
            subs={ED_S1}
            song="ed"
            goldenWord="スキップ"
            onGolden={() => openSecret('skip')}
          />
        </div>
      )}
    </section>
  )
}

export function Anime() {
  const [pick, setPick] = useState(0)
  const detail = useRef<HTMLDivElement>(null)
  const row = useRef<HTMLDivElement>(null)
  const { t } = useT()

  const choose = (i: number) => {
    if (i === pick) return
    sfx.whoosh(0.35, true, 0.14)
    window.setTimeout(() => sfx.chime(i ? 1.25 : 1, 0.6), 220)
    // channel change: the old season slides off, then the new one tunes in
    gsap.to(detail.current, {
      opacity: 0,
      y: 30,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => {
        setPick(i)
        const top = row.current?.getBoundingClientRect().bottom ?? 0
        if (top < 0)
          window.scrollTo({
            top: window.scrollY + top - 140,
            behavior: 'smooth',
          })
        gsap.fromTo(detail.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.25)' })
      },
    })
  }

  return (
    <section className="view view-anime">
      <FlexText as="h2" className="anime-title" words={[{ t: t('nav.anime'), w: 760, c: C.orange }]} data-intro="ui" data-safe="">
        <sup className="vt-count">{SEASONS.length}</sup>
      </FlexText>

      <div className="tv-row" ref={row} data-intro="ui" data-safe="">
        {SEASONS.map((s, i) => (
          <TV key={s.n} s={s} on={i === pick} onPick={() => choose(i)} tilt={i ? 3 : -3} />
        ))}
      </div>

      <div className="season-wrap" ref={detail}>
        <SeasonDetail key={SEASONS[pick].n} s={SEASONS[pick]} />
      </div>
    </section>
  )
}
