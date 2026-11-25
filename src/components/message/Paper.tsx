import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { gsap } from '../../gsap'
import { Icon, type IconName } from '../../icons'
import { useT } from '../../i18n'

// handwriting sizes, biggest first: [font size, line spacing] in px. Longer letters write smaller.
const HAND = [
  [18, 29],
  [16.5, 27],
  [15, 24],
  [14, 22],
  [13, 20],
  // only the narrowest phones get this small, and only for the longest letters
  [12, 19],
  [11, 17],
] as const

export function Sheet({
  icon,
  text,
  from,
  date,
  fit,
  onFit,
  children,
}: {
  icon: IconName
  text?: string
  from?: string | null
  date?: string
  /** what to re-measure on (the draft while writing); defaults to the text */
  fit?: string
  /** told whether the words fit on the page even at the smallest size */
  onFit?: (fits: boolean) => void
  children?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useT()
  // pick the biggest handwriting that still fits on one page (ruled lines follow it)
  useLayoutEffect(() => {
    const el = ref.current
    const body = el?.querySelector<HTMLElement>('.lt-text')
    if (!el || !body) return
    // sizes are for a 340px sheet and scale with it, so wrapping is the same on any screen
    const k = el.offsetWidth / 340
    let at = -1
    for (let i = 0; i < HAND.length; i++) {
      const [fs, lh] = HAND[i]
      el.style.setProperty('--fs', `${fs * k}px`)
      el.style.setProperty('--lh', `${lh * k}px`)
      if (body.scrollHeight <= body.clientHeight + 1) {
        at = i
        break
      }
    }
    // writers stop one size early, so a reader always has a smaller one in reserve for rounding
    onFit?.(at !== -1 && at < HAND.length - 1)
  }, [fit ?? text])

  return (
    <div className="lt-sheet" ref={ref}>
      <span className="lt-stamp" aria-hidden="true">
        <Icon name={icon} color="#fff" size={22} />
      </span>
      <div className="lt-head">
        {t('msg.dear')}
        {/* the space is for copying; it takes no room on the page */}
        {date && <span className="lt-date"><span className="lt-gap"> </span>{date}</span>}
      </div>
      {children ?? (
        <>
          <div className="lt-text">{text}</div>
          <div className="lt-sign">
            — <span className={from ? '' : 'is-anon'}>{from || t('msg.anon')}</span>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * The sheet cut into thirds so the top and bottom can fold over the middle. Each third holds a
 * whole copy of the sheet, so once it lies flat (`selectable`) one invisible copy is laid over
 * all three: selecting reads like a highlighter on the paper and copies the letter just once.
 */
export function Folding({ sheet, selectable = false }: { sheet: ReactNode; selectable?: boolean }) {
  // middle first: the bottom folds over it, then the top over both
  return (
    <div className="lt">
      {selectable && <div className="lt-copy">{sheet}</div>}
      {[1, 2, 0].map((i) => (
        <div key={i} className={`lt-p lt-p${i}`}>
          <div className="lt-face lt-front">
            <div className="lt-clip" style={{ top: `calc(var(--ph) * ${-i})` }}>
              {sheet}
            </div>
            {i === 1 && <i className="lt-crease" />}
            <i className="lt-shade" />
          </div>
          <div className="lt-face lt-back">
            <i className="lt-shade" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Envelope({ label, icon }: { label: string; icon: IconName }) {
  return (
    <>
      <div className="env-back" />
      <div className="env-front">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path className="env-pocket" d="M0 0 L46 52 Q50 56 54 52 L100 0 V100 H0 Z" />
          <path className="env-crease" d="M0 100 L41 60 M100 100 L59 60" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="env-label">{label}</span>
      </div>
      <div className="env-flap">
        <svg className="flap-out" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0 H100 L56 54 Q50 60 44 54 Z" />
        </svg>
        <svg className="flap-in" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0 H100 L56 54 Q50 60 44 54 Z" />
        </svg>
      </div>
      <div className="env-seal" aria-hidden="true">
        <span className="seal-h seal-l">
          <Icon name={icon} color="#fff" size={20} />
        </span>
        <span className="seal-h seal-r">
          <Icon name={icon} color="#fff" size={20} />
        </span>
      </div>
    </>
  )
}

/** Turns a third of the sheet, darkening whichever face is turned away from the light. */
export function turn(tl: gsap.core.Timeline, panel: Element, to: number, at: number, dur = 0.72) {
  const [front, back] = panel.querySelectorAll<HTMLElement>('.lt-shade')
  tl.to(
    panel,
    {
      rotationX: to,
      duration: dur,
      ease: 'power2.inOut',
      onUpdate() {
        const a = (gsap.getProperty(panel, 'rotationX') as number) * (Math.PI / 180)
        const s = Math.abs(Math.sin(a))
        front.style.opacity = String(s * 0.42)
        back.style.opacity = String(0.03 + s * 0.3)
      },
    },
    at,
  )
}

export const parts = (root: HTMLElement) => ({
  q: gsap.utils.selector(root),
  holder: root.querySelector<HTMLElement>('.lt-holder')!,
  env: Array.from(root.querySelectorAll<HTMLElement>('.env-back, .env-front, .env-flap, .env-seal')),
  flap: root.querySelector<HTMLElement>('.env-flap')!,
  seal: root.querySelector<HTMLElement>('.env-seal')!,
})
