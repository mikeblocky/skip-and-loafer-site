import { useEffect, useState } from 'react'
import { C } from '../../data'
import { Icon } from '../../icons'
import { sfx } from '../../sfx'
import { fmt } from './skipRules'

/** the name you saved scores under last, shared by every game's board */
export const NAME_KEY = 'sl-skip-name'
export const API = '/api/leaderboard'

/** which board: Skip to School's, or one of the other hidden games */
export type GameId = 'skip' | 'gacha' | 'quiz' | 'poll'
export const boardUrl = (game: GameId) => (game === 'skip' ? API : `${API}?game=${game}`)

export interface Entry {
  name: string
  score: number
  won: boolean
}

export function useLeaderboard(game: GameId = 'skip') {
  const [entries, setEntries] = useState<Entry[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'offline'>('loading')
  useEffect(() => {
    let alive = true
    fetch(boardUrl(game))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { entries: Entry[] }) => alive && (setEntries(d.entries), setState('ok')))
      .catch(() => alive && setState('offline'))
    return () => {
      alive = false
    }
  }, [game])
  return { game, entries, setEntries, state, setState }
}
export type Board = ReturnType<typeof useLeaderboard>

export function savedName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

/** The fold-out list of top scores, with your own name picked out. */
export function Leaderboard({ board, name }: { board: Board; name: string }) {
  const [boardOpen, setBoardOpen] = useState(false)
  const id = `${board.game}-leaderboard`
  return (
    <>
      <button
        type="button"
        className="sx-btn sg-board-toggle"
        aria-expanded={boardOpen}
        aria-controls={id}
        onClick={() => setBoardOpen((open) => !open)}
      >
        Leaderboard
      </button>
      <section id={id} className="sg-board" aria-label="Leaderboard" hidden={!boardOpen}>
        {board.state === 'loading' && <p className="sx-note">loading…</p>}
        {board.state === 'offline' && <p className="sx-note">the leaderboard is offline right now. your best still saves on this device.</p>}
        {board.state === 'ok' && board.entries.length === 0 && <p className="sx-note">no scores yet. be the first!</p>}
        {board.state === 'ok' && board.entries.length > 0 && (
          <ol>
            {board.entries.map((e, i) => (
              <li key={e.name + i} className={e.name.toLowerCase() === name.trim().toLowerCase() ? 'is-you' : ''}>
                <span className="sg-rank">{i + 1}</span>
                <span className="sg-name">{e.name}</span>
                {e.won && <Icon name="star" color={C.yellow} size={14} />}
                <b>{fmt(e.score)}</b>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  )
}

/**
 * "your name · save score" for the end screen of the newer games (Skip to School has its own,
 * inside its road). onBest hears the best the board keeps under your name.
 */
export function SaveScore({ board, score, won, name, setName, onBest }: {
  board: Board
  score: number
  won: boolean
  name: string
  setName: (n: string) => void
  onBest?: (n: number) => void
}) {
  const [save, setSave] = useState<{ state: 'idle' | 'saving' | 'saved' | 'error'; rank?: number | null; msg?: string }>({ state: 'idle' })
  if (score <= 0 || board.state === 'offline') return null

  const submit = async () => {
    const n = name.trim()
    if (!n || save.state === 'saving') return
    try {
      localStorage.setItem(NAME_KEY, n)
    } catch {
      /* private mode */
    }
    setSave({ state: 'saving' })
    try {
      const r = await fetch(boardUrl(board.game), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, score, won }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'could not save')
      board.setEntries(d.entries)
      board.setState('ok')
      setSave({ state: 'saved', rank: d.rank })
      if (Number(d.best)) onBest?.(Number(d.best))
      sfx.chime(1.1, 0.7)
    } catch (e) {
      setSave({ state: 'error', msg: e instanceof Error ? e.message : 'could not save' })
    }
  }

  return (
    <form
      className="sg-save"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {save.state === 'saved' ? (
        <span className="sg-saved">saved{save.rank ? ` · you're #${save.rank}` : ''}</span>
      ) : (
        <>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
            placeholder="your name"
            aria-label="Your name for the leaderboard"
            autoComplete="nickname"
            enterKeyHint="done"
          />
          <button className="sx-btn is-strong" disabled={!name.trim() || save.state === 'saving'}>
            {save.state === 'saving' ? 'saving…' : 'save score'}
          </button>
        </>
      )}
      {save.state === 'error' && <span className="sg-err">{save.msg}</span>}
    </form>
  )
}
