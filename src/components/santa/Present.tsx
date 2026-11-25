import { forwardRef, type CSSProperties } from 'react'
import { Icon } from '../../icons'
import { RIBBON, type Inside } from '../../santa'

/**
 * A wrapped present drawn in HTML: a box, a lid, a ribbon both ways and a bow. Wrapped by
 * default; the workshop and the unwrapping animate its parts (`.pr-lid`, `.pr-rib`, `.pr-bow`,
 * `.pr-item`) with gsap. `inside` puts the thing that's in it above the box, ready to drop in or
 * to come out.
 */
export const Present = forwardRef<
  HTMLDivElement,
  { wrap: string; size: number; inside?: Inside; ribbon?: string; className?: string; style?: CSSProperties }
>(function Present({ wrap, size, inside, ribbon, className, style }, ref) {
  const rib = ribbon ?? RIBBON[wrap] ?? '#FBBA14'
  return (
    <div
      ref={ref}
      className={`pr${className ? ` ${className}` : ''}`}
      style={{ '--w': wrap, '--r': rib, '--s': `${size}px`, ...style } as CSSProperties}
      aria-hidden="true"
    >
      {inside && (
        <div className="pr-item">
          <Icon name={inside} color={wrap === '#FBBA14' ? '#E39400' : wrap} size={Math.round(size * 0.42)} />
        </div>
      )}
      <div className="pr-body">
        <i className="pr-rib" />
      </div>
      <div className="pr-lid">
        <i className="pr-rib" />
        <span className="pr-bow">
          <i />
          <i />
          <b />
        </span>
      </div>
    </div>
  )
})
