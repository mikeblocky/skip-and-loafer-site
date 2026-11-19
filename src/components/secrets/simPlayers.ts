/**
 * Simulated players for tuning ./gameCurves (not used by the site). Run it from the browser
 * console on the dev server:
 *
 *     (await import('/src/components/secrets/simPlayers.ts')).report()
 *
 * Each player is a few numbers: how fast they tap, how often they slip, how much they know.
 * They're rough models, but they show whether practice pays off: a better player should always
 * get clearly further, and nobody should be able to play forever.
 */
import { GACHA, POLL, QUIZ } from './gameCurves'

const RUNS = 400
/** a random time around `mean`, never far off (people are a bit faster or slower each time) */
const vary = (mean: number) => mean * Math.exp((Math.random() - 0.5) * 0.5)
const poisson = (l: number) => {
  let k = 0
  let p = Math.exp(-l)
  let s = p
  const u = Math.random()
  while (u > s && k < 50) p *= l / ++k, (s += p)
  return k
}
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]
const pct = (a: number[], q: number) => [...a].sort((x, y) => x - y)[Math.floor(a.length * q)]

/** capsule pairs: seconds per matched pair (both taps), and misses per pair on a 6-card tray */
const GACHA_PLAYERS = { casual: [1.6, 0.6], good: [1.1, 0.35], expert: [0.8, 0.18], perfect: [0.45, 0] } as const
function gachaRun([tap, slip]: readonly number[]) {
  let clock = GACHA.start
  let score = 0
  for (let tray = 1; tray < 200; tray++) {
    const d = GACHA.d(tray - 1)
    const pairs = GACHA.pairs(tray)
    const cards = pairs * 2
    // more cards, twin rarities and a shorter look all make misses likelier
    const rate = slip * Math.pow(cards / 6, 0.7) * (1 + 0.8 * (1 - GACHA.friends(d))) * Math.pow(3 / GACHA.peek(d, cards), 0.3)
    const every = GACHA.swapEvery(d)
    for (let p = 0; p < pairs; p++) {
      let misses = poisson(rate)
      if (every) misses += Math.floor(misses / every) // a swap costs about one more miss
      clock -= vary(tap) + misses * (vary(tap) + GACHA.missCost(d))
      if (clock <= 0) return { tray, score }
      clock = Math.min(GACHA.max, clock + GACHA.pairBack(d))
      score += 160 * (1 + Math.min(p, 8) * 0.25 * (misses ? 0 : 1)) * (1 + (tray - 1) * 0.15)
    }
    score += 250 * tray + Math.round(clock) * 10
    clock = Math.min(GACHA.max, clock + GACHA.clearBack(d))
  }
  return { tray: 200, score }
}

/** quiz: chance of knowing each tier, and how much of the clock they use */
const QUIZ_PLAYERS = {
  'new fan': [[0.85, 0.5, 0.25, 0.1], 0.6],
  fan: [[0.95, 0.8, 0.5, 0.3], 0.5],
  'big fan': [[1, 0.95, 0.8, 0.55], 0.4],
  expert: [[1, 1, 0.95, 0.85], 0.3],
} as const
function quizRun([know, slow]: readonly [readonly number[], number]) {
  let lives = QUIZ.lives
  let right = 0
  let streak = 0
  /** right in a row since the last heart came back */
  let run = 0
  let score = 0
  for (let n = 0; n < 2000; n++) {
    const d = QUIZ.d(n)
    const ws = QUIZ.tiers(d)
    let r = Math.random() * ws.reduce((a, b) => a + b, 0)
    let tier = 0
    while ((r -= ws[tier]) > 0 && tier < 3) tier++
    const ok = Math.random() < know[tier] || Math.random() < 1 / QUIZ.answers(d)
    // a guess, or a hard one, takes longer; sometimes the clock runs out first
    const used = vary(slow) * (ok ? 1 : 1.3)
    if (ok && used < 1) {
      right++
      streak++
      score += 100 * (tier + 1) * (0.4 + 0.6 * (1 - used)) * (1 + Math.min(streak, 10) * 0.1)
      if (++run >= QUIZ.healEvery(d) && lives < QUIZ.lives) {
        lives++
        run = 0
      }
    } else {
      streak = 0
      run = 0
      if (--lives <= 0) return { right, asked: n + 1, score }
    }
  }
  return { right, asked: 2000, score }
}

/** find your friends: seconds to spot one friend in 4 faces, and wrong taps per find */
const POLL_PLAYERS = { casual: [0.9, 0.15], good: [0.6, 0.08], expert: [0.42, 0.04], perfect: [0.25, 0] } as const
function pollRun([base, slip]: readonly number[]) {
  let clock = POLL.start
  let found = 0
  let score = 0
  while (found < 3000) {
    const d = POLL.d(found)
    const crowd = POLL.crowd(d)
    const need = 1 + POLL.two(d) + POLL.three(d) * 2
    // bigger crowds, no rings, odd faces and a shuffling crowd all slow you down
    const hard = 1 + 0.6 * (1 - POLL.rings(d)) + 0.25 * POLL.flip(d) + 0.5 * POLL.turn(d) + 0.5 * POLL.zoom(d) + 1.2 * POLL.shadow(d) + (POLL.shuffle(d) ? 0.25 : 0)
    const t = vary(base * Math.sqrt(crowd / 4) * hard) * need
    const wrong = poisson(slip * hard)
    clock -= t + wrong * POLL.missCost(d)
    if (clock <= 0) return { found, score }
    clock = Math.min(POLL.max, clock + POLL.timeBack(d) * need)
    score += 100 * need * (1 + d * 2) * (0.5 + Math.max(0, 1 - t / 4)) * 1.5
    found++
  }
  return { found, score }
}

export function report() {
  const out: string[] = []
  const row = (name: string, xs: number[], scores: number[], star: number) =>
    out.push(
      `  ${name.padEnd(9)} median ${median(xs)} (10%–90%: ${pct(xs, 0.1)}–${pct(xs, 0.9)})  score ~${Math.round(median(scores) / 100) * 100}  star ${Math.round((xs.filter((x) => x >= star).length / xs.length) * 100)}%`,
    )
  out.push(`capsule pairs: tray reached (star = clear tray ${GACHA.win})`)
  for (const [k, v] of Object.entries(GACHA_PLAYERS)) {
    const rs = Array.from({ length: RUNS }, () => gachaRun(v))
    row(k, rs.map((r) => r.tray), rs.map((r) => r.score), GACHA.win + 1)
  }
  out.push(`quiz: right answers (star = ${QUIZ.win})`)
  for (const [k, v] of Object.entries(QUIZ_PLAYERS)) {
    const rs = Array.from({ length: RUNS }, () => quizRun(v))
    row(k, rs.map((r) => r.right), rs.map((r) => r.score), QUIZ.win)
  }
  out.push(`find your friends: friends found (star = ${POLL.win})`)
  for (const [k, v] of Object.entries(POLL_PLAYERS)) {
    const rs = Array.from({ length: RUNS }, () => pollRun(v))
    row(k, rs.map((r) => r.found), rs.map((r) => r.score), POLL.win)
  }
  return out.join('\n')
}

/** the curve tables in ./gameCurves, worked out from the code */
export function tables() {
  const f = (x: number, k = 2) => x.toFixed(k).replace(/^0/, '')
  const g = [1, 2, 3, 4, 5, 6, 8, 10, 15].map((t) => {
    const d = GACHA.d(t - 1)
    const c = GACHA.pairs(t) * 2
    return `tray ${t}: D ${f(d)} cards ${c} look ${GACHA.peek(d, c).toFixed(1)}s back ${GACHA.pairBack(d).toFixed(1)}s clear ${GACHA.clearBack(d).toFixed(1)}s miss ${GACHA.missCost(d).toFixed(1)}s swap ${GACHA.swapEvery(d)}`
  })
  const q = [0, 5, 11, 19, 29, 39, 59].map((n) => {
    const d = QUIZ.d(n)
    return `q${n + 1}: D ${f(d)} answers ${QUIZ.answers(d)} clock ${QUIZ.clock(d).toFixed(1)}s tiers ${QUIZ.tiers(d).map((w) => f(w)).join(' ')}`
  })
  const p = [0, 10, 20, 30, 40, 60, 80].map((n) => {
    const d = POLL.d(n)
    return `found ${n}: D ${f(d)} crowd ${POLL.crowd(d)} back ${POLL.timeBack(d).toFixed(1)}s miss ${POLL.missCost(d).toFixed(1)}s rings ${f(POLL.rings(d))} shadow ${f(POLL.shadow(d))} shuffle ${POLL.shuffle(d) | 0}`
  })
  return [...g, ...q, ...p].join('\n')
}
