/**
 * The Secret Santa quests. A chain of hidden steps, one part at a time, remembered on this
 * device only (like the other secrets). Nothing about it is announced on the page.
 *
 * Part 1, "Beginning":
 *   1. scratch the Ueno Park ticket tucked into the very first update (the code is new each time)
 *   2. put the code through the ticket gate behind volume 1's cover
 *      → Shima walks in and jumps out of his skin, calls Mitsumi, and the site sinks into the void;
 *        Mitsumi runs in and Shima admits he lost the list and buried the gifts
 *   3. catch the five torn pieces of the list as they blow across the pages
 *   4. tape the list back together
 *      → on the back, in someone else's handwriting, three riddles signed "???"
 *   5. solve them: knock on the countdown when its seconds read 25, turn the birthday wheel to
 *      the friend born closest to Christmas, open the book marked with a shrine gate
 *      → flashbacks to how ??? handed them this job; the frozen snow lets go
 *   6. dig the gifts out of the snow, one on each page
 *   7. send each gift to the tab that wished for it (the list says who wants what)
 *      → a key turns up in the snow, and ??? finally speaks: the first key, for part 2
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
}

const KEY = 'sl-quest'
const blank = (): Saved => ({ ticket: null, part1: 'none', scraps: [], solved: [], gifts: [], keys: [] })

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
