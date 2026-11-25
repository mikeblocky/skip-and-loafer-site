import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '../../icons'
import { C } from '../../data'
import { useT } from '../../i18n'
import type { Inside } from '../../santa'

/** ink that reads on a paper colour (the yellow needs a deeper one) */
export const inkOn = (wrap: string) => (wrap === C.yellow ? '#E39400' : wrap)

/**
 * The outside of a Secret Santa letter: an envelope in its paper colour, the little thing
 * tucked inside shown as the stamp, and who it's for. Fills whatever box it's put in.
 */
export function LetterBack({ wrap, inside, to, children }: { wrap: string; inside: Inside; to: string | null; children?: ReactNode }) {
  const { t } = useT()
  return (
    <div className="sv-back" style={{ '--w': wrap } as CSSProperties}>
      <i className="sv-flap" aria-hidden="true" />
      <span className="sv-stamp" aria-hidden="true">
        <Icon name={inside} color="#fff" size="62%" />
      </span>
      <span className={`sv-addr${to ? ' is-named' : ''}`}>
        <small>{t('santa.to')}</small> {to ?? t('santa.toEveryone')}
      </span>
      {children}
    </div>
  )
}

/** The 3D holder: a front and a back, turned by rotating `.sv-in` (gsap) round the Y axis. */
export function Flip({ front, back, reader, className, style }: { front: ReactNode; back: ReactNode; reader?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <div className={`sv-card${className ? ` ${className}` : ''}`} style={style}>
      <div className={`sv-in ${reader ? 'is-reader' : 'is-writer'}`}>
        <div className="sv-face sv-face-front">{front}</div>
        <div className="sv-face sv-face-back">{back}</div>
      </div>
    </div>
  )
}
