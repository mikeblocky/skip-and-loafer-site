import { C, CHARACTERS } from '../../data'
import type { IconName } from '../../icons'
import { TUNE, difficulty, lerp, stage } from './difficulty'

/**
 * The long road. Past 10,000 points the run keeps going by orders of magnitude: points come in
 * faster and faster (the "pace" multiplier), and the big moments are spaced out the same way,
 * at 10k, 25k, 50k, 100k, 250k, 500k, 1M, 2.5M, 5M, 10M and on, so a good run can reach a
 * hundred thousand in about 15 minutes and a million in about 21, and never runs out of road.
 */
/** the i-th page milestone: 10k, 25k, 50k, 100k, 250k, 500k, 1M, … */
export const pageAt = (i: number) => [1, 2.5, 5][i % 3] * 10 ** (4 + Math.floor(i / 3))
/** how many page milestones a score has passed: the road turns to a fresh page at each one */
export const pageOf = (score: number) => {
  let n = 0
  while (score >= pageAt(n)) n++
  return n
}
/** past 10k, points (from the road, stars and dares) come in this many times faster */
export const PACE_FROM = 10000
const PACE_SCALE = 4500
export const paceOf = (score: number) => 1 + Math.max(0, score - PACE_FROM) / PACE_SCALE
/** short, readable numbers for the big ones: 12,345 · 250k · 1.2M */
export const fmt = (n: number) => {
  const v = Math.floor(n)
  if (v < 100000) return v.toLocaleString('en-US')
  if (v < 1e6) return `${Math.floor(v / 1000)}k`
  if (v < 1e9) return `${(v / 1e6).toFixed(v < 1e7 ? 2 : 1).replace(/\.?0+$/, '')}M`
  return `${(v / 1e9).toFixed(2).replace(/\.?0+$/, '')}B`
}

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
/**
 * Phones mid-run zoom in: about PHONE_VIEW units fit across the screen, the camera starts
 * PHONE_BEHIND units behind Mitsumi, and the friends run PHONE_FRIEND_GAP apart so most of
 * them still show.
 */
export const PHONE_VIEW = 280
export const PHONE_BEHIND = 100
export const PHONE_FRIEND_GAP = 16
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

/** everyone who can catch up with Mitsumi; they all join over a run, in a random order */
export const FRIENDS = CHARACTERS.filter((c) => c.id !== 'mitsumi')
/**
 * Score at which each friend catches up; when the last one joins, you've won. The first six come
 * quickly; after that each one takes about 1.3× the score of the one before, so the line keeps
 * growing through the mid-game however many friends there are.
 */
const FIRST_JOINS = [85, 205, 360, 550, 780, 1050]
export const JOIN_AT = FRIENDS.map((_, i) =>
  i < FIRST_JOINS.length ? FIRST_JOINS[i] : Math.round((1050 * Math.pow(1.3, i - FIRST_JOINS.length + 1)) / 50) * 50,
)
/**
 * How far apart the friends run behind Mitsumi: their usual gap, closing up as the line gets
 * longer so everyone still fits in the room behind her (`room` world units).
 */
export const lineGap = (base: number, room: number, count: number) => Math.min(base, room / Math.max(1, count))
/** after the win, a new level each time the score grows by this factor (so they keep coming at 1M) */
const LEVEL_STEP = 1.3
/** every so often, a breather: no hazards for a few seconds */
export const BREAK_EVERY = 50
export const BREAK_LEN = 7
/**
 * Twists: from TWIST_AT points the camera does something nasty for a few seconds (announced
 * first). They only change how the road looks, never the controls, and never during a break.
 */
export const TWIST_AT = 6000
/** the new events unlock here, and the "mayhem" stretch starts climbing (full by 1M) */
export const MAYHEM_AT = 10000
/** the 10k+ stretch: 0 at 10,000, all the way up by a million */
export const mayhem = (score: number) => stage(score, MAYHEM_AT, 1e6)
/** twists stretch out and come closer together from 6,000 to 250k (the first ones are rare) */
export const twistTiming = (score: number) => {
  const t = stage(score, TWIST_AT, 250000)
  return { len: lerp(7, 13, t), gap: lerp(16, 4, t) }
}
/** chance a twist brings a second one along (from ~8k, full by 100k), and a third (from 50k to 1M) */
export const stackOdds = (score: number) => ({ two: 0.85 * stage(score, 8000, 100000), three: 0.4 * stage(score, 50000, 1e6) })
/** late-game breathing room: hearts / power-ups wait this long after one appears (from ~8k to 250k) */
export const cooldowns = (score: number) => {
  const t = stage(score, 8000, 250000)
  return { heart: lerp(0, HEART_COOLDOWN, t), power: lerp(0, POWER_COOLDOWN, t) }
}
/** extra clutter slipped in between patterns, building up all the way from the win to 1M */
export const extraClutter = (score: number) => 0.8 * stage(score, 1050, 1e6)
/** how strong boosts are: stars, power-up time, star showers (0 at the start, full by ~3,300) */
export const boostOf = (score: number) => stage(score, 0, 3300)
/** the golden heart gets offered more and more often from the win to 6,000 */
export const goldOdds = (score: number) => 0.35 * stage(score, 1050, 6000)
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
 * Level: one per friend who has joined, then one more each time the score grows 1.3× after the
 * win (1,365, 1,775, … about every 40 seconds late on). The music, the call-outs and the dares
 * follow it; how hard the road is comes from the difficulty curve.
 */
export const tierOf = (friends: number, score: number) => {
  const win = JOIN_AT[JOIN_AT.length - 1]
  return friends + (score > win ? Math.floor(Math.log(score / win) / Math.log(LEVEL_STEP)) : 0)
}
/**
 * Road patterns and the score where each starts to show up. A pattern blends in over a short
 * stretch of the curve (TUNE.fade) rather than switching on, roughly as each friend arrives.
 */
export const COMBOS = [
  { name: 'single', from: 0 },
  { name: 'pair', from: 85 }, // two close together: a long hop or hop + skip
  { name: 'under', from: 205 }, // clutter with a paper plane right above: hop, don't skip
  { name: 'triple', from: 360 }, // three in a row
  { name: 'low', from: 550 }, // a plane at head height: stay on the ground
  { name: 'drop', from: 780 }, // a sticker falls out of the sky ahead
  // ── chaos, from the win on ──
  { name: 'bounce', from: 1050 }, // clutter that hops along the road
  { name: 'zigzag', from: 1050 }, // a plane that swoops up and down through the hop zone
  { name: 'swarm', from: 2200 }, // a few planes at mixed heights
  { name: 'rain', from: 2200 }, // several stickers falling at once
  { name: 'roll', from: 3300 }, // clutter rolling at you faster than the road
  { name: 'chaos', from: 4400 }, // two patterns at the same time
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
  /** already slipped past behind Mitsumi (for the "clear" dare) */
  passed: boolean
}
