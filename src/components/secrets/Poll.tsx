import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { C, CHARACTERS } from '../../data'
import { sfx } from '../../sfx'
import { secrets } from '../../secrets'
import { Chip, Clock, curve, GameBoardFold, GameEnd, GameHud, GameStart, lerp, pick, shuffle, useGameBoard } from './GameKit'

/** Our own little reactions (not quotes from the series). */
const REACTIONS: Record<string, string> = {
  mitsumi: 'Expect a detailed plan for the walk, and at least one wrong turn.',
  makoto: 'A quiet walk, a good book recommendation, and a surprise laugh.',
  mika: "She'll pretend she just happened to be going your way.",
  ujie: 'Arriving five minutes early is arriving on time.',
  shima: 'Somehow every street feels like a scene from a movie.',
  yuzuki: "She'll tell you exactly what she thinks of your outfit. Kindly. Mostly.",
  yasaka: 'No rush. There is always time to grab a snack.',
}

type Char = (typeof CHARACTERS)[number]
interface Spot {
  key: number
  char: Char
  /** how the face is shown: mirrored, turned, zoomed in on a corner, or only a silhouette */
  flip: boolean
  turn: number
  zoom: number
  ox: number
  shadow: boolean
  found: boolean
  miss: boolean
}

/**
 * Find your friends. The morning crowd on the way to school: a name comes up, and you tap that
 * friend in the crowd as fast as you can. The crowd grows, the colour rings that give people
 * away fade out, faces get mirrored, turned, zoomed in and finally only shadows, sometimes
 * there are two or three of them to find, and late on the crowd shuffles while you look.
 * The clock is shared: every find gives a little time back, every wrong tap takes some away.
 * Your walking buddy from the old poll is worth double.
 */
const START_TIME = 25
const MAX_TIME = 40
/** 60 friends found = a star on the board */
const WIN_AT = 60

const dOf = (found: number) => curve(found, 10, 0.75)
const crowdOf = (d: number) => [4, 6, 9, 12, 16, 20][Math.min(5, Math.floor(d * 7))]
const colsOf = (n: number) => (n <= 4 ? 2 : n <= 9 ? 3 : n <= 16 ? 4 : 5)

let keyN = 0
function makeCrowd(found: number): { target: Char; spots: Spot[]; need: number } {
  const d = dOf(found)
  const size = crowdOf(d)
  const target = pick(CHARACTERS)
  const need = d > 0.45 && Math.random() < lerp(0, 0.55, d) ? (d > 0.65 && Math.random() < 0.4 ? 3 : 2) : 1
  // decoys lean on the friends who look most alike in a crowd: everyone but the target
  const others = CHARACTERS.filter((c) => c.id !== target.id)
  const chars = shuffle([...Array.from({ length: need }, () => target), ...Array.from({ length: size - need }, () => pick(others))])
  const odd = (from: number) => Math.random() < lerp(0, 0.85, Math.max(0, (d - from) / (1 - from)))
  return {
    target,
    need,
    spots: chars.map((char) => ({
      key: keyN++,
      char,
      flip: odd(0.2) && Math.random() < 0.5,
      turn: odd(0.35) ? pick([-1, 1]) * Math.round(lerp(15, 180, Math.random() * d)) : 0,
      zoom: odd(0.5) ? lerp(1.4, 2.4, Math.random() * d) : 1,
      ox: Math.random() * 60 - 30,
      shadow: odd(0.72),
      found: false,
      miss: false,
    })),
  }
}

export function Poll() {
  const kit = useGameBoard('poll', 'pollBest')
  const [buddy, setBuddy] = useState(secrets.get().vote)
  useEffect(() => secrets.subscribe(() => setBuddy(secrets.get().vote)), [])
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready')
  const [crowd, setCrowd] = useState<ReturnType<typeof makeCrowd> | null>(null)
  const [found, setFound] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [time, setTime] = useState(START_TIME)
  const [isBest, setIsBest] = useState(false)
  const [flash, setFlash] = useState<{ text: string; n: number } | null>(null)
  const clock = useRef(START_TIME)
  const scoreRef = useRef(0)
  scoreRef.current = score
  const shown = useRef(0)
  const timers = useRef<number[]>([])
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const vote = (id: string, i: number) => {
    secrets.update((st) => ({ ...st, vote: id }))
    sfx.chime(0.9 + i * 0.06, 0.8)
  }
  const chosen = CHARACTERS.find((c) => c.id === buddy)

  const addTime = (dt: number) => {
    clock.current = Math.max(0, Math.min(MAX_TIME, clock.current + dt))
    setTime(clock.current)
  }
  const flashN = useRef(0)
  const say = (text: string) => {
    const n = ++flashN.current
    setFlash({ text, n })
    later(1100, () => setFlash((x) => (x?.n === n ? null : x)))
  }

  const next = (count: number) => {
    setCrowd(makeCrowd(count))
    shown.current = performance.now()
  }

  const start = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    clock.current = START_TIME
    setTime(START_TIME)
    setFound(0)
    setScore(0)
    setStreak(0)
    setIsBest(false)
    setPhase('play')
    sfx.click(1.2)
    next(0)
  }

  const end = () => {
    setPhase('over')
    setIsBest(kit.record(scoreRef.current))
    sfx.thud()
  }

  useEffect(() => {
    if (phase !== 'play') return
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      const before = clock.current
      clock.current -= (now - last) / 1000
      last = now
      setTime(clock.current)
      if (clock.current <= 0) {
        clearInterval(id)
        end()
      } else if (clock.current < 5 && Math.ceil(clock.current) !== Math.ceil(before)) sfx.tick(1.4, 0.6)
    }, 100)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // late on, the crowd shuffles itself every couple of seconds while you look
  const d = dOf(found)
  useEffect(() => {
    if (phase !== 'play' || d < 0.6) return
    const id = window.setInterval(() => {
      setCrowd((c) => c && { ...c, spots: shuffle(c.spots) })
      sfx.rustle()
    }, lerp(3200, 1600, (d - 0.6) / 0.4))
    return () => clearInterval(id)
  }, [phase, d, crowd?.target])

  const tap = (k: number) => {
    if (phase !== 'play' || !crowd) return
    const spot = crowd.spots.find((x) => x.key === k)
    if (!spot || spot.found) return
    if (spot.char.id !== crowd.target.id) {
      sfx.thud()
      setStreak(0)
      addTime(-lerp(1.5, 3, d))
      setCrowd({ ...crowd, spots: crowd.spots.map((x) => (x.key === k ? { ...x, miss: true } : x)) })
      later(400, () => setCrowd((c) => c && { ...c, spots: c.spots.map((x) => (x.key === k ? { ...x, miss: false } : x)) }))
      say(`that's ${spot.char.name}!`)
      return
    }
    const spots = crowd.spots.map((x) => (x.key === k ? { ...x, found: true } : x))
    const left = spots.filter((x) => x.char.id === crowd.target.id && !x.found).length
    sfx.pop(1.1 + Math.min(streak, 10) * 0.04)
    if (left > 0) {
      setCrowd({ ...crowd, spots })
      return
    }
    // found them all: quick finds score more, and your buddy counts double
    const secs = (performance.now() - shown.current) / 1000
    const quick = Math.max(0, 1 - secs / 4)
    const mine = crowd.target.id === buddy
    const pts = Math.round(100 * crowd.need * (1 + d * 2) * (0.5 + quick) * (1 + Math.min(streak, 10) * 0.1) * (mine ? 2 : 1))
    setScore((x) => x + pts)
    setStreak((x) => x + 1)
    const count = found + 1
    setFound(count)
    addTime(lerp(2, 0.9, d) * crowd.need)
    sfx.chime(1 + Math.min(streak, 8) * 0.05, 0.6)
    if (mine) say(`your buddy! ×2`)
    if (count === WIN_AT) {
      sfx.jingle(0.6)
      say('sixty friends found!')
    }
    setCrowd({ ...crowd, spots })
    later(220, () => next(count))
  }

  const playing = phase === 'play'
  const rings = d < 0.3 ? 1 : d < 0.55 ? 1 - (d - 0.3) / 0.25 : 0

  return (
    <div className={`gm gm-poll${playing ? ' is-playing' : ''}`}>
      <GameHud score={score} best={kit.best}>
        <Chip color={C.green}>{found} found</Chip>
        {streak > 1 && <Chip color={C.amber}>{streak} in a row</Chip>}
      </GameHud>
      <Clock left={playing ? time : phase === 'over' ? 0 : START_TIME} of={MAX_TIME} />

      {playing && crowd && (
        <p className="fr-ask" key={found} style={{ '--c': crowd.target.color } as CSSProperties} aria-live="polite">
          find <b>{crowd.target.name}</b>
          {crowd.need > 1 && <> ×{crowd.need}</>}
          {crowd.target.id === buddy && <span className="fr-buddy">your buddy</span>}
        </p>
      )}

      <div className="gm-stage">
        {playing && crowd && (
          <div className="fr-crowd" style={{ '--cols': colsOf(crowd.spots.length), '--ring': rings } as CSSProperties}>
            {crowd.spots.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`fr-face${s.found ? ' is-found' : ''}${s.miss ? ' is-miss' : ''}${s.shadow ? ' is-shadow' : ''}`}
                style={{ '--c': s.char.color } as CSSProperties}
                aria-label={s.shadow ? 'someone in the crowd' : s.char.name}
                onPointerDown={(e) => {
                  e.preventDefault()
                  tap(s.key)
                }}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tap(s.key))}
              >
                <img
                  src={s.char.src}
                  alt=""
                  draggable={false}
                  style={{ transform: `translateX(${s.zoom > 1 ? s.ox : 0}%) rotate(${s.turn}deg) scale(${(s.flip ? -1 : 1) * s.zoom}, ${s.zoom})` }}
                />
              </button>
            ))}
          </div>
        )}
        {flash && playing && (
          <div key={flash.n} className="sg-shout gm-shout">
            {flash.text}
          </div>
        )}

        {phase === 'ready' && (
          <GameStart
            title="who’s walking with you?"
            lines={['pick a buddy first. finding them scores double', 'then find each friend in the morning crowd before the clock runs out', 'it gets crowded, and tricky. wrong taps cost time']}
            onStart={start}
            label={chosen ? `walk with ${chosen.name}` : 'start'}
          >
            <div className="poll-grid" role="radiogroup" aria-label="Who would you walk to school with?">
              {CHARACTERS.map((c, i) => (
                <button
                  key={c.id}
                  className={`poll-opt${buddy === c.id ? ' is-picked' : ''}${buddy && buddy !== c.id ? ' is-dim' : ''}`}
                  role="radio"
                  aria-checked={buddy === c.id}
                  onClick={() => vote(c.id, i)}
                  style={{ '--c': c.color } as CSSProperties}
                >
                  <span className="poll-face">
                    <img src={c.src} alt="" draggable={false} />
                  </span>
                  <b>{c.name}</b>
                </button>
              ))}
            </div>
            <p className="poll-react" aria-live="polite" key={buddy ?? 'none'}>
              {chosen ? (
                <>
                  <b style={{ color: chosen.color }}>{chosen.name}!</b> {REACTIONS[chosen.id]}
                </>
              ) : (
                'who would you walk to school with?'
              )}
            </p>
          </GameStart>
        )}
        {phase === 'over' && (
          <GameEnd
            title="the bell rang!"
            score={score}
            isBest={isBest}
            won={found >= WIN_AT}
            line={`you found ${found} ${found === 1 ? 'friend' : 'friends'}${chosen ? `, walking with ${chosen.name}` : ''}`}
            kit={kit}
            onAgain={start}
          />
        )}
      </div>

      {!playing && <GameBoardFold kit={kit} />}
    </div>
  )
}
