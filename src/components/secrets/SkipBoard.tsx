import { useEffect, useState } from 'react'
import { C } from '../../data'
import { Icon } from '../../icons'
import { fmt } from './skipRules'

export const NAME_KEY = 'sl-skip-name'
export const API = '/api/leaderboard'

export interface Entry {
  name: string
  score: number
  won: boolean
}

export function useLeaderboard() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'offline'>('loading')
  useEffect(() => {
    let alive = true
    fetch(API)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { entries: Entry[] }) => alive && (setEntries(d.entries), setState('ok')))
      .catch(() => alive && setState('offline'))
    return () => {
      alive = false
    }
  }, [])
  return { entries, setEntries, state, setState }
}
export type Board = ReturnType<typeof useLeaderboard>

/** The fold-out list of top scores, with your own name picked out. */
export function Leaderboard({ board, name }: { board: Board; name: string }) {
  const [boardOpen, setBoardOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="sx-btn sg-board-toggle"
        aria-expanded={boardOpen}
        aria-controls="sg-leaderboard"
        onClick={() => setBoardOpen((open) => !open)}
      >
        Leaderboard
      </button>
      <section id="sg-leaderboard" className="sg-board" aria-label="Leaderboard" hidden={!boardOpen}>
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
