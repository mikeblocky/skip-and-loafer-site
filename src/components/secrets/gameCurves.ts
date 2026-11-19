/**
 * Difficulty curves for the three newer hidden games, the same way Skip to School does it
 * (see ./difficulty): one number D per game, from 0 toward 1, and every knob reads its value off
 * that curve. Nothing switches on all at once: each new idea blends in over a stretch of the
 * curve, so the first minute teaches the game and after that it's your skill that decides how
 * far you get, not luck.
 *
 *     D(n) = 1 - (1 + n / SCALE) ^ -POWER
 *
 * n is how far you've got: trays cleared, questions asked or friends found. D climbs briskly
 * at first, then keeps easing upward without ever flattening out, so there's always a little
 * more to master. The tables in each section show what the curve gives at a few points, and
 * the simulated players in each section's notes are what the tuning aims for.
 */

const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp01(t)
const smooth = (t: number) => {
  const u = clamp01(t)
  return u * u * (3 - 2 * u)
}
/** 0 → 1 smoothly while d passes from `a` to `b` */
export const stage = (d: number, a: number, b: number) => smooth((d - a) / (b - a))
const curveOf = (scale: number, power: number) => (n: number) => 1 - Math.pow(1 + Math.max(0, n) / scale, -power)

// ── capsule pairs ────────────────────────────────────────────────────────
/**
 *     tray    1     2     3     4     5     6     8     10    15
 *     D       0     .29   .44   .54   .61   .66   .72   .77   .83
 *     cards   6     8     10    12    14    16    20    24    24
 *     look    3.7s  3.1s  2.8s  2.7s  2.6s  2.6s  2.6s  2.7s  2.5s
 *     back    2.8s  1.9s  1.4s  1.1s  0.9s  0.8s  0.5s  0.4s  0.2s   (per pair)
 *     clear   8s    5.6s  4.2s  3.4s  2.8s  2.4s  1.8s  1.4s  0.9s
 *     miss    0     0     0     .1s   .3s   .4s   .7s   .8s   .9s
 *
 * The tray grows by one pair at a time. The first few trays forgive misses entirely, so you can
 * learn how pairs work; the same friend at two rarities starts showing up around tray 4, misses
 * start to cost a little from tray 5, and the machine starts swapping capsules too. The time you
 * get back keeps shrinking after the tray stops growing, so even a perfect memory runs out in the
 * end: how far you get depends on how fast and how cleanly you match.
 *
 * Simulated players (see ./simPlayers), median tray reached:
 *     casual 6 · good 8 (the star about one run in six) · expert 11 · flawless 29
 */
export const GACHA = {
  d: curveOf(2.2, 0.9),
  start: 40,
  max: 60,
  /** pairs on tray n (1, 2, …) */
  pairs: (n: number) => Math.min(12, n + 2),
  /** seconds to look before the capsules close */
  peek: (d: number, cards: number) => lerp(3.4, 0.9, d) + cards * 0.05,
  /** share of pairs with a friend of their own; the rest reuse a friend at another rarity */
  friends: (d: number) => lerp(1, 0.45, stage(d, 0.4, 0.82)),
  /** chance a pair is SR or better */
  rare: (d: number) => lerp(0.1, 0.35, d),
  /** time back for a pair, and for clearing the tray */
  pairBack: (d: number) => lerp(2.8, 0, d / 0.9),
  clearBack: (d: number) => lerp(8, 0.5, d / 0.88),
  /** time a miss costs */
  missCost: (d: number) => lerp(0, 1.0, stage(d, 0.45, 0.9)),
  /** after how many misses the machine swaps two closed capsules (0 = never) */
  swapEvery: (d: number) => (d < 0.6 ? 0 : d < 0.76 ? 3 : 2),
  /** clearing this tray earns the star */
  win: 8,
}

// ── quiz ─────────────────────────────────────────────────────────────────
/**
 *     question  1     6     12    20    30    40    60
 *     D         0     .27   .44   .57   .67   .73   .80
 *     answers   3     3     4     5     5     5     5
 *     clock     12s   10s   8.7s  7.8s  7.1s  6.6s  6.1s
 *     heal run  6     9     10    12    13    13    14
 *
 * Tiers blend in rather than switching: warm-ups (birth months, the basics) are most of the
 * first few questions, then names for dates, then volumes and family names, and the hard ones
 * (exact dates, and now and then a chapter title) only become common past question 25. The
 * easier tiers never vanish, so a run is a mix you can read. Questions come back now and then,
 * so the quiz rewards learning from your mistakes: a wrong answer shows the right one for a
 * moment. Winning a heart back takes a longer run the further you get, so nobody's unbeatable.
 *
 * Simulated players, median right answers:
 *     new fan 9 · fan 16 · big fan 34 (the star about one run in three) · expert ~120
 */
export const QUIZ = {
  d: curveOf(12, 0.9),
  lives: 3,
  /** a heart back after this many right in a row: 6 at first, more later, so nobody's unbeatable */
  healEvery: (d: number) => Math.round(lerp(6, 14, d / 0.8)),
  /** right answers for the star */
  win: 40,
  /** how likely each tier is at difficulty d (weights, not chances) */
  tiers: (d: number) => [lerp(1, 0.35, d / 0.8), stage(d, 0.1, 0.32), stage(d, 0.3, 0.52) * 1.1, stage(d, 0.55, 0.78)],
  answers: (d: number) => 3 + Math.round(stage(d, 0.15, 0.4)) + Math.round(stage(d, 0.45, 0.65)),
  clock: (d: number) => lerp(12, 5, d / 0.95),
}

// ── find your friends ────────────────────────────────────────────────────
/**
 *     found   0     10    20    30    40    60    80
 *     D       0     .38   .54   .63   .69   .76   .80
 *     crowd   4     9     12    16    16    20    20
 *     back    2.7s  2.1s  1.9s  1.8s  1.7s  1.6s  1.5s  (per friend found)
 *     wrong   0.6s  1.0s  1.9s  2.3s  2.4s  2.4s  2.4s  (per wrong tap)
 *
 * The colour rings fade out between about 10 and 30 found, mirrored faces start around 7,
 * turned ones around 15, zoomed-in ones around 25 and silhouettes from about 55. Two or three
 * of the same friend start turning up past 20, and the crowd reshuffles itself from about 35.
 * Wrong taps are cheap early on, so it's fine to learn the faces by tapping, and cost more later.
 *
 * Simulated players, median friends found:
 *     casual 35 · good 46 · expert 64 (the star most runs) · flawless ~135
 */
export const POLL = {
  d: curveOf(12, 0.8),
  start: 25,
  max: 40,
  win: 60,
  crowd: (d: number) => {
    const steps: [number, number][] = [[0.76, 20], [0.62, 16], [0.48, 12], [0.33, 9], [0.18, 6]]
    return steps.find(([at]) => d >= at)?.[1] ?? 4
  },
  /** how strongly the colour rings give people away, 1 → 0 */
  rings: (d: number) => 1 - stage(d, 0.4, 0.62),
  /** chances a face is mirrored, turned, zoomed in or a silhouette */
  flip: (d: number) => 0.5 * stage(d, 0.3, 0.55),
  turn: (d: number) => 0.8 * stage(d, 0.5, 0.7),
  /** how far a turned face turns, in degrees (at most) */
  turnBy: (d: number) => lerp(25, 180, stage(d, 0.5, 0.85)),
  zoom: (d: number) => 0.7 * stage(d, 0.6, 0.8),
  shadow: (d: number) => 0.6 * stage(d, 0.74, 0.92),
  /** chances of two, and of three, of the same friend */
  two: (d: number) => 0.5 * stage(d, 0.58, 0.75),
  three: (d: number) => 0.35 * stage(d, 0.7, 0.88),
  /** ms between crowd shuffles (0 = still) */
  shuffle: (d: number) => (d < 0.66 ? 0 : lerp(3600, 1600, stage(d, 0.66, 0.85))),
  timeBack: (d: number) => lerp(2.7, 1.4, d / 0.9),
  missCost: (d: number) => lerp(0.6, 2.4, stage(d, 0.25, 0.7)),
}
