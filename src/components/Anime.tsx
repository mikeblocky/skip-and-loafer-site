import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
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

const s1 = (n: number) => `/anime/s1/${n}.jpg`
const s2 = (n: number) => `/anime/s2/${n}.webp`

// marks follow the Japanese key-visual copy: the perfect life plan highlighted, the
// "slightly off" quirk circled and ticked, the overlap waved, the restless feelings dotted
const SEASON_1: ReactNode[] = [
  <>
    Mitsumi Iwakura comes from a small middle school in the countryside, but she manages to get into one of Tokyo’s
    most prestigious high schools.
  </>,
  <>
    With <Hl>
      <Strong>big dreams</Strong>
    </Hl>{' '}
    and her <Hl>
      <Strong>whole future planned out</Strong>
    </Hl>
    , this country girl arrives in Tokyo, ready to take on the world.
  </>,
  <>
    She’s smart and hardworking, but a little <Circ>awkward</Circ> around people, and sometimes she just doesn’t quite{' '}
    <Brush>get things right</Brush>.
  </>,
  <>
    Even when she <Circ c="yellow">messes up</Circ>, though, her classmates can’t help but be drawn to her.
  </>,
  <>
    Before they know it, all their different personalities begin to <Wavy>come together</Wavy>.
  </>,
  <>
    As they get to know one another, they slowly begin to understand each other, discovering how much they have in
    common despite their differences.
  </>,
  <>
    There’s that <Dots>nervous, restless feeling</Dots> everyone knows, the little things that make your heart
    flutter.
  </>,
  <>And sometimes, all it takes is an irreplaceable friendship to help you make sense of it all.</>,
  <>
    There may be misunderstandings and moments when things don’t quite click, but somehow, along the way, it all turns
    into a <Green>happy little school-life comedy</Green>!
  </>,
]

const SEASON_2: ReactNode[] = [
  <>Mitsumi Iwakura, 15 years old.</>,
  <>
    Having come all the way from a remote corner of Ishikawa Prefecture, she’s already been living the life of a Tokyo
    high school student for <Hl>six months</Hl>.
  </>,
  <>
    The slightly <Brush>offbeat</Brush> country girl is slowly finding her place in <Strong>the big city</Strong>.
  </>,
  <>
    As the seasons change and new experiences come her way, Mitsumi and her classmates find themselves caught up in
    all kinds of <Dots>excitement and anticipation</Dots>.
  </>,
  <>New friendships, upperclassmen, underclassmen.</>,
  <>
    With so many different <Circ c="yellow">personalities</Circ> coming together, their lives begin to{' '}
    <Hl>change in unexpected ways</Hl>.
  </>,
  <>There are moments when they understand each other, and moments when they simply can't.</>,
  <>They jump into things, get hurt, face their feelings, and form bonds that grow deeper along the way.</>,
  <>
    Little by little, Mitsumi and her friends continue to <Circ>grow</Circ>, stumbling every now and then as they
    find their way forward.
  </>,
  <>
    Things might not always <Wavy>fall into place</Wavy>, but somehow, they're taking{' '}
    <Brush>
      <Green>another step</Green>
    </Brush>{' '}
    into a <Green>happy school-life comedy</Green>!
  </>,
]

interface SeasonInfo {
  n: number
  color: string
  stills: string[]
  lines: ReactNode[]
  chip: ReactNode
  tvSub: string
  videos?: boolean
}

const SEASONS: SeasonInfo[] = [
  {
    n: 1,
    color: C.blue,
    stills: [1, 2, 3, 4, 5, 6].map(s1),
    lines: SEASON_1,
    tvSub: 'April 2023',
    chip: (
      <span className="s-chip">
       Covers chapters 1 – 23 (volumes 1 – 4) of the manga
      </span>
    ),
    videos: true,
  },
  {
    n: 2,
    color: C.green,
    stills: [1, 2, 3, 4, 5, 6].map(s2),
    lines: SEASON_2,
    tvSub: 'April 2027',
    chip: (
      <span className="s-chip s-chip-soon">
        Coming in April 2027!
      </span>
    ),
  },
]

/** A little retro TV. Its screen flips through the season's stills while it's switched on. */
function TV({ s, on, onPick, tilt }: { s: SeasonInfo; on: boolean; onPick: () => void; tilt: number }) {
  const [frame, setFrame] = useState(0)
  const [flash, setFlash] = useState(0)
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
      aria-label={`Season ${s.n}`}
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
        <b>Season {s.n}</b>
        <small>{s.tvSub}</small>
      </span>
    </button>
  )
}

function SeasonDetail({ s }: { s: SeasonInfo }) {
  const body = useRef<HTMLDivElement>(null)
  return (
    <section className="season" style={{ '--c': s.color } as CSSProperties} aria-label={`Season ${s.n}`}>
      <header className="season-head">
        <span className="season-no">
          <span>Season</span>
          <b>{s.n}</b>
        </span>
        <div className="season-chips">{s.chip}</div>
      </header>
      <div className="season-body" ref={body}>
        <Photos srcs={s.stills} bodyRef={body} />
        <Story lines={s.lines} />
      </div>
      {s.videos && (
        <div className="season-videos">
          <Player
            src="/anime/s1/op.mp4"
            poster={s1(5)}
            kind="Opening"
            titleJp="メロウ"
            title="Mellow"
            artistJp="須田景凪"
            artist="Keina Suda"
            color={C.pink}
            subs={OP_S1}
          />
          <Player
            src="/anime/s1/ed.mp4"
            poster={s1(6)}
            kind="Ending"
            titleJp="ハナウタとまわり道"
            title="Hanauta to Mawarimichi"
            artistJp="逢田梨香子"
            artist="Rikako Aida"
            color={C.violet}
            subs={ED_S1}
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
        if (top < 0) window.scrollTo({ top: window.scrollY + top - 140, behavior: 'smooth' })
        gsap.fromTo(detail.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.25)' })
      },
    })
  }

  return (
    <section className="view view-anime">
      <FlexText as="h2" className="anime-title" words={[{ t: 'Anime', w: 760, c: C.orange }]} data-intro="ui" data-safe="">
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
