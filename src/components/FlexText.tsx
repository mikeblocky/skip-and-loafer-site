import { useEffect, useRef, type CSSProperties, type ElementType } from 'react'
export interface Word {
  t: string
  w: number
  oblique?: boolean
  /** colour for this word; defaults to the heading's colour */
  c?: string
}

/**
 * Letters near the pointer swing toward the opposite end of the weight axis and lose
 * some roundness, then ease back.
 */
function useWeightField(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el || window.matchMedia('(pointer: coarse)').matches) return
    const letters = Array.from(el.querySelectorAll<HTMLElement>('.fl'))
    const state = letters.map((l) => {
      const base = Number(l.dataset.w)
      return { base, cur: base, rond: 100 }
    })
    let px = -9999
    let py = -9999
    let raf = 0
    let still = 0
    const loop = () => {
      let moving = false
      letters.forEach((l, i) => {
        const s = state[i]
        const r = l.getBoundingClientRect()
        const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2))
        const f = Math.max(0, 1 - d / 200) ** 2
        const far = s.base >= 600 ? 150 : 900
        const target = s.base + (far - s.base) * f
        const rondT = 100 - 70 * f
        s.cur += (target - s.cur) * 0.16
        s.rond += (rondT - s.rond) * 0.16
        if (Math.abs(target - s.cur) > 0.4) moving = true
        l.style.fontVariationSettings = `'wght' ${s.cur.toFixed(1)}, 'ROND' ${s.rond.toFixed(1)}`
      })
      still = moving ? 0 : still + 1
      raf = still > 30 ? 0 : requestAnimationFrame(loop)
    }
    const wake = () => {
      still = 0
      if (!raf) raf = requestAnimationFrame(loop)
    }
    const onMove = (e: PointerEvent) => {
      px = e.clientX
      py = e.clientY
      wake()
    }
    const onLeave = () => {
      px = py = -9999
      wake()
    }
    window.addEventListener('pointermove', onMove)
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [root])
}

export function FlexText({
  as: Tag = 'h1',
  words,
  className,
  children,
  ...rest
}: {
  as?: ElementType
  words: Word[]
  className?: string
  children?: React.ReactNode
  [k: `data-${string}`]: unknown
}) {
  const ref = useRef<HTMLElement>(null)
  useWeightField(ref)
  return (
    <Tag ref={ref} className={`flex-text ${className ?? ''}`} aria-label={words.map((w) => w.t).join(' ')} {...rest}>
      {words.map((wd, wi) => (
        <span key={wi} className={`fw${wd.oblique ? ' fw-oblique' : ''}`} aria-hidden="true">
          {wd.t.split('').map((ch, k) => (
            <span
              key={k}
              className="fl"
              data-w={wd.w}
              style={{ color: wd.c, fontVariationSettings: `'wght' ${wd.w}, 'ROND' 100` } as CSSProperties}
            >
              {ch}
            </span>
          ))}
        </span>
      ))}
      {children}
    </Tag>
  )
}
