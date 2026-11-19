import { BIRTHDAYS, C, VOLUMES } from '../../data'
import { CHAPTERS } from '../../volumes'
import { pick, shuffle } from './GameKit'

/**
 * Questions for the quiz. Most are built from what the site already knows (the birthday dial,
 * the volumes and their chapter titles), so they're always right; a few are hand-written basics
 * about the series. Each has a tier, from 0 (warm-up) to 3 (only real fans), and the quiz moves
 * up the tiers as it goes.
 */
export interface Q {
  /** so the same question doesn't come back too soon */
  id: string
  tier: number
  text: string
  /** the bit of the question to pick out in colour */
  hi?: string
  answer: string
  options: string[]
  color: string
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const date = (m: number, d: number) => `${MONTHS[m - 1]} ${d}`

/** the right answer plus n - 1 others from the pool, shuffled */
const withOthers = (answer: string, pool: string[], n: number) =>
  shuffle([answer, ...shuffle([...new Set(pool)].filter((x) => x !== answer)).slice(0, n - 1)])

/** the volume a chapter is in, for numbered chapters only (no extras) */
const chapters = CHAPTERS.filter((c) => Number.isInteger(c.n))
const volOf = (n: number) => VOLUMES.find((v) => v.chapters.includes(n))?.n ?? 0
const outVolumes = VOLUMES.filter((v) => v.src).map((v) => v.n)
/** volume numbers close to v, so the wrong answers aren't a giveaway */
const near = (v: number, spread: number) => outVolumes.filter((x) => Math.abs(x - v) <= spread).map((x) => `vol. ${x}`)

type Make = (n: number) => Q

/** generated questions, by kind */
const MAKERS: { tier: number; make: Make; weight?: number }[] = [
  {
    tier: 0,
    make: (n) => {
      const b = pick(BIRTHDAYS)
      return {
        id: `m-${b.name}`,
        tier: 0,
        text: 'which month is {hi}’s birthday?',
        hi: b.name,
        answer: MONTHS[b.m - 1],
        options: withOthers(MONTHS[b.m - 1], MONTHS.filter((_, i) => Math.abs(i + 1 - b.m) <= 3), n),
        color: b.color,
      }
    },
  },
  {
    tier: 1,
    make: (n) => {
      const b = pick(BIRTHDAYS)
      return {
        id: `w-${b.name}`,
        tier: 1,
        text: 'whose birthday is {hi}?',
        hi: date(b.m, b.d),
        answer: b.name,
        options: withOthers(b.name, BIRTHDAYS.map((x) => x.name), n),
        color: b.color,
      }
    },
  },
  {
    tier: 2,
    make: (n) => {
      // whose birthday comes first in the year, out of a few
      const group = shuffle(BIRTHDAYS).slice(0, n)
      const first = [...group].sort((a, b) => a.m * 40 + a.d - (b.m * 40 + b.d))[0]
      return {
        id: `f-${group.map((g) => g.name).sort().join()}`,
        tier: 2,
        text: 'whose birthday comes {hi} in the year?',
        hi: 'first',
        answer: first.name,
        options: shuffle(group.map((g) => g.name)),
        color: C.orange,
      }
    },
  },
  {
    tier: 2,
    make: (n) => {
      const ch = pick(chapters.filter((c) => c.n <= 60))
      const v = volOf(ch.n)
      return {
        id: `v-${ch.n}`,
        tier: 2,
        text: '“{hi}” is in which volume?',
        hi: ch.title,
        answer: `vol. ${v}`,
        options: withOthers(`vol. ${v}`, near(v, 3), n),
        color: C.violet,
      }
    },
  },
  {
    tier: 3,
    make: (n) => {
      const b = pick(BIRTHDAYS)
      // the same month, or the month next door, so you really have to know
      const pool = [-2, -1, 1, 2, 3, -3, 5, 7].map((k) => {
        const d = Math.min(b.m === 2 ? 28 : 30, Math.max(1, b.d + k))
        return date(b.m, d)
      })
      return {
        id: `d-${b.name}`,
        tier: 3,
        text: 'when is {hi}’s birthday?',
        hi: b.name,
        answer: date(b.m, b.d),
        options: withOthers(date(b.m, b.d), pool, n),
        color: b.color,
      }
    },
  },
  {
    tier: 3,
    // chapter titles are the hardest thing to know, so they come up less and with fewer answers
    weight: 0.35,
    make: (n) => {
      n = Math.min(n, 4)
      const ch = pick(chapters)
      const pool = chapters.filter((c) => Math.abs(c.n - ch.n) <= 6).map((c) => `chapter ${c.n}`)
      return {
        id: `c-${ch.n}`,
        tier: 3,
        text: 'which chapter is called “{hi}”?',
        hi: ch.title,
        answer: `chapter ${ch.n}`,
        options: withOthers(`chapter ${ch.n}`, pool, n),
        color: C.blue,
      }
    },
  },
]

/** hand-written basics: [tier, question, highlighted bit, answer, wrong answers…] */
const FACTS: [number, string, string, string, ...string[]][] = [
  [0, 'who draws and writes {hi}?', 'Skip and Loafer', 'Misaki Takamatsu', 'Rumiko Takahashi', 'Ai Yazawa', 'Hiro Mashima', 'Naoko Takeuchi'],
  [0, 'Mitsumi moves to Tokyo from which {hi}?', 'prefecture', 'Ishikawa', 'Hokkaido', 'Okinawa', 'Nagano', 'Aomori', 'Kochi'],
  [0, 'what was {hi} as a kid?', 'Shima', 'a child actor', 'a pro shogi player', 'a swimmer for Japan', 'in a boy band', 'a piano prodigy'],
  [0, 'who does Mitsumi live with in {hi}?', 'Tokyo', 'her aunt Nao', 'her grandma', 'a host family', 'the school dorm', 'her big sister'],
  [1, 'which studio made the {hi}?', 'anime', 'P.A. Works', 'Kyoto Animation', 'MAPPA', 'Wit Studio', 'Shaft'],
  [1, 'which magazine runs {hi}?', 'Skip and Loafer', 'Monthly Afternoon', 'Weekly Shōnen Jump', 'Bessatsu Margaret', 'Monthly Shōnen Gangan', 'Ribon'],
  [1, 'what’s Mitsumi’s {hi}?', 'family name', 'Iwakura', 'Kurume', 'Egashira', 'Murashige', 'Takamine'],
  [1, 'what’s Shima’s {hi}?', 'first name', 'Sousuke', 'Takeshi', 'Haruki', 'Ren', 'Kazuya'],
  [2, 'what’s Makoto’s {hi}?', 'family name', 'Kurume', 'Iwakura', 'Egashira', 'Murashige', 'Kanechika'],
  [2, 'what’s Mika’s {hi}?', 'family name', 'Egashira', 'Murashige', 'Kurume', 'Iwakura', 'Takamine'],
  [2, 'what’s Yuzuki’s {hi}?', 'family name', 'Murashige', 'Egashira', 'Kurume', 'Iwakura', 'Kazakami'],
  [2, 'what does {hi} want to do when she grows up?', 'Mitsumi', 'work for the government and help her hometown', 'open a café back home', 'act in movies', 'design clothes in Shibuya', 'run a big company'],
  [2, 'the anime’s {hi} covers up to which volume?', 'first season', String(Math.max(...VOLUMES.filter((v) => v.anime === 'Season 1').map((v) => v.n))), '2', '3', '5', '6'],
]

/** a question for tier t or below, with n options (fact questions use up to n of theirs) */
/** pick an index by weight */
function weighted(ws: number[]) {
  let r = Math.random() * ws.reduce((a, b) => a + b, 0)
  for (let i = 0; i < ws.length; i++) if ((r -= ws[i]) <= 0) return i
  return 0
}

/**
 * A question with n answers. `tiers` says how likely each tier is right now (see QUIZ.tiers in
 * ./gameCurves): the hard ones blend in as the quiz goes on, and the easy ones never vanish.
 */
export function makeQuestion(tiers: number[], n: number, recent: Set<string>): Q {
  for (let tries = 0; tries < 40; tries++) {
    const tier = weighted(tiers)
    const facts = FACTS.filter((f) => f[0] === tier)
    const makers = MAKERS.filter((m) => m.tier === tier)
    let q: Q
    if (facts.length && Math.random() < 0.35) {
      const [, text, hi, answer, ...wrong] = pick(facts)
      q = { id: `x-${text}`, tier, text, hi, answer, options: shuffle([answer, ...shuffle(wrong).slice(0, n - 1)]), color: C.pink }
    } else {
      if (!makers.length) continue
      q = makers[weighted(makers.map((m) => m.weight ?? 1))].make(n)
    }
    if (q.options.length < 2 || recent.has(q.id)) continue
    return q
  }
  return MAKERS[0].make(n)
}
