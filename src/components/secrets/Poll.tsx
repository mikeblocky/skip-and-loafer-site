import { useEffect, useState, type CSSProperties } from 'react'
import { CHARACTERS } from '../../data'
import { sfx } from '../../sfx'
import { secrets } from '../../secrets'

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

/**
 * A one-question poll. The vote is kept on this device only, so it shows your own pick rather
 * than pretending to have everyone's results.
 */
export function Poll() {
  const [vote, setVote] = useState(secrets.get().vote)
  useEffect(() => secrets.subscribe(() => setVote(secrets.get().vote)), [])

  const pick = (id: string, i: number) => {
    secrets.update((st) => ({ ...st, vote: id }))
    sfx.chime(0.9 + i * 0.06, 0.8)
  }
  const chosen = CHARACTERS.find((c) => c.id === vote)

  return (
    <div className="poll">
      <p className="poll-q">who would you walk to school with?</p>
      <div className="poll-grid" role="radiogroup" aria-label="Who would you walk to school with?">
        {CHARACTERS.map((c, i) => (
          <button
            key={c.id}
            className={`poll-opt${vote === c.id ? ' is-picked' : ''}${vote && vote !== c.id ? ' is-dim' : ''}`}
            role="radio"
            aria-checked={vote === c.id}
            onClick={() => pick(c.id, i)}
            onPointerEnter={() => sfx.blip(1 + i * 0.05)}
            style={{ '--c': c.color } as CSSProperties}
          >
            <span className="poll-face">
              <img src={c.src} alt="" draggable={false} />
            </span>
            <b>{c.name}</b>
          </button>
        ))}
      </div>
      <p className="poll-react" aria-live="polite" key={vote ?? 'none'}>
        {chosen ? (
          <>
            <b style={{ color: chosen.color }}>{chosen.name}!</b> {REACTIONS[chosen.id]}
          </>
        ) : (
          'pick one. you can change your mind any time.'
        )}
      </p>
      <p className="sx-note">your vote is saved on this device only.</p>
    </div>
  )
}
