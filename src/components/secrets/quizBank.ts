import { BIRTHDAYS, C, VOLUMES } from '../../data'
import { CHAPTERS } from '../../volumes'
import { pick, shuffle } from './GameKit'
import { currentLocale, dayMonth, monthName, t, type Key } from '../../i18n'

/**
 * Questions for the quiz. Most are built from what the site already knows (the birthday dial,
 * the volumes and their chapter titles), so they're always right; a few are hand-written basics
 * about the series (`qb.f.*` in the dictionaries). Each has a tier, from 0 (warm-up) to 3 (only real fans), and the quiz moves
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

/** month names and dates in the reader's language, read when each question is made */
const months = () => Array.from({ length: 12 }, (_, i) => monthName(i + 1, currentLocale()))
const date = (m: number, d: number) => dayMonth(m, d, currentLocale())
const vol = (n: number) => t('qb.volN', { n })
const chapter = (n: number) => t('qb.chapterN', { n })

/** the right answer plus n - 1 others from the pool, shuffled */
const withOthers = (answer: string, pool: string[], n: number) =>
  shuffle([answer, ...shuffle([...new Set(pool)].filter((x) => x !== answer)).slice(0, n - 1)])

/** the volume a chapter is in, for numbered chapters only (no extras) */
const chapters = CHAPTERS.filter((c) => Number.isInteger(c.n))
const volOf = (n: number) => VOLUMES.find((v) => v.chapters.includes(n))?.n ?? 0
const outVolumes = VOLUMES.filter((v) => v.src).map((v) => v.n)
/** volume numbers close to v, so the wrong answers aren't a giveaway */
const near = (v: number, spread: number) => outVolumes.filter((x) => Math.abs(x - v) <= spread).map(vol)

type Make = (n: number) => Q

/** generated questions, by kind */
const MAKERS: { tier: number; make: Make; weight?: number }[] = [
  {
    tier: 0,
    make: (n) => {
      const b = pick(BIRTHDAYS)
      const MONTHS = months()
      return {
        id: `m-${b.name}`,
        tier: 0,
        text: t('qb.month'),
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
        text: t('qb.whose'),
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
        text: t('qb.first'),
        hi: t('qb.firstHi'),
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
        text: t('qb.vol'),
        hi: ch.title,
        answer: vol(v),
        options: withOthers(vol(v), near(v, 3), n),
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
        text: t('qb.date'),
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
      const pool = chapters.filter((c) => Math.abs(c.n - ch.n) <= 6).map((c) => chapter(c.n))
      return {
        id: `c-${ch.n}`,
        tier: 3,
        text: t('qb.chapter'),
        hi: ch.title,
        answer: chapter(ch.n),
        options: withOthers(chapter(ch.n), pool, n),
        color: C.blue,
      }
    },
  },
]

/**
 * hand-written basics: [tier, key]. Each key holds "question|highlighted bit|answer|wrong answers…",
 * so every language can use its own names for places, studios and magazines.
 */
const FACTS: [number, Key][] = [
  [0, 'qb.f.author'],
  [0, 'qb.f.from'],
  [0, 'qb.f.shimaKid'],
  [0, 'qb.f.livesWith'],
  [1, 'qb.f.studio'],
  [1, 'qb.f.magazine'],
  [1, 'qb.f.mitsumiFamily'],
  [1, 'qb.f.shimaFirst'],
  [2, 'qb.f.makotoFamily'],
  [2, 'qb.f.mikaFamily'],
  [2, 'qb.f.yuzukiFamily'],
  [2, 'qb.f.dream'],
  [2, 'qb.f.season'],
]
/** the last season-1 volume: worked out, so the fact stays right */
const S1_END = Math.max(...VOLUMES.filter((v) => v.anime === 'Season 1').map((v) => v.n))
const fact = (key: Key): [string, string, string, ...string[]] => {
  const [text, hi, ...rest] = t(key).split('|')
  // the season fact's answers are numbers, the same in every language
  return key === 'qb.f.season' ? [text, hi, String(S1_END), '2', '3', '5', '6'] : [text, hi, rest[0], ...rest.slice(1)]
}

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
      const [, key] = pick(facts)
      const [text, hi, answer, ...wrong] = fact(key)
      q = { id: `x-${key}`, tier, text, hi, answer, options: shuffle([answer, ...shuffle(wrong).slice(0, n - 1)]), color: C.pink }
    } else {
      if (!makers.length) continue
      q = makers[weighted(makers.map((m) => m.weight ?? 1))].make(n)
    }
    if (q.options.length < 2 || recent.has(q.id)) continue
    return q
  }
  return MAKERS[0].make(n)
}
