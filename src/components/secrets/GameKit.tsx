import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { C } from '../../data'
import { Icon } from '../../icons'
import { sfx } from '../../sfx'
import { secrets } from '../../secrets'
import { fmt } from './skipRules'
import { Leaderboard, SaveScore, savedName, useLeaderboard, type GameId } from './SkipBoard'

/**
 * Bits shared by the three newer hidden games (capsule gacha, the quiz and find your friends):
 * the difficulty curve, the HUD, the end screen with "save score", and the best on this device.
 * Each game is a `.gm` box: HUD on top, the play area right under it, and the controls in the
 * thumb zone at the bottom. On phones mid-game it takes the whole screen (see games.css).
 */

/**
 * Same shape as Skip to School's curve: 0 at the start, climbing briskly at first and then
 * easing toward 1 without ever flattening out. `n` is how far into the game you are (rounds,
 * questions, finds) and `scale` is where the curve is a quarter of the way up.
 */
export const curve = (n: number, scale: number, power = 0.6) => 1 - Math.pow(1 + Math.max(0, n) / scale, -power)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export const shuffle = <T,>(a: readonly T[]) => {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}
export const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]

type BestKey = 'gachaBest' | 'quizBest' | 'pollBest'

/** this device's best for one game, plus the leaderboard and your name for saving scores */
export function useGameBoard(game: GameId, key: BestKey) {
  const [best, setBest] = useState(() => secrets.get()[key])
  const [name, setName] = useState(savedName)
  const board = useLeaderboard(game)

  /** keeps the higher of the two; true when n beats the old best */
  const record = (n: number) => {
    if (n <= secrets.get()[key]) return false
    secrets.update((st) => ({ ...st, [key]: n }))
    setBest(n)
    return true
  }
  // the board keeps your best under your name from any device; this device's best catches up
  useEffect(() => {
    const me = savedName().trim().toLowerCase()
    const e = me && board.entries.find((x) => x.name.toLowerCase() === me)
    if (e) record(e.score)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.entries])

  return { best, record, name, setName, board }
}
export type GameBoard = ReturnType<typeof useGameBoard>

/** a row of hearts, the empty ones greyed out */
export function Hearts({ n, of }: { n: number; of: number }) {
  return (
    <span className="gm-hearts" aria-label={`${n} hearts left`}>
      {Array.from({ length: of }, (_, i) => (
        <Icon key={i} name="heart" color={i < n ? C.red : '#e3ddd2'} size={20} />
      ))}
    </span>
  )
}

/** the time left as a draining bar; it turns red and pulses for the last few seconds */
export function Clock({ left, of, warn = 5 }: { left: number; of: number; warn?: number }) {
  const t = Math.max(0, Math.min(1, left / of))
  return (
    <div className={`gm-clock${left <= warn ? ' is-low' : ''}`} role="timer" aria-label={`${Math.ceil(left)} seconds left`}>
      <i style={{ transform: `scaleX(${t})` }} />
      <span>{Math.ceil(Math.max(0, left))}s</span>
    </div>
  )
}

/** the HUD row: whatever the game shows on the left, then score and best on the right */
export function GameHud({ children, score, best }: { children?: ReactNode; score: number; best: number }) {
  return (
    <div className="gm-hud">
      <span className="gm-hud-left">{children}</span>
      <span>
        score <b className="gm-score">{fmt(score)}</b>
      </span>
      <span className="gm-hud-best">
        best <b className="gm-best">{fmt(best)}</b>
      </span>
    </div>
  )
}

/** a small coloured chip in the HUD: level, streak, multiplier */
export function Chip({ color, children, title }: { color: string; children: ReactNode; title?: string }) {
  return (
    <span className="sg-power gm-chip" style={{ '--c': color } as CSSProperties} title={title}>
      {children}
    </span>
  )
}

/** The start card: the game's name, how to play, and a big start button low on the screen. */
export function GameStart({ title, lines, onStart, children, label = 'start' }: {
  title: string
  lines: string[]
  onStart: () => void
  children?: ReactNode
  label?: string
}) {
  return (
    <div className="gm-card">
      <b className="gm-card-title">{title}</b>
      {lines.map((l) => (
        <span key={l} className="sg-how">
          {l}
        </span>
      ))}
      {children}
      <button className="sx-btn is-strong gm-go" onClick={onStart}>
        <Icon name="play" color="#fff" size={18} />
        {label}
      </button>
    </div>
  )
}

/** The end card: how it went, new best, save score, and play again. */
export function GameEnd({ title, score, isBest, won, line, kit, onAgain }: {
  title: string
  score: number
  isBest: boolean
  won: boolean
  line?: ReactNode
  kit: GameBoard
  onAgain: () => void
}) {
  // a beat before "play again" works, so a fast last tap doesn't restart by accident
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 700)
    if (isBest && score > 0) window.setTimeout(() => sfx.chime(1.2, 0.8), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="gm-card is-end">
      <b className="gm-card-title">{title}</b>
      <span>
        <em className="sg-pts">{fmt(score)}</em> points
        {isBest && score > 0 && (
          <>
            {' · '}
            <em className="sg-new">new best!</em>
          </>
        )}
      </span>
      {line && <span className="sg-how">{line}</span>}
      <SaveScore board={kit.board} score={score} won={won} name={kit.name} setName={kit.setName} onBest={kit.record} />
      <button className="sx-btn is-strong gm-go" onClick={onAgain} disabled={!ready}>
        <Icon name="replay" color="#fff" size={18} />
        play again
      </button>
    </div>
  )
}

export function GameBoardFold({ kit }: { kit: GameBoard }) {
  return <Leaderboard board={kit.board} name={kit.name} />
}
