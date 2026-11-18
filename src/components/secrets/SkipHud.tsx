import type { CSSProperties, RefObject } from 'react'
import { C } from '../../data'
import { Icon } from '../../icons'
import { FRIENDS, JOIN_AT, LIVES, POWERS, TIMED, type Timed } from './skipRules'

interface Props {
  lives: number
  powers: Record<Timed, number>
  rest: number
  team: typeof FRIENDS
  won: boolean
  score: number
  best: number
  scoreEl: RefObject<HTMLElement | null>
}

/** Hearts, friends so far, running power-ups, score and best. The loop writes the live score into scoreEl. */
export function SkipHud({ lives, powers, rest, team, won, score, best, scoreEl }: Props) {
  return (
    <div className="sg-hud">
      <span className="sg-lives" aria-label={`${lives} hearts left`}>
        {Array.from({ length: LIVES }, (_, i) => (
          <Icon key={i} name="heart" color={i < lives ? C.red : '#e3ddd2'} size={22} />
        ))}
        {powers.goldheart > 0 && <Icon name="heart" color={POWERS.goldheart.color} size={22} className="sg-goldheart" />}
      </span>
      <span className="sg-gang" aria-label={`${team.length} of ${JOIN_AT.length} friends`}>
        {FRIENDS.map((f, i) => (
          <i key={f.id} className={i < team.length ? 'is-in' : ''} style={{ '--c': (team[i] ?? f).color } as CSSProperties} />
        ))}
        {won && <b className="sg-made">made it!</b>}
      </span>
      <span className="sg-powers" aria-live="polite">
        {rest > 0 && <span className="sg-power sg-rest">break {rest}s</span>}
        {TIMED.filter((k) => powers[k] > 0).map((k) => (
          <span key={k} className="sg-power" style={{ '--c': POWERS[k].color } as CSSProperties} title={POWERS[k].label}>
            <Icon name={POWERS[k].icon} color={POWERS[k].color} size={16} />
            {Math.ceil(powers[k])}s
          </span>
        ))}
      </span>
      <span>
        score <b className="sg-score" ref={scoreEl}>{score}</b>
      </span>
      <span>
        best <b className="sg-best">{best}</b>
      </span>
    </div>
  )
}
