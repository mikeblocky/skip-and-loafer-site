/**
 * Skip to School: dares. They only come with milestones (a friend catching up, a new level
 * after the win, a new page): whoever brought the moment dares you to do something on the road,
 * to their own leitmotif. Grab a handful of stars, go a while without a bump or a skip, clear a
 * run of hazards, stay in the air. Meet it for bonus points and a little gift; miss it and
 * nothing bad happens. Targets follow the difficulty curve, so they stay a stretch all run.
 */
import { lerp } from './difficulty'
import type { Power } from './skipRules'

export type GoalKind = 'stars' | 'clean' | 'grounded' | 'clear' | 'air' | 'power'

export interface Goal {
  kind: GoalKind
  /** what counts as done, and how far along it is */
  need: number
  have: number
  /** seconds left to do it (Infinity for the "keep it up for a while" kinds) */
  left: number
  /** who dared you (character id) */
  by: string
}

/** while a star dare runs, this extra share of spawns turn into stars */
export const STAR_BOOST = 0.32

/** how each dare is put, with {n} for the target */
const DARES: Record<GoalKind, string[]> = {
  stars: ['bet you can’t grab {n} stars!', 'race you to {n} stars!'],
  clean: ['{n} seconds without a single bump. go!', 'try not to trip for {n} seconds'],
  grounded: ['no skipping for {n} seconds. hops only!', 'keep it simple: {n}s of single hops'],
  clear: ['clear {n} things in a row, no bumps!', 'dodge the next {n}, clean'],
  air: ['spend {n} seconds in the air!', 'pretend the road is lava: {n}s airborne'],
  power: ['grab a power-up, quick!', 'next power-up is yours, don’t miss it!'],
}

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]

/** a fresh dare at difficulty d, never the same kind as the last one */
export function makeGoal(d: number, last: GoalKind | null, by: string): Goal {
  const kinds = (Object.keys(DARES) as GoalKind[]).filter((k) => k !== last)
  const kind = pick(kinds)
  const r = Math.round
  const g = (need: number, left: number): Goal => ({ kind, need, have: 0, left, by })
  switch (kind) {
    case 'stars':
      return g(r(lerp(3, 6, d)), r(lerp(20, 15, d)))
    case 'clean':
      return g(r(lerp(15, 30, d) / 5) * 5, Infinity)
    case 'grounded':
      return g(r(lerp(10, 20, d) / 5) * 5, Infinity)
    case 'clear':
      return g(r(lerp(8, 18, d)), 30)
    case 'air':
      return g(r(lerp(4, 7, d)), r(lerp(16, 14, d)))
    case 'power':
      return g(1, 22)
  }
}

/** how the friend puts it */
export const dareText = (goal: Goal) => pick(DARES[goal.kind]).replace('{n}', String(goal.need))

/** the short chip in the HUD while it runs */
export function goalChip(goal: Goal) {
  const have = Math.floor(goal.have)
  const time = Number.isFinite(goal.left) ? ` · ${Math.ceil(goal.left)}s` : ''
  switch (goal.kind) {
    case 'stars':
      return `stars ${have}/${goal.need}${time}`
    case 'clean':
      return `no bumps ${have}/${goal.need}s`
    case 'grounded':
      return `no skips ${have}/${goal.need}s`
    case 'clear':
      return `clear ${have}/${goal.need}${time}`
    case 'air':
      return `air time ${have}/${goal.need}s${time}`
    case 'power':
      return `grab a power-up${time}`
  }
}

/**
 * Meeting a dare also switches on a boost, straight away, that fits what you just did: stars
 * bring the star magnet, a clean stretch earns the lucky shield, holding back on skips unlocks
 * triple skip, a long dodge streak brings the golden heart, air time rains a star shower, and
 * grabbing a power-up doubles your points. A boost already running gets topped up instead.
 */
export const GOAL_BOOST: Record<GoalKind, { power: Power; name: string }> = {
  stars: { power: 'sun', name: 'star magnet' },
  clean: { power: 'clover', name: 'lucky shield' },
  grounded: { power: 'bolt', name: 'triple skip' },
  clear: { power: 'goldheart', name: 'golden heart' },
  air: { power: 'sparkle', name: 'star shower' },
  power: { power: 'note', name: 'double points' },
}

/** bonus points for meeting a dare: worth more the harder the road */
export const goalReward = (d: number) => Math.round(lerp(150, 600, d) / 10) * 10
