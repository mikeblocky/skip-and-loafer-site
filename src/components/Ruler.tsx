import { useEffect, useRef } from 'react'
import { useSettings } from '../settings'

/**
 * Reading ruler: a clear band across the screen with the rest gently dimmed, so your eyes keep
 * their place in a line. It follows the mouse, a finger, or keyboard focus. On a phone with no
 * hovering pointer it sits a little above the middle and the page scrolls under it.
 */
export function Ruler() {
  const { ruler } = useSettings()
  const top = useRef<HTMLDivElement>(null)
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ruler) return
    const BAND = 64
    let y = window.innerHeight * 0.42
    let raf = 0
    const draw = () => {
      raf = 0
      const h = window.innerHeight
      const t = Math.max(0, Math.min(h - BAND, y - BAND / 2))
      if (top.current) top.current.style.height = `${t}px`
      if (bottom.current) bottom.current.style.top = `${t + BAND}px`
    }
    const at = (ny: number) => {
      y = ny
      if (!raf) raf = requestAnimationFrame(draw)
    }
    const move = (e: PointerEvent) => at(e.clientY)
    const focus = (e: FocusEvent) => {
      const el = e.target as Element | null
      if (!el?.getBoundingClientRect || el === document.body) return
      const r = el.getBoundingClientRect()
      at(r.top + r.height / 2)
    }
    draw()
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', move, { passive: true })
    document.addEventListener('focusin', focus)
    window.addEventListener('resize', draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', move)
      document.removeEventListener('focusin', focus)
      window.removeEventListener('resize', draw)
    }
  }, [ruler])

  if (!ruler) return null
  return (
    <div className="ruler" aria-hidden="true">
      <div className="ruler-shade ruler-top" ref={top} />
      <div className="ruler-shade ruler-bottom" ref={bottom} />
    </div>
  )
}
