import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { C } from '../../data'
import { sfx } from '../../sfx'
import { Chip, Clock, curve, GameBoardFold, GameEnd, GameHud, GameStart, Hearts, lerp, useGameBoard } from './GameKit'
import { makeQuestion, type Q } from './quizBank'

/**
 * The quiz, as an endless run. Three hearts; a wrong answer or running out of time costs one.
 * Each question has its own clock, which gets shorter as you go, while the questions climb from
 * birth months to exact dates, chapter titles and family names, with more answers to pick from.
 * Fast answers score more, and a streak multiplies it. Eight in a row brings a heart back.
 */
const LIVES = 3
/** 40 right answers = a star on the board */
const WIN_AT = 40
const HEAL_EVERY = 8

const tierOf = (n: number) => (n < 4 ? 0 : n < 10 ? 1 : n < 18 ? 2 : 3)
const optionsOf = (n: number) => (n < 6 ? 3 : n < 16 ? 4 : n < 28 ? 5 : 6)
/** seconds for question n: 12 at the start, heading toward 4 */
const timeOf = (n: number) => lerp(12, 4, curve(n, 10, 0.9))

/** the question, with its key bit in colour */
function Text({ q }: { q: Q }) {
  const [a, b] = q.text.split('{hi}')
  return (
    <>
      {a}
      {q.hi && <b style={{ '--c': q.color } as CSSProperties}>{q.hi}</b>}
      {b}
    </>
  )
}

export function Quiz() {
  const kit = useGameBoard('quiz', 'quizBest')
  const [phase, setPhase] = useState<'ready' | 'ask' | 'show' | 'over'>('ready')
  const [q, setQ] = useState<Q | null>(null)
  const [n, setN] = useState(0)
  const [right, setRight] = useState(0)
  const [lives, setLives] = useState(LIVES)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [gain, setGain] = useState<{ pts: number; k: number } | null>(null)
  const [time, setTime] = useState(12)
  const [limit, setLimit] = useState(12)
  const [isBest, setIsBest] = useState(false)
  const recent = useRef(new Set<string>())
  const left = useRef(12)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])

  const ask = (count: number) => {
    const next = makeQuestion(tierOf(count), optionsOf(count), recent.current)
    recent.current.add(next.id)
    if (recent.current.size > 24) recent.current.delete(recent.current.values().next().value!)
    const t = timeOf(count)
    left.current = t
    setLimit(t)
    setTime(t)
    setQ(next)
    setPicked(null)
    setPhase('ask')
  }

  const start = () => {
    recent.current.clear()
    setN(0)
    setRight(0)
    setLives(LIVES)
    setScore(0)
    setStreak(0)
    setIsBest(false)
    setGain(null)
    sfx.click(1.2)
    ask(0)
  }

  const answer = (choice: string | null) => {
    if (phase !== 'ask' || !q) return
    setPicked(choice ?? '')
    setPhase('show')
    const ok = choice === q.answer
    let livesNow = lives
    let scoreNow = score
    if (ok) {
      const frac = Math.max(0, left.current / limit)
      const pts = Math.round(100 * (q.tier + 1) * (0.4 + 0.6 * frac) * (1 + Math.min(streak, 10) * 0.1))
      scoreNow += pts
      setScore(scoreNow)
      setGain({ pts, k: n })
      setRight((x) => x + 1)
      const s = streak + 1
      setStreak(s)
      sfx.chime(1 + Math.min(s, 10) * 0.05, 0.7)
      if (s % HEAL_EVERY === 0 && lives < LIVES) {
        livesNow = lives + 1
        setLives(livesNow)
        window.setTimeout(() => sfx.jingle(0.5), 250)
      }
    } else {
      sfx.thud()
      setStreak(0)
      livesNow = lives - 1
      setLives(livesNow)
    }
    // a wrong answer stays up a little longer, so you can see the right one
    timer.current = window.setTimeout(
      () => {
        if (livesNow <= 0) {
          setPhase('over')
          setIsBest(kit.record(scoreNow))
          return
        }
        setN(n + 1)
        ask(n + 1)
      },
      ok ? 650 : 1500,
    )
  }

  // each question's clock
  useEffect(() => {
    if (phase !== 'ask') return
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      const before = left.current
      left.current -= (now - last) / 1000
      last = now
      setTime(left.current)
      if (left.current <= 0) {
        clearInterval(id)
        answer(null)
      } else if (left.current < 3 && Math.ceil(left.current) !== Math.ceil(before)) sfx.tick(1.4, 0.6)
    }, 100)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, q])

  // number keys pick an answer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'ask' || !q) return
      if ((e.target as Element | null)?.closest?.('input, textarea')) return
      const i = Number(e.key) - 1
      if (i >= 0 && i < q.options.length) answer(q.options[i])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const playing = phase === 'ask' || phase === 'show'

  return (
    <div className={`gm gm-quiz${playing ? ' is-playing' : ''}`}>
      <GameHud score={score} best={kit.best}>
        <Hearts n={lives} of={LIVES} />
        {streak > 1 && <Chip color={C.amber}>{streak} in a row</Chip>}
      </GameHud>
      <Clock left={playing ? time : 0} of={limit} warn={3} />

      <div className="gm-stage">
        {playing && q && (
          <div className="qz-card" key={n}>
            <span className="qz-n">
              question {n + 1}
              {q.tier >= 3 ? ' · tricky one' : ''}
            </span>
            <p className="quiz-q">
              <Text q={q} />
            </p>
            {gain?.k === n && <span className="qz-gain">+{gain.pts}</span>}
          </div>
        )}
        {phase === 'ready' && (
          <GameStart
            title="how well do you know them?"
            lines={[
              'answer before the bar runs out. faster answers score more',
              'it starts easy and gets a lot harder. three wrong and you’re out',
              'eight right in a row gives you a heart back',
            ]}
            onStart={start}
          />
        )}
        {phase === 'over' && (
          <GameEnd
            title={right >= WIN_AT ? 'a true fan!' : 'out of hearts!'}
            score={score}
            isBest={isBest}
            won={right >= WIN_AT}
            line={`${right} right out of ${n + 1}`}
            kit={kit}
            onAgain={start}
          />
        )}
      </div>

      {playing && q && (
        <div className={`gm-controls quiz-opts is-${q.options.length}`}>
          {q.options.map((o, i) => {
            const state = phase === 'show' ? (o === q.answer ? ' is-right' : o === picked ? ' is-wrong' : ' is-dim') : ''
            return (
              <button
                key={o}
                className={`quiz-opt${state}`}
                onClick={() => answer(o)}
                disabled={phase !== 'ask'}
                style={{ '--c': [C.pink, C.blue, C.green, C.orange, C.violet, C.red][i] } as CSSProperties}
              >
                {o}
              </button>
            )
          })}
        </div>
      )}

      {!playing && <GameBoardFold kit={kit} />}
    </div>
  )
}
