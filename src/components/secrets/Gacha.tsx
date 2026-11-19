import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { CHARACTERS, C } from '../../data'
import { sfx } from '../../sfx'
import { secrets } from '../../secrets'
import { fmt } from './skipRules'
import { Chip, Clock, curve, GameBoardFold, GameEnd, GameHud, GameStart, lerp, shuffle, useGameBoard } from './GameKit'

const RARITY = [
  { name: 'N', weight: 60, color: '#A9A3C9', pts: 100 },
  { name: 'R', weight: 28, color: C.blue, pts: 150 },
  { name: 'SR', weight: 10, color: C.violet, pts: 250 },
  { name: 'SSR', weight: 2, color: C.amber, pts: 500 },
] as const

/** Our own little titles for each card (not quotes from the series). */
const TITLES: Record<string, string> = {
  mitsumi: 'countryside valedictorian',
  makoto: 'bookworm with a big heart',
  mika: 'honest to a fault',
  ujie: 'student council ace',
  shima: 'effortlessly charming',
  yuzuki: 'straight-talking beauty',
  yasaka: 'easygoing friend',
}

type Char = (typeof CHARACTERS)[number]
interface Cap {
  key: number
  char: Char
  r: number
  state: 'down' | 'up' | 'got'
}

/**
 * Capsule gacha, as a memory game. Each round the machine drops a tray of capsules: you get a
 * peek at the cards inside, then they close, and you open two at a time to find matching pairs.
 * A pair is the same friend at the same rarity, so later trays with Mika N and Mika SR side by
 * side need a sharper eye. Every pair goes in your collection. The clock keeps running across
 * rounds: pairs and cleared trays give time back, misses cost a little (more later on), and
 * from round 5 the machine sometimes swaps two closed capsules after a miss.
 */
const START_TIME = 40
const MAX_TIME = 60
/** round 8 cleared = a star on the board */
const WIN_ROUND = 8

/** how hard round n (1, 2, …) is, from 0 toward 1 */
const dOf = (round: number) => curve(round - 1, 3, 0.8)
const pairsOf = (round: number) => [3, 4, 6, 8, 10, 12][Math.min(round - 1, 5)]
/** columns on a wide screen; phones cap it at 4 (see games.css) */
const colsOf = (cards: number) => (cards <= 6 ? 3 : cards <= 16 ? 4 : cards <= 20 ? 5 : 6)

function rollRarity() {
  let n = Math.random() * RARITY.reduce((a, x) => a + x.weight, 0)
  let r = 0
  while (r < 3 && n > RARITY[r].weight) n -= RARITY[r++].weight
  return r
}

/**
 * The tray for one round. Early trays have a different friend in every pair; later ones reuse
 * the same friends at different rarities, so the frame colour is what tells them apart.
 */
function makeTray(round: number): Cap[] {
  const pairs = pairsOf(round)
  const d = dOf(round)
  const friends = Math.max(2, Math.min(CHARACTERS.length, Math.ceil(pairs * lerp(1, 0.35, d))))
  const chars = shuffle(CHARACTERS).slice(0, friends)
  const used = new Set<string>()
  const kinds: { char: Char; r: number }[] = []
  for (let i = 0; kinds.length < pairs && i < 400; i++) {
    const char = chars[kinds.length % friends]
    // a rarer card now and then, more often later on
    let r = Math.random() < lerp(0.1, 0.35, d) ? 2 + Math.round(Math.random() * 0.6) : rollRarity()
    while (used.has(`${char.id}${r}`)) r = (r + 1) % 4
    if (used.has(`${char.id}${r}`)) continue
    used.add(`${char.id}${r}`)
    kinds.push({ char, r })
  }
  return shuffle(kinds.flatMap((k) => [k, k])).map((k, i) => ({ ...k, key: round * 100 + i, state: 'up' as const }))
}

function Face({ c }: { c: Cap }) {
  return (
    <span className="gp-face">
      <span className="gp-art">
        <img src={c.char.src} alt="" draggable={false} />
      </span>
      <span className="gc-rar">{RARITY[c.r].name}</span>
      <b>{c.char.name}</b>
    </span>
  )
}

export function Gacha() {
  const kit = useGameBoard('gacha', 'gachaBest')
  const [phase, setPhase] = useState<'ready' | 'peek' | 'play' | 'clear' | 'over'>('ready')
  const [round, setRound] = useState(1)
  const [tray, setTray] = useState<Cap[]>([])
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [time, setTime] = useState(START_TIME)
  const [shout, setShout] = useState<{ text: string; n: number } | null>(null)
  const [swapped, setSwapped] = useState<number[]>([])
  const [isBest, setIsBest] = useState(false)
  const [s, setS] = useState(secrets.get())
  const clock = useRef(START_TIME)
  const scoreRef = useRef(0)
  scoreRef.current = score
  const misses = useRef(0)
  const timers = useRef<number[]>([])
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))
  useEffect(() => secrets.subscribe(() => setS({ ...secrets.get() })), [])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const shoutN = useRef(0)
  const say = (text: string) => {
    const n = ++shoutN.current
    setShout({ text, n })
    later(1500, () => setShout((x) => (x?.n === n ? null : x)))
  }

  const addTime = (dt: number) => {
    clock.current = Math.max(0, Math.min(MAX_TIME, clock.current + dt))
    setTime(clock.current)
  }

  const deal = (n: number) => {
    const t = makeTray(n)
    setRound(n)
    setTray(t)
    setSwapped([])
    misses.current = 0
    setPhase('peek')
    // the capsules rattle out of the machine, then the cards inside get a short look
    sfx.whoosh(0.5, true, 0.12)
    for (let i = 0; i < 4; i++) later(80 + i * 120, () => sfx.clack(0.9 + i * 0.06))
    const peek = lerp(2.8, 0.7, dOf(n)) + t.length * 0.05
    later(peek * 1000, () => {
      setTray((x) => x.map((c) => ({ ...c, state: 'down' })))
      setPhase('play')
      sfx.fold()
    })
  }

  const start = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    clock.current = START_TIME
    setTime(START_TIME)
    setScore(0)
    setStreak(0)
    setIsBest(false)
    sfx.click(1.2)
    deal(1)
  }

  const end = (final: number) => {
    setPhase('over')
    setIsBest(kit.record(final))
    sfx.thud()
  }

  // the clock only runs while you're opening capsules
  useEffect(() => {
    if (phase !== 'play') return
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      clock.current -= (now - last) / 1000
      last = now
      setTime(clock.current)
      if (clock.current <= 0) {
        clearInterval(id)
        end(scoreRef.current)
      } else if (clock.current < 5 && Math.ceil(clock.current) !== Math.ceil(clock.current + 0.1)) sfx.tick(1.4, 0.6)
    }, 100)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const open = (i: number) => {
    if (phase !== 'play') return
    const c = tray[i]
    if (c.state !== 'down') return
    // two wrong ones still showing: close them straight away, so fast play isn't held up
    let t = tray.map((x) => x)
    const up = t.filter((x) => x.state === 'up')
    if (up.length >= 2) t = t.map((x) => (x.state === 'up' ? { ...x, state: 'down' } : x))
    t[i] = { ...c, state: 'up' }
    const nowUp = t.map((x, k) => [x, k] as const).filter(([x]) => x.state === 'up')
    sfx.pop(1 + c.r * 0.08)

    if (nowUp.length === 2) {
      const [[a, ai], [b, bi]] = nowUp
      const d = dOf(round)
      if (a.char.id === b.char.id && a.r === b.r) {
        t[ai] = { ...a, state: 'got' }
        t[bi] = { ...b, state: 'got' }
        const mult = 1 + Math.min(streak, 8) * 0.25
        const pts = Math.round(RARITY[a.r].pts * mult * (1 + (round - 1) * 0.15))
        setScore((x) => x + pts)
        setStreak((x) => x + 1)
        addTime(lerp(2.5, 0.9, d))
        if (a.r === 3) {
          sfx.jingle(0.6)
          say(`SSR ${a.char.name}!`)
        } else sfx.chime(1 + a.r * 0.1 + Math.min(streak, 6) * 0.04, 0.7)
        // every pair joins your collection
        secrets.update((st) => {
          const was = st.dex[a.char.id]
          return { ...st, dex: { ...st.dex, [a.char.id]: { best: Math.max(was?.best ?? -1, a.r), count: (was?.count ?? 0) + 1 } }, pulls: st.pulls + 1 }
        })
        if (t.every((x) => x.state === 'got')) {
          const bonus = 250 * round + Math.round(clock.current) * 10
          setScore((x) => x + bonus)
          addTime(lerp(6, 3, d))
          setPhase('clear')
          say(round === WIN_ROUND ? 'round 8! the whole set!' : `tray ${round} done! +${fmt(bonus)}`)
          later(1300, () => deal(round + 1))
        }
      } else {
        sfx.thud()
        setStreak(0)
        const penalty = lerp(0, 1.6, d)
        if (penalty > 0.2) addTime(-penalty)
        misses.current++
        // from round 5, every third miss the machine swaps two closed capsules
        if (round >= 5 && misses.current % 3 === 0) {
          const closed = t.map((x, k) => [x, k] as const).filter(([x]) => x.state === 'down').map(([, k]) => k)
          if (closed.length >= 2) {
            const [p, q] = shuffle(closed)
            later(750, () => {
              setTray((cur) => {
                const n = [...cur]
                if (n[p].state !== 'down' || n[q].state !== 'down') return cur
                ;[n[p], n[q]] = [n[q], n[p]]
                return n
              })
              setSwapped([p, q])
              sfx.clack(1.2)
              say('the machine rattled… two swapped!')
              later(700, () => setSwapped([]))
            })
          }
        }
        later(700, () => setTray((cur) => cur.map((x, k) => ((k === ai || k === bi) && x.state === 'up' ? { ...x, state: 'down' } : x))))
      }
    }
    setTray(t)
  }

  const playing = phase === 'peek' || phase === 'play' || phase === 'clear'
  const mult = 1 + Math.min(streak, 8) * 0.25

  return (
    <div className={`gm gm-gacha${playing ? ' is-playing' : ''}`}>
      <GameHud score={score} best={kit.best}>
        <Chip color={C.pink}>tray {round}</Chip>
        {streak > 1 && <Chip color={C.amber}>×{mult.toFixed(2).replace(/\.?0+$/, '')}</Chip>}
      </GameHud>
      <Clock left={playing ? time : phase === 'over' ? 0 : START_TIME} of={MAX_TIME} />

      <div className="gm-stage">
        {playing && (
          <div
            className={`gp-tray${phase === 'peek' ? ' is-peek' : ''}`}
            style={{ '--cols': colsOf(tray.length), '--pcols': Math.min(4, colsOf(tray.length)), '--prows': Math.ceil(tray.length / Math.min(4, colsOf(tray.length))) } as CSSProperties}
          >
            {tray.map((c, i) => (
              <button
                key={c.key}
                type="button"
                className={`gp-cap r${c.r} is-${c.state}${swapped.includes(i) ? ' is-swap' : ''}`}
                style={{ '--c': c.char.color, '--rc': RARITY[c.r].color } as CSSProperties}
                onPointerDown={(e) => {
                  e.preventDefault()
                  open(i)
                }}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open(i))}
                aria-label={c.state === 'down' ? 'closed capsule' : `${c.char.name} ${RARITY[c.r].name}`}
              >
                <span className="gp-inner">
                  <span className="gp-back" aria-hidden="true">
                    <i />
                  </span>
                  <Face c={c} />
                </span>
              </button>
            ))}
          </div>
        )}
        {shout && playing && (
          <div key={shout.n} className="sg-shout gm-shout">
            {shout.text}
          </div>
        )}

        {phase === 'ready' && (
          <GameStart
            title="capsule pairs"
            lines={[
              'peek at the cards, then open two capsules at a time to find pairs',
              'a pair is the same friend at the same rarity. watch the frame colour',
              'pairs and full trays give you time back. misses cost a little',
            ]}
            onStart={start}
          />
        )}
        {phase === 'over' && (
          <GameEnd
            title="out of time!"
            score={score}
            isBest={isBest}
            won={round > WIN_ROUND}
            line={`you got to tray ${round}${round > WIN_ROUND ? ', the whole set!' : ''}`}
            kit={kit}
            onAgain={start}
          />
        )}
      </div>

      {!playing && (
        <>
          <div className="gc-dex" aria-label="Your collection">
            {CHARACTERS.map((c) => {
              const got = s.dex[c.id]
              return (
                <div key={c.id} className={`gc-dex-item${got ? ' is-got' : ''}`} style={{ '--c': c.color } as CSSProperties} title={got ? `${c.name} · ${TITLES[c.id]} · best ${RARITY[got.best].name} · ×${got.count}` : '???'}>
                  <img src={c.src} alt={got ? c.name : 'not met yet'} draggable={false} />
                  {got && <span className="gc-dex-r" style={{ background: RARITY[got.best].color }}>{RARITY[got.best].name}</span>}
                </div>
              )
            })}
          </div>
          <p className="sx-note">
            {Object.keys(s.dex).length}/{CHARACTERS.length} met · {s.pulls} cards collected · saved on this device
          </p>
          <GameBoardFold kit={kit} />
        </>
      )}
    </div>
  )
}
