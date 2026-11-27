/**
 * The Secret Santa quests. A chain of hidden steps, one part at a time, remembered on this
 * device only (like the other secrets). Nothing about it is announced on the page.
 */

import type { Mode } from './components/Stage'

/** the quest's pages: the five that are there all year (not the seasonal Secret Santa tab) */
export type Page = Exclude<Mode, 'santa'>
export const PAGES: Page[] = ['countdown', 'volumes', 'birthdays', 'anime', 'message']

/** which volume hides the ticket gate inside its cover (index into VOLUMES): where it all began */
export const GATE_VOLUME = 0
/** which update in the changelog the ticket is tucked into */
export const TICKET_UPDATE = 'hello'
/** a scratched code only works for a while; after that the ticket grows a fresh silver layer */
export const TICKET_LIFE = 60 * 60 * 1000
/** good digs into a snow pile before the gift comes out */
export const DIGS = 3

/** what each tab wished for, as written on the list */
export const WISHES: Record<Page, { gift: string; why: string; icon: 'coffee' | 'bookmark' | 'cake' | 'popcorn' | 'stamp' }> = {
  countdown: { gift: 'a can of hot coffee', why: 'for staying up every night counting', icon: 'coffee' },
  volumes: { gift: 'a pressed-sakura bookmark', why: 'fifteen books and not one bookmark', icon: 'bookmark' },
  birthdays: { gift: 'a slice of strawberry shortcake', why: 'it throws everyone else’s party', icon: 'cake' },
  anime: { gift: 'a big bag of popcorn', why: 'for the next season, whenever it comes', icon: 'popcorn' },
  message: { gift: 'a set of seasonal stamps', why: 'for all the letters it carries', icon: 'stamp' },
}

export interface Gift {
  /** the page it's buried on */
  page: Page
  /** the tab that wished for it */
  to: Page
  /** where on the page, as fractions of the window */
  x: number
  y: number
  found: boolean
  sent: boolean
}

/**
 * none: not started · scraps: catching the torn list · mend: taping it back together ·
 * riddles: ???'s riddles on the back of the list · dig: digging up and sending the gifts ·
 * blessed: part 1 done, holding the key
 */
export type Stage1 = 'none' | 'scraps' | 'mend' | 'riddles' | 'dig' | 'blessed'
export const STAGES: Stage1[] = ['none', 'scraps', 'mend', 'riddles', 'dig', 'blessed']
/** has the quest got past this stage */
export const past = (now: Stage1, s: Stage1) => STAGES.indexOf(now) > STAGES.indexOf(s)

/**
 * ???'s riddles, written on the back of the list. Each one lights a lantern; light all three
 * (in any order) and the snow lets go of the presents.
 */
export const RIDDLES = [
  { page: 'countdown' as const, text: 'The clock that never sleeps counts down for everyone. When its seconds read Christmas Day, knock on it once.' },
  { page: 'birthdays' as const, text: 'Turn the wheel of birthdays to the friend born closest to Christmas.' },
  { page: 'volumes' as const, text: 'Find the book marked with a shrine gate, and look inside its cover.' },
]
/**
 * Each present's tag has a letter on the back. Sent in order, they spell the word on the key:
 * U, E, N, O, and the last one is ???'s snowflake (drawn as the icon, not a character).
 */
export const LETTERS = ['U', 'E', 'N', 'O', '*'] as const
/** the volume the third riddle points at (index into VOLUMES): the one with the torii */
export const TORII_VOLUME = 12

/**
 * Part 2, "The Tilt". It starts at the same ticket gate, with the Key of Ueno:
 *   memories something has changed: part 1's four memories come back slightly wrong, and the
 *            site is altered too (Yuzuki's gone from the page, the birthday wheel says "Y.",
 *            the old ticket asks if you remember it right, the logo slips). Catch the one line
 *            that's wrong in each memory to put it back
 *   letter   ??? asks for a Secret Santa letter first (the Message tab does out of season)
 *            → the letter drops in the box and the whole site tips over
 *   signal   a light on the Countdown blinks Morse code: write it down, type what it says
 *   reply    tap the name on the key back to it, in Morse (U E N O)
 *            → the site swings the other way and every tab's name shifts along the alphabet
 *   cipher   ???'s call sheet on the Volumes page, in the same shift: read it with the wheel
 *            → it says "turn it over", and the whole site turns upside down
 *   globe    upside down, the little snow globe from the set rolls onto the Birthdays page: tip
 *            it so the snowball slides over four stars, then into the gate
 *            → the site rolls back over and it snows
 *   locker   a coin locker on the Message page: four dials, the night the box bursts open
 *            → a photo, the Dimensional Gift, and Yuzuki and Makoto get Santa hats too
 */
export type Stage2 = 'none' | 'memories' | 'letter' | 'signal' | 'reply' | 'cipher' | 'globe' | 'locker' | 'done'
export const STAGES2: Stage2[] = ['none', 'memories', 'letter', 'signal', 'reply', 'cipher', 'globe', 'locker', 'done']
/** how many of part 1's memories come back altered */
export const MEMORIES = 4
export const past2 = (now: Stage2, s: Stage2) => STAGES2.indexOf(now) > STAGES2.indexOf(s)
/** where each challenge waits */
export const STAGE_PAGE: Partial<Record<Stage2, Page>> = { signal: 'countdown', reply: 'countdown', cipher: 'volumes', globe: 'birthdays', locker: 'message' }

/** what the light on the Countdown blinks: one of these, picked fresh each time part 2 starts */
/** what she used to blink at him between takes */
export const SIGNALS = ['HELLO STAR', 'STILL HERE', 'LOOK UP', 'STAY WARM', 'BE BRAVE', 'NOT LONG NOW', 'ALMOST DONE']
/** the word to tap back */
export const REPLY = 'UENO'
/**
 * The call sheet: written the way ??? wrote Shima's on the set, every letter moved along by how
 * old he was then (eight: part 1 says so). What it tells them to do is the answer.
 */
export const SHIFT = 8
export const CALL_SHEET = 'LITTLE STAR. THIS SITE IS MY SNOW GLOBE. TO MAKE IT SNOW, TURN IT OVER.'
export const CALL_ANSWER = 'TURN IT OVER'
/** the coin locker's number (the night the box bursts); its code is the globe's stars, this only for old saves */
export const LOCKER = '1224'

/** the parts still to come out; 5 is the final part */
export type PartNo = 2 | 3 | 4 | 5
/**
 * When each part comes out, the same moment everywhere: 22:00 in GMT+7 (15:00 UTC) on
 * 27 Nov, 3 Dec, 10 Dec, and the final part on 23 Dec, the night before the box bursts
 */
export const PART_AT: Record<PartNo, number> = {
  2: Date.parse('2026-11-27T22:00:00+07:00'),
  3: Date.parse('2026-12-03T22:00:00+07:00'),
  4: Date.parse('2026-12-10T22:00:00+07:00'),
  5: Date.parse('2026-12-23T22:00:00+07:00'),
}
/** what a part is called: the last one is "the final part" */
export const partName = (n: PartNo | 1, cap = true) => (n === 5 ? (cap ? 'The final part' : 'the final part') : `${cap ? 'Part' : 'part'} ${n}`)
/** whether a part can be played yet (the dev server can always play part 2) */
export const partOut = (n: PartNo, now = Date.now()) => now >= PART_AT[n] || (n === 2 && import.meta.env.DEV)

export const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--',
  N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
}
export const FROM_MORSE: Record<string, string> = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]))

/** push every A–Z letter `n` places along the alphabet (case kept, everything else left alone) */
export function caesar(s: string, n: number) {
  const k = ((n % 26) + 26) % 26
  return s.replace(/[a-z]/gi, (c) => {
    const base = c <= 'Z' ? 65 : 97
    return String.fromCharCode(((c.charCodeAt(0) - base + k) % 26) + base)
  })
}

export interface Part2 {
  /** the Morse message */
  signal: string
  /** how far the cipher pushes the letters (always SHIFT now; older saves may differ) */
  shift: number
  /** from the first version, which hid a word in the note (unused now) */
  word?: string
  /** the numbers on the snow globe's stars, in the order they were picked up */
  digits: number[]
  /** which altered memories have been put right (by index) */
  restored?: number[]
  /** the tabs' names have shifted (it happens partway through a scene, not when the stage starts) */
  shifted?: boolean
}

interface Saved {
  /** the scratched ticket, if any: its code and when it was scratched */
  ticket: { code: string; at: number } | null
  part1: Stage1
  /** pages whose piece of the list has been caught */
  scraps: Page[]
  /** which of ???'s riddles are solved (lanterns lit), in the order they were */
  solved: number[]
  gifts: Gift[]
  keys: string[]
  part2: Stage2
  p2: Part2 | null
}

const KEY = 'sl-quest'
const blank = (): Saved => ({ ticket: null, part1: 'none', scraps: [], solved: [], gifts: [], keys: [], part2: 'none', p2: null })

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY)
    const s: Saved = raw ? { ...blank(), ...JSON.parse(raw) } : blank()
    // saved by the first version of the quest, which went straight to the digging
    if ((s.part1 as string) === 'met') s.part1 = 'dig'
    // the riddles used to be a count, solved in order
    const old = (s as unknown as { riddles?: number }).riddles
    if (typeof old === 'number' && !s.solved.length) s.solved = Array.from({ length: old }, (_, i) => i)
    return s
  } catch {
    return blank()
  }
}

let state = load()
const listeners = new Set<() => void>()

export const quest = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l)
    return () => void listeners.delete(l)
  },
  update(fn: (s: Saved) => Saved) {
    state = fn(state)
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* private mode: this visit only */
    }
    listeners.forEach((l) => l())
  },
}

/** part 2 is under way (the site leans, its own music plays) */
export const part2On = (s: Saved = state) => s.part2 !== 'none' && s.part2 !== 'done'

/** a fresh set of answers for part 2 */
export function newPart2(): Part2 {
  const [a] = rnd(1)
  return { signal: SIGNALS[a % SIGNALS.length], shift: SHIFT, digits: [], restored: [] }
}

/**
 * While part 2 is on, the site isn't quite how it was: Yuzuki is missing from the page, the
 * birthday wheel calls her "Y.", the old ticket asks if you remember it right, the logo slips.
 * It all goes back when the site is set straight at the end.
 */
export const siteAltered = (s: Saved = state) => part2On(s)
/** a name as the altered site shows it */
export const alteredName = (name: string, altered = siteAltered()) => (altered && name === 'Yuzuki' ? 'Y.' : name)

const LETTER_EVT = 'sl-quest-letter'
/** a letter went off, from the Secret Santa tab or the Message tab */
export const questLetter = (from: 'santa' | 'message') => window.dispatchEvent(new CustomEvent(LETTER_EVT, { detail: from }))
export function onQuestLetter(fn: (from: 'santa' | 'message') => void) {
  const l = (e: Event) => fn((e as CustomEvent<'santa' | 'message'>).detail)
  window.addEventListener(LETTER_EVT, l)
  return () => window.removeEventListener(LETTER_EVT, l)
}

/**
 * Shima's cursor set is a reward still to come: it stays hidden (and a saved choice of it waits)
 * until this key is found, part 3's for now
 */
export const SHIMA_CURSOR_KEY = 'third'
export const shimaCursorUnlocked = (s: Saved = state) => s.keys.includes(SHIMA_CURSOR_KEY)

/** has Shima turned up yet (he wears the Santa hat from then on) */
export const questStarted = () => state.part1 !== 'none'

// no 0/O, 1/I/L: it gets typed in by hand
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const rnd = (n: number) => {
  const a = new Uint32Array(n)
  crypto.getRandomValues(a)
  return Array.from(a)
}

/** a fresh ticket code, e.g. UENO-7KQ4-XM2P: random for every person, every time */
export function newCode() {
  const c = rnd(8).map((v) => ALPHABET[v % ALPHABET.length])
  return `UENO-${c.slice(0, 4).join('')}-${c.slice(4).join('')}`
}

/** the scratched ticket, while it still works */
export function liveTicket(now = Date.now()) {
  const t = state.ticket
  return t && now - t.at < TICKET_LIFE ? t : null
}

/** forgiving about case, spaces and dashes */
export const normCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')

/** each gift is buried on one page and wished for by another, at a random spot near the page's edges */
export function buryGifts(): Gift[] {
  const n = PAGES.length
  // a random rotation (never 0), so no gift is buried on the page that wants it
  const shift = 1 + (rnd(1)[0] % (n - 1))
  const order = [...PAGES].sort(() => Math.random() - 0.5)
  return order.map((page, i) => {
    const left = Math.random() < 0.5
    return {
      page,
      to: order[(i + shift) % n],
      x: left ? 0.04 + Math.random() * 0.1 : 0.86 + Math.random() * 0.1,
      y: 0.34 + Math.random() * 0.5,
      found: false,
      sent: false,
    }
  })
}

/** things happening elsewhere on the site that the riddles listen for */
export type Hint = { kind: 'birthday'; name: string } | { kind: 'cover'; index: number } | { kind: 'clock'; secs: number }
const HINT = 'sl-quest-hint'
export const questHint = (h: Hint) => window.dispatchEvent(new CustomEvent(HINT, { detail: h }))
export function onQuestHint(fn: (h: Hint) => void) {
  const l = (e: Event) => fn((e as CustomEvent<Hint>).detail)
  window.addEventListener(HINT, l)
  return () => window.removeEventListener(HINT, l)
}

const EVT = 'sl-quest-gate'
/** the ticket gate behind the cover was pressed */
export const openGate = () => window.dispatchEvent(new Event(EVT))
export function onOpenGate(fn: () => void) {
  window.addEventListener(EVT, fn)
  return () => window.removeEventListener(EVT, fn)
}
