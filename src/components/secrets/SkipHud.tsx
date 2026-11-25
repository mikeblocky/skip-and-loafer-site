import type { CSSProperties, RefObject } from 'react'
import { C } from '../../data'
import { Icon } from '../../icons'
import { fmt, FRIENDS, JOIN_AT, LIVES, POWERS, TIMED, type Timed } from './skipRules'
import { useT } from '../../i18n'

interface Props {
  lives: number
  powers: Record<Timed, number>
  rest: number
  /** the dare running right now, if any */
  goal: { text: string; color: string } | null
  /** the points multiplier past 10k, ready to show ('' = not yet) */
  pace: string
  team: typeof FRIENDS
  won: boolean
  score: number
  best: number
  scoreEl: RefObject<HTMLElement | null>
}

/** Hearts, friends so far, running power-ups, score and best. The loop writes the live score into scoreEl. */
export function SkipHud({ lives, powers, rest, goal, pace, team, won, score, best, scoreEl }: Props) {
  const { t } = useT()
  return (
    <div className="sg-hud">
      <span className="sg-lives" aria-label={t('game.hearts', { n: lives })}>
        {Array.from({ length: LIVES }, (_, i) => (
          <Icon key={i} name="heart" color={i < lives ? C.red : '#e3ddd2'} size={22} />
        ))}
        {powers.goldheart > 0 && <Icon name="heart" color={POWERS.goldheart.color} size={22} className="sg-goldheart" />}
      </span>
      <span className="sg-gang" aria-label={t('sg.friends', { n: team.length, total: JOIN_AT.length })}>
        {/* one dot per friend who can join; it takes their colour once they have */}
        {JOIN_AT.map((_, i) => (
          <i key={i} className={i < team.length ? 'is-in' : ''} style={{ '--c': (team[i] ?? FRIENDS[i]).color } as CSSProperties} />
        ))}
        {won && <b className="sg-made">{t('sg.madeIt')}</b>}
      </span>
      <span className="sg-powers" aria-live="polite">
        {rest > 0 && <span className="sg-power sg-rest">{t('sg.break', { n: rest })}</span>}
        {pace && (
          <span className="sg-power sg-pace" title={t('sg.paceTip')}>
            {t('sg.pace', { n: pace })}
          </span>
        )}
        {goal && (
          <span className="sg-power sg-goal" style={{ '--c': goal.color } as CSSProperties} title={t('sg.dareTip')}>
            <Icon name="star" color={goal.color} size={14} />
            {goal.text}
          </span>
        )}
        {TIMED.filter((k) => powers[k] > 0).map((k) => (
          <span key={k} className="sg-power" style={{ '--c': POWERS[k].color } as CSSProperties} title={t(POWERS[k].label)}>
            <Icon name={POWERS[k].icon} color={POWERS[k].color} size={16} />
            {t('game.secs', { n: Math.ceil(powers[k]) })}
          </span>
        ))}
      </span>
      <span>
        {t('game.score')} <b className="sg-score" ref={scoreEl}>{fmt(score)}</b>
      </span>
      <span>
        {t('game.best')} <b className="sg-best">{fmt(best)}</b>
      </span>
    </div>
  )
}
