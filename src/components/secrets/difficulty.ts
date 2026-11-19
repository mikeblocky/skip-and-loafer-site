/**
 * Skip to School: the difficulty curve.
 *
 * One number, D, drives how hard the road is. It depends only on the score:
 *
 *     D(score) = 1 - (1 + score / SCALE) ^ -POWER
 *
 * D starts at 0, climbs briskly through the first few thousand points, keeps easing upward in
 * the mid-game and creeps toward 1 late in the run without ever flattening out or jumping. Road
 * speed, how far apart the patterns are, which patterns turn up, how often hearts and power-ups
 * come, how strong the boosts are and the late-game events all read their values off this one
 * curve. Nothing switches on at a fixed score: each knob blends in over a stretch of the curve.
 *
 * With the defaults (the first six friends ≈ 2 minutes, 10k ≈ 8 minutes; past 10k the points speed up
 * (see paceOf in skipRules), so a clean run reaches 100k ≈ 15, 1M ≈ 21 and 10M ≈ 26 minutes):
 *
 *     score   0     1k    2.5k  5k    10k   20k   50k   100k  1M    10M
 *     D       0     .18   .33   .45   .58   .68   .79   .85   .95   .98
 *     speed   300   594   777   902   990   1043  1078  1089  1099  1100
 *
 * Top speed settles by ~100k; past that the road gets harder through denser patterns, more and
 * stacked twists and the 10k+ events, which keep building all the way to a million.
 *
 * Tuning: everything to tweak lives in CURVE and TUNE below.
 */

export const CURVE = {
  /** score at which the curve is a quarter of the way up; bigger = slower, longer game */
  SCALE: 1900,
  /** how hard the tail leans toward the ceiling; smaller = longer, gentler late game */
  POWER: 0.47,
}

export const TUNE = {
  speed: {
    /** road speed at the start, and the ceiling it approaches (world units / second) */
    start: 300,
    top: 1100,
    /** how quickly speed reaches the ceiling compared with D (1 = same as D, higher = sooner) */
    bend: 2.3,
    /** how fast the road catches up to the speed it should be going (1 / seconds) */
    follow: 0.8,
    /** speed during a break, as a share of the usual speed */
    rest: 0.9,
  },
  /**
   * Time between road patterns: (base + random × spread) × 340 / speed + extra, in seconds,
   * each value going from its early to its late number as D rises.
   */
  gap: { base: [1.2, 0.62], spread: [0.8, 0.45], extra: [0.42, 0.22] },
  /**
   * Fairness. Between the last hazard of one group and the first of the next there is always at
   * least one full hop of air time (longer under moon gravity) plus this margin, so you can land
   * and hop again; no gap ever needs a perfect skip. Early → late, in seconds.
   */
  margin: [0.3, 0.02],
  /**
   * Breathers: seconds of eased-off road after big moments. While a breather runs (fading out
   * as it counts down), patterns are picked as if D were up to `ease` lower, gaps are up to
   * `gap` longer, and no extra clutter slips in.
   */
  breather: { page: 3.5, twist: 2, win: 3, rest: 2.5, ease: 0.6, gap: 0.8 },
  /** a pattern fades in over this much of D after its score (see COMBOS in SkipGame) */
  fade: 0.06,
  /** what each spawn turns out to be (chances out of 1; the rest is road clutter) */
  odds: {
    plane: [0.1, 0.26], // a lone paper plane, after the first few hundred points
    power: [0.18, 0.12], // a power-up (cooldowns slow these down late)
    star: [0.16, 0.16],
    heart: [0.04, 0.34], // only while you're missing a heart; more as the road gets meaner
  },
}

const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** an [early, late] pair read at difficulty d */
export const at = ([a, b]: readonly number[], d: number) => lerp(a, b, d)
const smooth = (t: number) => {
  const u = clamp01(t)
  return u * u * (3 - 2 * u)
}

/** The curve: 0 at the start, rising smoothly toward 1. */
export const difficulty = (score: number) => 1 - Math.pow(1 + Math.max(0, score) / CURVE.SCALE, -CURVE.POWER)

/** 0 → 1 smoothly while difficulty d passes between the curve's values at two scores */
export const stageD = (d: number, from: number, to: number) => {
  const a = difficulty(from)
  return smooth((d - a) / (difficulty(to) - a))
}
/** same, for a score */
export const stage = (score: number, from: number, to: number) => stageD(difficulty(score), from, to)

/** road speed the curve asks for at difficulty d */
export const speedAt = (d: number) => {
  const { start, top, bend } = TUNE.speed
  return start + (top - start) * (1 - Math.pow(1 - clamp01(d), bend))
}

/** seconds until the next pattern, at difficulty d and the current speed (random in [0, 1)) */
export const gapAt = (d: number, speed: number, random: number) =>
  (at(TUNE.gap.base, d) + random * at(TUNE.gap.spread, d)) * (340 / speed) + at(TUNE.gap.extra, d)

/** the least time between hazard groups: one hop's air time plus the fairness margin */
export const minGapAt = (d: number, airTime: number) => airTime + at(TUNE.margin, d)
