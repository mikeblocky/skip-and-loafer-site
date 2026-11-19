/**
 * Hidden extras. Nothing here is announced on the page: each one is found by playing with
 * something that's already there, and found ones are remembered on this device only.
 */

export type SecretId = 'gacha' | 'skip' | 'poll' | 'quiz'

export interface SecretInfo {
  id: SecretId
  /** written lowercase on purpose, like the rest of the site's small UI text */
  title: string
}

export const SECRETS: SecretInfo[] = [
  { id: 'gacha', title: 'capsule gacha' },
  { id: 'skip', title: 'skip to school' },
  { id: 'poll', title: 'find your friends' },
  { id: 'quiz', title: 'skip and loafer quiz' },
]

const KEY = 'sl-secrets'

interface Saved {
  found: SecretId[]
  /** gacha: best rarity pulled per character (0–3) and pull counts */
  dex: Record<string, { best: number; count: number }>
  pulls: number
  skipBest: number
  /** best scores in the other games (quizBest was out of 5 before the quiz became endless) */
  quizBest: number
  gachaBest: number
  pollBest: number
  /** who you'd walk to school with: your buddy in find your friends */
  vote: string | null
}

const blank = (): Saved => ({ found: [], dex: {}, pulls: 0, skipBest: 0, quizBest: 0, gachaBest: 0, pollBest: 0, vote: null })

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...blank(), ...JSON.parse(raw) } : blank()
  } catch {
    return blank()
  }
}

let state = load()
const listeners = new Set<() => void>()

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* private mode: works for this visit only */
  }
  listeners.forEach((l) => l())
}

export const secrets = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l)
    return () => void listeners.delete(l)
  },
  update(fn: (s: Saved) => Saved) {
    state = fn(state)
    save()
  },
}

const OPEN = 'sl-secret-open'

/** Open a secret (and mark it found). Called from wherever its trigger lives. */
export function openSecret(id: SecretId) {
  window.dispatchEvent(new CustomEvent(OPEN, { detail: id }))
}

export function onOpenSecret(fn: (id: SecretId) => void) {
  const h = (e: Event) => fn((e as CustomEvent<SecretId>).detail)
  window.addEventListener(OPEN, h)
  return () => window.removeEventListener(OPEN, h)
}
