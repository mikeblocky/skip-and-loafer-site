import { C, CHARACTERS } from '../../data'
import type { IconName } from '../../icons'
import { TUNE, difficulty, lerp, stage } from './difficulty'

/** every this many points, the road turns to a freshly generated page with a new leader */
export const PAGE_EVERY = 10000

/** Things on the road: the site's own stickers. */
export const GROUND: { name: IconName; color: string }[] = [
  { name: 'onigiri', color: C.ink },
  { name: 'umbrella', color: C.blue },
  { name: 'watermelon', color: C.green },
  { name: 'basket', color: C.orange },
  { name: 'suitcase', color: C.violet },
]
/** Paper doodles drifting in the background. */
export const DOODLES: IconName[] = ['cloud', 'star', 'note', 'heart', 'sakura', 'moon', 'sun', 'clover']

// The game is laid out in a fixed 300-unit-tall world, then scaled to fit the field, so every
// size and distance stays in proportion however big the screen is.
export const WORLD_H = 300
export const MIN_WORLD_W = 420 // never show less road ahead than this
export const FLOOR = 46 // the ink line, units from the bottom
export const PLAYER_H = 96
export const FRIEND_H = 86
export const FRIEND_GAP = 30
export const PX = 210 // Mitsumi's left edge: room behind her for the whole gang
export const GRAVITY = 1900
// A single hop peaks ~88 units with plenty of hang time: clears the clutter (36–52 tall) while
// Mitsumi's head (top ~164) stays under the paper planes (lowest ~184). Skipping mid-air lifts
// her to ~168, into their lane.
export const JUMP = 580
export const SKIP = 550
/** a tap this soon before landing still hops, the moment she touches down */
export const BUFFER = 0.14
export const START_SPEED = TUNE.speed.start
/** a single hop's time in the air (no skip), under a gravity multiplier */
export const airTime = (grav = 1) => (2 * JUMP) / (GRAVITY * grav)
export const LIVES = 3
export const POOL = 24

/**
 * Power-ups, each one of the site's stickers. Every pickup floats low enough to grab by running
 * through it or with a single hop (bottoms 15–95 units up; a hop reaches ~168).
 */
export const POWERS: Record<string, { icon: IconName; color: string; label: string; secs: number }> = {
  clover: { icon: 'clover', color: C.green, label: 'lucky shield!', secs: 6 },
  note: { icon: 'note', color: C.violet, label: 'double points!', secs: 8 },
  sun: { icon: 'sun', color: C.amber, label: 'star magnet!', secs: 7 },
  bolt: { icon: 'bolt', color: C.orange, label: 'triple skip!', secs: 8 },
  sparkle: { icon: 'sparkle', color: C.pink, label: 'star shower!', secs: 0 },
  // a temporary 4th heart: soaks up the next hit, or fades when its time runs out
  goldheart: { icon: 'heart', color: '#FFB300', label: 'golden heart: +1 for a while!', secs: 12 },
}
export type Power = 'clover' | 'note' | 'sun' | 'bolt' | 'sparkle' | 'goldheart'
export const TIMED = ['clover', 'note', 'sun', 'bolt', 'goldheart'] as const
export type Timed = (typeof TIMED)[number]
export const isPower = (k: string): k is Power => k in POWERS

export const FRIENDS = CHARACTERS.filter((c) => c.id !== 'mitsumi')
/** score at which each friend catches up; when the last one joins, you've won */
export const JOIN_AT = [70, 170, 300, 460, 650, 870]
/** after the win, the band remixes (and calls out a new level) every this many points */
const LEVEL_AFTER_WIN = 900
/** every so often, a breather: no hazards for a few seconds */
export const BREAK_EVERY = 50
export const BREAK_LEN = 7
/**
 * Twists: from TWIST_AT points the camera does something nasty for a few seconds (announced
 * first). They only change how the road looks, never the controls, and never during a break.
 */
export const TWIST_AT = 5000
/** the new events unlock here, and the "mayhem" stretch starts climbing (full by 25,000) */
export const MAYHEM_AT = 10000
/** the 10k+ stretch: 0 at 10,000, all the way up by 25,000 */
export const mayhem = (score: number) => stage(score, MAYHEM_AT, 25000)
/** twists stretch out and come closer together from 5,000 to 25,000 (the first ones are rare) */
export const twistTiming = (score: number) => {
  const t = stage(score, TWIST_AT, 25000)
  return { len: lerp(7, 13, t), gap: lerp(16, 4, t) }
}
/** chance a twist brings a second one along (from ~7k), and a third (from ~15k) */
export const stackOdds = (score: number) => ({ two: 0.85 * stage(score, 7000, 20000), three: 0.4 * stage(score, 15000, 25000) })
/** late-game breathing room: hearts / power-ups wait this long after one appears (from ~7k) */
export const cooldowns = (score: number) => {
  const t = stage(score, 7000, 25000)
  return { heart: lerp(0, HEART_COOLDOWN, t), power: lerp(0, POWER_COOLDOWN, t) }
}
/** extra clutter slipped in between patterns, building up all the way from the win */
export const extraClutter = (score: number) => 0.8 * stage(score, 900, 25000)
/** how strong boosts are: stars, power-up time, star showers (0 at the start, full by ~2,700) */
export const boostOf = (score: number) => stage(score, 0, 2700)
/** the golden heart gets offered more and more often from the win to 5,000 */
export const goldOdds = (score: number) => 0.35 * stage(score, 870, 5000)
export const TWISTS = {
  tilt: { label: 'the road tilts!', from: TWIST_AT },
  mirror: { label: 'mirror world!', from: TWIST_AT },
  zoom: { label: 'zoomed in!', from: TWIST_AT },
  dark: { label: 'lights out!', from: TWIST_AT },
  sway: { label: 'sea legs!', from: TWIST_AT },
  // ── new events, 10k+ ──
  quake: { label: 'earthquake!', from: MAYHEM_AT }, // the whole picture shakes hard
  moon: { label: 'moon gravity!', from: MAYHEM_AT }, // floaty hops that reach the paper planes
  rush: { label: 'rush hour!', from: MAYHEM_AT }, // a burst of speed past the usual top speed
  storm: { label: 'paper plane storm!', from: MAYHEM_AT }, // planes pour in at every height
  flicker: { label: 'flickering lights!', from: MAYHEM_AT }, // the lights strobe on and off
} as const
export type Twist = keyof typeof TWISTS
/** moon gravity: hops float this much longer (and higher) */
export const MOON = 0.55
/** rush hour: road speed multiplier, and how far past the usual top speed it may go */
export const rushOf = (score: number) => lerp(1.15, 1.3, mayhem(score))
/** past 10k, a pause after each heart / power-up before the next one can appear (seconds) */
const HEART_COOLDOWN = 8
const POWER_COOLDOWN = 6
/** the paper warms a little with each friend, then glows once everyone's there */
export const TINTS = ['#ffffff', '#fffcf2', '#fff8e8', '#fff3ee', '#fdf0f6', '#f5f1ff', '#eef5ff']
export const WON_TINT = '#fff6d8'

/**
 * Level: one per friend who has joined, then one more every 900 points after the win. Only the
 * music and the call-outs follow it; how hard the road is comes from the difficulty curve.
 */
export const tierOf = (friends: number, score: number) =>
  friends + Math.floor(Math.max(0, score - JOIN_AT[JOIN_AT.length - 1]) / LEVEL_AFTER_WIN)
/**
 * Road patterns and the score where each starts to show up. A pattern blends in over a short
 * stretch of the curve (TUNE.fade) rather than switching on, roughly as each friend arrives.
 */
export const COMBOS = [
  { name: 'single', from: 0 },
  { name: 'pair', from: 70 }, // two close together: a long hop or hop + skip
  { name: 'under', from: 170 }, // clutter with a paper plane right above: hop, don't skip
  { name: 'triple', from: 300 }, // three in a row
  { name: 'low', from: 460 }, // a plane at head height: stay on the ground
  { name: 'drop', from: 650 }, // a sticker falls out of the sky ahead
  // ── chaos, from the win on ──
  { name: 'bounce', from: 870 }, // clutter that hops along the road
  { name: 'zigzag', from: 870 }, // a plane that swoops up and down through the hop zone
  { name: 'swarm', from: 1800 }, // a few planes at mixed heights
  { name: 'rain', from: 1800 }, // several stickers falling at once
  { name: 'roll', from: 2700 }, // clutter rolling at you faster than the road
  { name: 'chaos', from: 3600 }, // two patterns at the same time
] as const
const COMBO_D = COMBOS.map((c) => difficulty(c.from))
/** how likely each pattern is at difficulty d: blended in after its score; plain singles fade out */
export const comboWeights = (d: number) =>
  COMBOS.map((c, i) => {
    const on = Math.max(0, Math.min(1, (d - COMBO_D[i]) / TUNE.fade))
    return c.name === 'single' ? 0.6 + 3.4 * Math.pow(1 - d, 3) : on * on * (3 - 2 * on)
  })
export type ComboName = (typeof COMBOS)[number]['name']
/** how things move besides scrolling with the road */
export type Mode = 'normal' | 'bounce' | 'zigzag' | 'roll'

export type Kind = 'ground' | 'drop' | 'plane' | 'star' | 'heart' | Power
export interface Thing {
  on: boolean
  kind: Kind
  x: number
  y: number // bottom, units above the floor
  vy: number // only falling stickers use this
  base: number // resting height for bouncing / weaving things
  mode: Mode
  size: number
  look: number
  phase: number
}
