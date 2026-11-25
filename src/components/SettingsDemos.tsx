import type { CSSProperties } from 'react'
import { C } from '../data'
import { Icon } from '../icons'
import { useSettings } from '../settings'
import { useT } from '../i18n'

/**
 * Little moving pictures at the top of some Settings sections. Each one shows what that
 * section's options do, and changes live as you change them. They're decoration, so screen
 * readers skip them. Under "reduce motion" they hold still, which is the demonstration too.
 */

/** a ball that bounces along and a star that spins: both stop when motion is reduced */
export function MotionDemo() {
  return (
    <div className="demo demo-motion" aria-hidden="true">
      <span className="dm-ground" />
      <span className="dm-ball" style={{ background: C.violet }} />
      <span className="dm-spin">
        <Icon name="star" color={C.yellow} size={26} />
      </span>
      <span className="dm-spin dm-spin-2">
        <Icon name="heart" color={C.pink} size={22} />
      </span>
    </div>
  )
}

/** pairs that colour blindness tends to merge, a grey caption, a link and the cursor */
export function SeeingDemo() {
  const { underline, bigCursor, cursors } = useSettings()
  const { t } = useT()
  const pairs: [string, string][] = [
    [C.red, C.green],
    [C.blue, C.violet],
    [C.yellow, C.green],
    [C.pink, C.sky],
  ]
  return (
    <div className="demo demo-seeing" aria-hidden="true">
      <div className="ds-pairs">
        {pairs.map(([a, b], i) => (
          <span key={i} className="ds-pair" style={{ animationDelay: `${i * 0.25}s` }}>
            <i style={{ background: a }} />
            <i style={{ background: b }} />
          </span>
        ))}
      </div>
      <div className="ds-text">
        <span className="ds-muted">{t('demo.released')}</span>
        <span className={`ds-link${underline ? ' is-under' : ''}`}>{t('demo.read')}</span>
      </div>
      {cursors && (
        <span className={`ds-cursor${bigCursor ? ' is-big' : ''}`}>
          <svg viewBox="1 1 24 24">
            <path
              d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"
              fill="#F53D84"
              stroke="#B3175A"
              strokeWidth="1.9"
              strokeLinejoin="round"
              paintOrder="stroke"
            />
          </svg>
        </span>
      )}
    </div>
  )
}

/** a few lines of text in the chosen font and spacing, with the ruler gliding down them */
export function ReadingDemo() {
  const { ruler } = useSettings()
  const { t } = useT()
  return (
    <div className="demo demo-reading" aria-hidden="true">
      <p className="dr-text">{t('demo.passage')}</p>
      {ruler && <span className="dr-ruler" />}
    </div>
  )
}

/** a busy little page: doodles float round the countdown and a card pops up now and then */
export function FocusDemo() {
  const { calm, quietNews } = useSettings()
  const { t } = useT()
  const doodles: { name: 'star' | 'heart' | 'note' | 'sakura' | 'cloud'; c: string; x: number; y: number; d: number }[] = [
    { name: 'star', c: C.yellow, x: 8, y: 14, d: 0 },
    { name: 'heart', c: C.pink, x: 84, y: 10, d: 0.6 },
    { name: 'note', c: C.blue, x: 14, y: 64, d: 1.1 },
    { name: 'sakura', c: C.violet, x: 80, y: 62, d: 0.3 },
    { name: 'cloud', c: C.sky, x: 48, y: 4, d: 0.9 },
  ]
  return (
    <div className={`demo demo-focus${calm ? ' is-calm' : ''}`} aria-hidden="true">
      {doodles.map((d) => (
        <span
          key={d.name}
          className="df-doodle"
          style={{ left: `${d.x}%`, top: `${d.y}%`, animationDelay: `${d.d}s` } as CSSProperties}
        >
          <Icon name={d.name} color={d.c} size={20} />
        </span>
      ))}
      <div className="df-card">
        <b>29</b> {t('cd.days')}
      </div>
      {quietNews ? (
        <span className="df-bell">
          <Icon name="bunting" color={C.blue} size={16} />
          <i />
        </span>
      ) : (
        <div className="df-pop">
          <Icon name="bunting" color="#fff" size={14} /> {t('news.title')}
        </div>
      )}
    </div>
  )
}
