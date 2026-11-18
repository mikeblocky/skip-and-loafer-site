import { useEffect, useState, type CSSProperties } from 'react'
import { C } from '../../data'
import type { IconName } from '../../icons'
import { safeColor } from '../../letterRules'

/** Every size the animations need, from the sheet's width. The CSS reads the same numbers. */
export function geometry(vw: number) {
  const W = Math.round(Math.max(260, Math.min(340, vw - 48)))
  const H = Math.round(W * 1.32)
  const ph = H / 3 // one third: the folded letter
  const EW = W + 28
  const EH = Math.round(ph + 30)
  const ET = Math.round(ph + 14) // envelope top inside the post box
  const FH = Math.round(EH * 0.6)
  return {
    W,
    H,
    ph,
    EW,
    EH,
    ET,
    FH,
    /** letter offsets: tucked in the pocket, held just above it, and pulled out of it */
    IN: ET + 13 - ph,
    LIFT: ET - 10 - 2 * ph,
    OUT: ET - 6 - 2 * ph,
  }
}
export type Geo = ReturnType<typeof geometry>

export function useGeo() {
  const [g, set] = useState(() => geometry(window.innerWidth))
  useEffect(() => {
    const on = () => set((p) => {
      const n = geometry(window.innerWidth)
      return n.W === p.W ? p : n
    })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return g
}

export const vars = (g: Geo, color: string) =>
  ({
    '--W': `${g.W}px`,
    '--H': `${g.H}px`,
    '--ph': `${g.ph}px`,
    '--EW': `${g.EW}px`,
    '--EH': `${g.EH}px`,
    '--ET': `${g.ET}px`,
    '--FH': `${g.FH}px`,
    '--ec': color,
    '--ac': color === C.yellow ? C.pink : C.yellow,
    '--et': paper(color).ink,
    // the letter sheet's scale: its 340px design drawn at this width
    '--k': String(g.W / 340),
  }) as CSSProperties

/** Each paper has its own icon (stamp, seal, picker) and an ink dark enough to read on white. */
export const PAPER: Record<string, { name: string; icon: IconName; ink: string }> = {
  '#F53D84': { name: 'Sakura', icon: 'sakura', ink: '#F53D84' },
  '#246BE8': { name: 'Star', icon: 'star', ink: '#246BE8' },
  '#FBBA14': { name: 'Sun', icon: 'sun', ink: '#E39400' },
  '#12B266': { name: 'Clover', icon: 'clover', ink: '#00A65A' },
  '#F86E1A': { name: 'Flame', icon: 'flame', ink: '#F86E1A' },
  '#7A45E0': { name: 'Moon', icon: 'moon', ink: '#7A45E0' },
}
export const paper = (c: string) => PAPER[safeColor(c)]

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
export const dateOf = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
