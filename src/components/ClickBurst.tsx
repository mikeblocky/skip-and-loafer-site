import { useEffect } from 'react'
import { RAINBOW } from '../data'
import { reducedMotion, settings } from '../settings'

/**
 * A little pop wherever you click: a ring and a handful of dots in the site's colours. Left out
 * where you tap all the time (the game), in text fields, and for anyone who prefers less motion.
 */
const SKIP = '.sg-field, .sg-pads, input, textarea, [contenteditable]'
const DOTS = 7

export function ClickBurst() {
  useEffect(() => {
    const layer = document.createElement('div')
    layer.className = 'bursts'
    layer.setAttribute('aria-hidden', 'true')
    document.body.appendChild(layer)
    let turn = 0

    const pop = (e: PointerEvent) => {
      if (e.button !== 0) return
      if (reducedMotion() || !settings.get().bursts) return
      if ((e.target as Element | null)?.closest?.(SKIP)) return
      // never more than a few at once, however fast someone clicks
      if (layer.childElementCount > 6) layer.firstElementChild?.remove()
      const b = document.createElement('div')
      b.className = 'burst'
      b.style.left = `${e.clientX}px`
      b.style.top = `${e.clientY}px`
      const lead = RAINBOW[turn++ % RAINBOW.length]
      const ring = document.createElement('b')
      ring.style.setProperty('--c', lead)
      b.appendChild(ring)
      const spin = Math.random() * Math.PI * 2
      for (let i = 0; i < DOTS; i++) {
        const a = spin + (i / DOTS) * Math.PI * 2
        const r = 30 + Math.random() * 14
        const dot = document.createElement('i')
        dot.style.setProperty('--c', RAINBOW[(turn + i) % RAINBOW.length])
        dot.style.setProperty('--dx', `${Math.cos(a) * r}px`)
        dot.style.setProperty('--dy', `${Math.sin(a) * r}px`)
        dot.style.setProperty('--s', String(0.7 + Math.random() * 0.6))
        b.appendChild(dot)
      }
      layer.appendChild(b)
      window.setTimeout(() => b.remove(), 600)
    }
    window.addEventListener('pointerdown', pop, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', pop)
      layer.remove()
    }
  }, [])
  return null
}
