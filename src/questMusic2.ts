/**
 * The Secret Santa part 2 music, "The Tilt": the same live synth band as part 1's "Snow on the
 * Site" (no files), but the snow globe has been picked up. D minor, 132 bpm, straight sixteenths.
 */
import { reportBand, voices as V } from './sfx'
import { hz } from './gameSong'

const BPM = 132
/** the jolly version's pace */
const BPM_JOLLY = 120
const BAR = 16
const AHEAD = 0.2
let S16 = 60 / BPM / 4

// ── harmony ──────────────────────────────────────────────────────────────

interface Chord {
  root: number
  tones: number[]
  /** this chord's leading note is C♯ rather than C (the A chords) */
  sharp?: boolean
}
const ch = (root: number, tones: number[], sharp = false): Chord => ({ root, tones, sharp })
// voiced close together, so the pad moves by step from chord to chord instead of jumping
const Dm = ch(38, [62, 65, 69])
const Dm9 = ch(38, [62, 64, 65, 69])
const Bb = ch(34, [62, 65, 70])
const F = ch(41, [60, 65, 69])
const Cc = ch(36, [60, 64, 67])
const Gm = ch(43, [62, 67, 70])
const Eb = ch(39, [63, 67, 70])
const A7 = ch(45, [61, 64, 67], true)
const Asus = ch(45, [62, 64, 69], true)
// D major, for the jolly version
const Dmaj = ch(38, [62, 66, 69])
const Gmaj7 = ch(43, [62, 66, 71])
const FSm = ch(42, [61, 66, 69], true)
const Bm = ch(35, [62, 66, 71], true)
const Amaj = ch(45, [61, 64, 69], true)
// part 1's chords, for the memories
const G = ch(43, [62, 67, 71])
const Em = ch(40, [64, 67, 71])
const Cmaj = ch(36, [64, 67, 72])
const D = ch(38, [62, 66, 69])
const Em7 = ch(40, [62, 67, 71])

/** the notes of D minor (and of G major for the memories), as pitch classes */
const MINOR = [2, 4, 5, 7, 9, 10, 0]
const MAJOR_G = [7, 9, 11, 0, 2, 4, 6]
const MAJOR_D = [2, 4, 6, 7, 9, 11, 1]

/** `steps` notes along the scale from `m` (negative goes down) */
function scaleStep(m: number, steps: number, scale: number[], sharp = false) {
  const pcs = sharp ? scale.map((p) => (p === 0 ? 1 : p)) : scale
  let n = m
  let left = Math.abs(steps)
  const dir = Math.sign(steps)
  while (left > 0) {
    n += dir
    if (pcs.includes(((n % 12) + 12) % 12)) left--
  }
  return n
}

// ── tunes ────────────────────────────────────────────────────────────────

const _ = null
type Notes = (number | null)[]
/** the verse tune, one note per eighth */
const TUNE: Notes = [
  69, _, 74, _, 77, _, 76, _,
  74, _, _, 70, 74, _, _, _,
  72, _, 74, _, 77, _, 79, _,
  76, _, 72, _, 67, _, _, _,
  77, _, 81, _, 82, _, 81, 77,
  77, _, 74, 70, 74, _, 77, _,
  70, _, 74, 77, 76, _, 73, _,
  76, _, 73, _, 69, _, _, _,
]
/** the second verse's tune over its darker chords: the same, until it bends round the E♭ */
const TUNE_B: Notes = [
  ...TUNE.slice(0, 32),
  74, _, 77, _, 79, _, 77, 74,
  77, _, 74, 70, 74, _, _, _,
  79, _, 75, _, 70, _, 75, _,
  76, _, 73, _, 69, _, _, _,
]
/** the bridge: longer notes, climbing */
const BRIDGE: Notes = [
  74, _, _, _, 70, _, 72, _,
  74, _, 77, _, 74, _, _, _,
  77, _, _, _, 74, _, 76, _,
  77, _, 81, _, 77, _, _, _,
  82, _, _, _, 81, _, 79, _,
  76, _, 79, _, 76, _, 72, _,
  74, _, _, _, 76, _, _, _,
  73, _, _, _, _, _, _, _,
]
/** part 1's tune ("Snow on the Site"), one note per beat: the hook D G B A, then home */
const OLD: Notes = [
  74, 79, 83, 81, 79, 76, 79, _,
  76, 79, 84, 83, 81, 78, 74, _,
  83, 86, 88, 86, 84, 79, 79, 76,
  74, 79, 81, 78, 79, _, _, _,
]
/** a minor tune lifted into D major: F, B♭ and C each a semitone up */
const majorize = (t: Notes) => t.map((n) => (n === null ? null : [5, 10, 0].includes(((n % 12) + 12) % 12) ? n + 1 : n))

/** a tune played backwards: its bars in reverse, each bar's notes in reverse */
const backwards = (t: Notes, perBar: number) => {
  const bars = t.length / perBar
  return Array.from({ length: bars }, (_, b) => t.slice((bars - 1 - b) * perBar, (bars - b) * perBar).reverse()).flat()
}
/** just the long notes */
const longOnly = (t: Notes) => t.map((n, i) => (i % 4 === 0 ? n : null))

/** U E N O in Morse, on sixteenths: a dot is one on, a dash three, one off inside a letter, three between */
const MORSE_UENO = (() => {
  const out: boolean[] = []
  ;['..-', '.', '-.', '---'].forEach((l, i) => {
    Array.from(l).forEach((c, k) => {
      if (k) out.push(false)
      out.push(true)
      if (c === '-') out.push(true, true)
    })
    if (i < 3) out.push(false, false, false)
  })
  return out
})()

// ── the form ─────────────────────────────────────────────────────────────

type Kind = 'intro' | 'verse' | 'verse2' | 'bridge' | 'break' | 'lift' | 'turn' | 'memory'
interface Section {
  kind: Kind
  bars: number
  chords: Chord[]
}
const FORM: Section[] = [
  { kind: 'intro', bars: 4, chords: [Dm9, Dm, Bb, A7] },
  { kind: 'verse', bars: 8, chords: [Dm, Bb, F, Cc, Dm, Bb, Gm, A7] },
  { kind: 'verse2', bars: 8, chords: [Dm, Bb, F, Cc, Gm, Bb, Eb, A7] },
  { kind: 'bridge', bars: 8, chords: [Gm, Gm, Dm, Dm, Bb, Cc, Asus, A7] },
  { kind: 'break', bars: 4, chords: [Dm9, Dm9, Bb, A7] },
  { kind: 'lift', bars: 8, chords: [Dm, Bb, F, Cc, Dm, Bb, Gm, A7] },
  { kind: 'turn', bars: 4, chords: [Bb, Cc, A7, A7] },
]
/** the jolly version's form: the same shape, happy chords, a sleigh-bell break instead of the clock */
const JOLLY_FORM: Section[] = [
  { kind: 'intro', bars: 4, chords: [Dmaj, G, Dmaj, A7] },
  { kind: 'verse', bars: 8, chords: [Dmaj, G, FSm, A7, Dmaj, Gmaj7, Em7, A7] },
  { kind: 'verse2', bars: 8, chords: [Dmaj, G, FSm, A7, Bm, Gmaj7, Em7, A7] },
  { kind: 'bridge', bars: 8, chords: [G, Bm, Dmaj, Dmaj, G, A7, Asus, A7] },
  { kind: 'break', bars: 4, chords: [Dmaj, G, Amaj, A7] },
  { kind: 'lift', bars: 8, chords: [Dmaj, G, FSm, A7, Dmaj, Gmaj7, Em7, A7] },
  { kind: 'turn', bars: 4, chords: [G, Amaj, A7, A7] },
]

/** the memories have a form of their own: part 1's tune, then again with the glock answering */
const MEMORY_FORM: Section[] = [
  { kind: 'memory', bars: 8, chords: [G, Em, Cmaj, D, Em7, Cmaj, G, G] },
  { kind: 'memory', bars: 8, chords: [G, Em, Cmaj, D, Em7, Cmaj, D, G] },
]

export type Motif2 = 'tilt' | 'signal' | 'shift' | 'flip' | 'memory' | 'reveal'
type Lead = 'pluck' | 'bell' | 'reed' | 'whistle' | 'box'
type Groove = 'none' | 'creep' | 'drive' | 'broken' | 'half' | 'tick' | 'bounce' | 'sleigh'
type BassPat = 'walk' | 'pulse' | 'sync' | 'pedal' | 'drone' | 'none'
type Fill = 'toms' | 'roll' | 'stop' | 'tape'
type Dress = 'ornament' | 'answer' | 'thirds' | 'push' | 'wrong'

/** one note to play, at a sixteenth within the section */
interface Note {
  m: number
  /** in sixteenths */
  len: number
  voice: 'lead' | 'answer' | 'harm'
  /** played a semitone off first, then corrected */
  wrong?: number
}

/** a small seeded random, so an arrangement can be rolled once and kept for the section */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)]

/** how a section is played this time round */
interface Arrangement {
  lead: Lead
  groove: Groove
  bass: BassPat
  arp: number
  fill: Fill
  notes: Map<number, Note[]>
  chords: Chord[]
  /** how far up the whole section is moved */
  lift: number
}

/** turn a tune (one note per `per` sixteenths) into notes, dressed up */
function dress(tune: Notes, per: number, chords: Chord[], how: Dress[], r: () => number, scale: number[], wrongChance: number) {
  const notes = new Map<number, Note[]>()
  const add = (at: number, n: Note) => {
    if (at < 0) return
    const list = notes.get(at) ?? []
    list.push(n)
    notes.set(at, list)
  }
  const slots = tune.length
  const barOf = (at: number) => Math.min(chords.length - 1, Math.floor(at / BAR))
  for (let i = 0; i < slots; i++) {
    const m = tune[i]
    if (m === null || m === undefined) continue
    let at = i * per
    // how long until the next note
    let gap = 1
    while (i + gap < slots && tune[i + gap] === null) gap++
    const len = Math.min(gap * per, per * 4)
    const c = chords[barOf(at)]
    // pushed: notes on the offbeat come a sixteenth early, for a bit of urgency
    if (how.includes('push') && i % 2 === 1 && r() < 0.6) at -= 1
    const wrong = how.includes('wrong') && r() < wrongChance ? (r() < 0.5 ? 1 : -1) : undefined
    add(at, { m, len, voice: 'lead', wrong })
    // a harmony a third below, on the beats
    if (how.includes('thirds') && i % 2 === 0) add(at, { m: scaleStep(m, -2, scale, c.sharp), len, voice: 'harm' })
    // passing notes walking up or down into the next note, in the gaps
    const next = tune[i + gap]
    if (how.includes('ornament') && next && gap >= 2 && r() < 0.65) {
      const dir = Math.sign(next - m) || 1
      add(at + (gap - 1) * per, { m: scaleStep(next, -dir, scale, c.sharp), len: 1, voice: 'lead' })
      if (gap >= 3 && r() < 0.5) add(at + (gap - 1) * per + 1, { m: scaleStep(next, -dir, scale, c.sharp), len: 1, voice: 'lead' })
    }
  }
  // answered: where a bar ends in a long rest, a second voice echoes its opening notes, lower
  if (how.includes('answer')) {
    const perBar = BAR / per
    for (let b = 0; b < slots / perBar; b++) {
      const bar = tune.slice(b * perBar, (b + 1) * perBar)
      const tailEmpty = bar.slice(Math.ceil(perBar * 0.6)).every((n) => n === null)
      if (!tailEmpty) continue
      const heard = bar.filter((n): n is number => n !== null).slice(0, 3)
      heard.forEach((m, k) => add(b * BAR + 10 + k * 2, { m: m - 12, len: 2, voice: 'answer' }))
    }
  }
  return notes
}

// ── the band ─────────────────────────────────────────────────────────────

const human = (amt = 0.08) => 1 + (Math.random() * 2 - 1) * amt

/** each lead instrument: a note `m`, `d` seconds from now, `len` seconds long */
const LEADS: Record<Lead, (m: number, d: number, len: number, g: number) => void> = {
  // a bright pluck, with its echo a dotted eighth later
  pluck: (m, d, _len, g) => {
    V.pluck({ f: hz(m), dur: 0.9, g: 0.036 * g * human(), delay: d, wood: 0.28 })
    V.tone({ f: hz(m), dur: 0.24, type: 'triangle', g: 0.011 * g, a: 0.004, delay: d })
    V.pluck({ f: hz(m), dur: 0.6, g: 0.011 * g, delay: d + S16 * 3, wood: 0.15, pan: 0.4 })
  },
  // a celesta-like bell: a struck note and its octave shimmer
  bell: (m, d, _len, g) => {
    V.pluck({ f: hz(m + 12), dur: 1.4, g: 0.026 * g * human(), delay: d, wood: 0.08 })
    V.tone({ f: hz(m + 12) * 2, dur: 0.35, g: 0.006 * g, a: 0.003, delay: d })
    V.pluck({ f: hz(m + 12), dur: 0.8, g: 0.008 * g, delay: d + S16 * 3, wood: 0.05, pan: -0.4 })
  },
  // a soft reed: square and triangle together, held for the note
  reed: (m, d, len, g) => {
    V.tone({ f: hz(m), dur: Math.max(0.12, len * 0.92), type: 'square', g: 0.0045 * g, a: 0.025, delay: d })
    V.tone({ f: hz(m), dur: Math.max(0.12, len * 0.92), type: 'triangle', g: 0.016 * g, a: 0.02, delay: d })
  },
  whistle: (m, d, len, g) => V.whistle({ f: hz(m), dur: Math.max(0.15, len), g: 0.024 * g, delay: d }),
  // a music box: thin, bright, a long ring, a little out of tune
  box: (m, d, _len, g) => {
    V.pluck({ f: hz(m + 12) * human(0.004), dur: 1.6, g: 0.024 * g * human(), delay: d, wood: 0.05 })
    V.tone({ f: hz(m + 12) * 3.01, dur: 0.4, g: 0.004 * g, a: 0.002, delay: d })
  },
}
/** the answering voice: a low, round pluck */
const answer = (m: number, d: number) => V.pluck({ f: hz(m), dur: 0.7, g: 0.026 * human(), delay: d, wood: 0.4, pan: -0.35 })
/** the harmony under the lead: quieter, the same instrument's body */
const harm = (m: number, d: number, len: number) => V.tone({ f: hz(m), dur: Math.max(0.15, len * 0.9), type: 'triangle', g: 0.009, a: 0.02, delay: d })
const beep = (d: number, len: number) => V.tone({ f: hz(93), dur: len, type: 'sine', g: 0.013, a: 0.004, delay: d })
const glock = (m: number, d: number, g = 1) => {
  V.pluck({ f: hz(m), dur: 0.7, g: 0.019 * g * human(), delay: d, wood: 0.1 })
  V.tone({ f: hz(m) * 2, dur: 0.2, g: 0.005 * g, a: 0.002, delay: d })
}
const bassNote = (m: number, d: number, g = 1, len = 0.24) => V.pluck({ f: hz(m), dur: len, g: 0.06 * g * human(), delay: d, wood: 0.55 })
const sub = (m: number, d: number, len: number, g = 1) => V.tone({ f: hz(m - 12), dur: len, type: 'sine', g: 0.05 * g, a: 0.01, delay: d })
const cello = (m: number, d: number, len: number) => V.tone({ f: hz(m), dur: len, type: 'triangle', g: 0.018, a: len * 0.3, delay: d })
const kick = (d: number, v = 1) => V.tone({ f: 120, f2: 45, dur: 0.22, g: 0.1 * v, a: 0.002, delay: d })
const hat = (d: number, v = 1, open = false) => V.noise({ dur: open ? 0.16 : 0.03, f: 9000, q: 1.2, g: 0.006 * v, a: 0.001, delay: d, type: 'highpass' })
const snare = (d: number, v = 1) => {
  V.noise({ dur: 0.14, f: 2600, q: 0.7, g: 0.032 * v, a: 0.002, delay: d })
  V.tone({ f: 210, f2: 160, dur: 0.08, g: 0.02 * v, delay: d })
}
const rim = (d: number, v = 1) => V.tone({ f: 1800, f2: 1500, dur: 0.03, g: 0.014 * v, a: 0.001, delay: d })
/** sleigh bells: a few tiny jingles smeared together */
const sleigh = (d: number, v = 1) => {
  V.noise({ dur: 0.05, f: 6400, q: 7, g: 0.011 * v, a: 0.002, delay: d })
  V.noise({ dur: 0.04, f: 8300, q: 8, g: 0.008 * v, a: 0.002, delay: d + 0.008 })
  V.noise({ dur: 0.035, f: 10200, q: 9, g: 0.005 * v, a: 0.002, delay: d + 0.016 })
}
/** a handclap: a few tiny bursts smeared together */
const clap = (d: number, v = 1) => {
  for (let i = 0; i < 3; i++) V.noise({ dur: 0.012, f: 1500, q: 1.2, g: 0.016 * v, a: 0.001, delay: d + i * 0.009 })
  V.noise({ dur: 0.09, f: 1300, q: 1, g: 0.022 * v, a: 0.002, delay: d + 0.027 })
}
/** the clock in the breakdown: a dry woodblock */
const tock = (d: number, hi: boolean) => V.pluck({ f: hi ? 1568 : 1175, dur: 0.06, g: 0.022, delay: d, wood: 0.9 })
const tom = (m: number, d: number, v = 1) => V.tone({ f: hz(m), f2: hz(m) * 0.7, dur: 0.2, g: 0.05 * v, a: 0.003, delay: d })
const crash = (d: number) => V.noise({ dur: 1.4, f: 6000, q: 0.4, g: 0.026, a: 0.004, delay: d })
const riser = (d: number, len: number, g = 0.016) => V.noise({ dur: len, f: 400, f2: 6000, q: 0.8, g, a: len * 0.9, delay: d })
function pad(tones: number[], len: number, d: number, reversed = false, g = 1) {
  // reversed: it swells in over the whole bar and cuts off, like tape played backwards
  tones.forEach((m) =>
    V.tone({ f: hz(m - 12) * human(0.002), dur: len + (reversed ? 0.02 : 0.3), type: 'triangle', g: (reversed ? 0.011 : 0.008) * g, a: reversed ? len * 0.95 : len * 0.35, delay: d }),
  )
}

// ── the engine ───────────────────────────────────────────────────────────

const ONE = '__slQuestMusic2'
const owner = window as unknown as Record<string, number | undefined>
const killOthers = () => {
  if (owner[ONE]) clearInterval(owner[ONE])
  owner[ONE] = 0
}
let timer = 0
let next = 0
let level = 0
let motif: Motif2 = 'tilt'
/** the quest's tense version, or the jolly one for after part 2 */
export type Mode2 = 'tilt' | 'jolly'
let mode: Mode2 = 'tilt'
let cued: Motif2 | null = null
/** where we are: which section of the form, which bar of it, which sixteenth */
let sec = 0
let bar = 0
let step = 0
/** every section played so far (seeds each arrangement, so no two are alike) */
let played = 0
let arr!: Arrangement
/** a bar that ends on a dead stop: everything but the swell drops out for its second half */
let stopping = false
/** a crash on the next downbeat, after a fill */
let crashNext = false

const form = () => (mode === 'jolly' ? JOLLY_FORM : motif === 'memory' ? MEMORY_FORM : FORM)
const section = () => form()[sec % form().length]

/** roll how this section will be played */
function arrange(): Arrangement {
  const S = section()
  const r = rng(played * 7919 + sec * 104729 + 17)
  const lift = S.kind === 'lift' ? 2 : 0
  const chords0 = motif === 'flip' && S.kind !== 'memory' ? [...S.chords].reverse() : S.chords
  const chords = chords0.map((c) => ({ ...c, root: c.root + lift, tones: c.tones.map((t) => t + lift) }))
  const jolly = mode === 'jolly'
  const scale = S.kind === 'memory' ? MAJOR_G : (jolly ? MAJOR_D : MINOR).map((p) => (p + lift) % 12)
  // the lead and how the tune is dressed: rolled fresh each time
  const LEAD_ROLL: Lead[] = jolly ? ['bell', 'pluck', 'whistle', 'bell', 'pluck'] : ['pluck', 'bell', 'reed', 'pluck', 'whistle', 'bell']
  const DRESS_ROLL: Dress[][] = [[], ['ornament'], ['answer'], ['thirds', 'answer'], ['push', 'answer'], ['ornament', 'thirds'], ['ornament', 'wrong'], ['answer', 'wrong']]
  let lead: Lead = pick(r, LEAD_ROLL)
  let how: Dress[] = pick(r, DRESS_ROLL)
  let groove: Groove = pick(r, (jolly ? ['bounce', 'bounce', 'drive'] : ['drive', 'broken', 'drive']) as Groove[])
  let bass: BassPat = pick(r, ['walk', 'pulse', 'sync'] as BassPat[])
  const fill: Fill = pick(r, ['toms', 'roll', 'stop', 'tape', 'toms'] as Fill[])
  const arp = Math.floor(r() * 4)
  let tune: Notes = []
  let per = 2
  let wrongChance = 0.06

  switch (S.kind) {
    case 'intro':
      // the hook, one note a bar, on bells
      tune = [69, _, _, _, _, _, _, _, 74, _, _, _, _, _, _, _, 77, _, _, _, _, _, _, _, 76, _, _, _, _, _, _, _]
      lead = 'bell'
      how = []
      groove = 'creep'
      bass = 'drone'
      break
    case 'verse':
    case 'lift':
      tune = TUNE
      if (S.kind === 'lift') {
        // the high verse: everything in, the tune answered and harmonised
        how = Array.from(new Set([...how, 'answer', 'thirds'])) as Dress[]
        groove = 'drive'
      }
      break
    case 'verse2':
      tune = TUNE_B
      break
    case 'bridge':
      tune = BRIDGE
      lead = pick(r, ['whistle', 'reed', 'bell'] as Lead[])
      how = how.filter((h) => h !== 'push' && h !== 'thirds')
      groove = 'half'
      bass = 'pedal'
      break
    case 'break':
      // the hook alone on a music box, slow, one note wrong
      tune = [69, _, _, _, 74, _, _, _, 77, _, _, _, 76, _, _, _, 74, _, _, _, 70, _, _, _, 69, _, _, _, _, _, _, _]
      lead = 'box'
      how = ['wrong']
      wrongChance = 0.35
      groove = 'tick'
      bass = 'none'
      break
    case 'turn':
      tune = [72, _, 74, _, 76, _, 77, _, 79, _, 77, _, 76, _, 74, _, 73, _, _, _, 76, _, _, _, 73, _, 76, _, 79, _, 81, _]
      how = ['push']
      groove = 'drive'
      break
    case 'memory':
      tune = OLD
      per = 4
      lead = 'box'
      how = played % 2 ? ['answer', 'wrong'] : ['wrong']
      wrongChance = 0.12
      groove = 'none'
      bass = 'none'
      break
  }

  // the jolly version: the tune in major, no wrong notes, sleigh bells in the break
  if (jolly) {
    tune = majorize(tune)
    how = how.filter((h) => h !== 'wrong')
    if (S.kind === 'break') {
      lead = 'bell'
      groove = 'sleigh'
      bass = 'pulse'
    } else if (S.kind === 'bridge') groove = 'half'
    else if (S.kind === 'intro') groove = 'creep'
    // happy instruments only: no reed, no music box
    if (lead === 'reed') lead = 'whistle'
    if (lead === 'box' && S.kind !== 'break') lead = 'bell'
  }

  // the story's colour over it
  if (!jolly && S.kind !== 'memory' && S.kind !== 'break') {
    if (motif === 'flip') {
      tune = backwards(tune, BAR / per)
      lead = pick(r, ['box', 'bell'] as Lead[])
      groove = 'half'
    } else if (motif === 'shift') {
      how = Array.from(new Set([...how, 'push'])) as Dress[]
      groove = 'broken'
      bass = 'sync'
    } else if (motif === 'signal') {
      groove = 'broken'
      if (lead === 'whistle') lead = 'pluck'
    } else if (motif === 'reveal') {
      tune = longOnly(tune)
      lead = 'whistle'
      how = how.filter((h) => h === 'wrong' || h === 'answer')
      groove = 'half'
      bass = 'pedal'
    }
  }
  const shifted = motif === 'shift' && S.kind !== 'memory' && S.kind !== 'break'
  const tuneLifted = tune.map((n) => (n === null ? null : n + lift))
  const notes = dress(tuneLifted, per, chords, how, r, scale, wrongChance)
  // shift: every note of the tune a sixteenth late
  const final = shifted ? new Map([...notes].map(([k, v]) => [k + 1, v])) : notes
  return { lead, groove, bass, arp, fill, notes: final, chords, lift }
}

/** where the walking bass goes in a bar, eighth by eighth, heading for the next chord at the end */
function walk(c: Chord, nextC: Chord, e8: number) {
  const r = c.root + 12
  if (e8 === 7) {
    const to = nextC.root + 12
    return to === r ? r + 7 : to > r ? to - 1 : to + 2
  }
  return [r, r, r + 7, r + 12, r, r + 7, r + 12, r][e8]
}

function play(t: number) {
  // the jolly version swings: every second sixteenth comes a little late
  const d = Math.max(0, t - V.now()) + (mode === 'jolly' && step % 2 === 1 ? S16 * 0.3 : 0)
  const S = section()
  const c = arr.chords[bar] ?? arr.chords[0]
  const nextC = arr.chords[bar + 1] ?? form()[(sec + 1) % form().length].chords[0]
  const beat = step % 4 === 0
  const lastBar = bar === S.bars - 1
  const quiet = stopping && step >= 8
  const at = bar * BAR + step

  if (crashNext && step === 0 && bar === 0) {
    crashNext = false
    if (level >= 2 && arr.groove !== 'none') crash(d)
  }

  // the tune, and its answers and harmony
  const here = arr.notes.get(at)
  if (here) {
    for (const n of here) {
      const len = n.len * S16
      if (n.voice === 'answer') {
        if (level >= 1) answer(n.m, d)
      } else if (n.voice === 'harm') {
        if (level >= 1) harm(n.m, d, len)
      } else if (n.wrong) {
        // a semitone off, then put right a sixteenth later
        LEADS[arr.lead](n.m + n.wrong, d, S16 * 0.9, 0.8)
        LEADS[arr.lead](n.m, d + S16, Math.max(S16, len - S16), 1)
      } else LEADS[arr.lead](n.m, d, len, 1)
    }
  }
  // the beeper taps U E N O over the verses while the signal's on
  if (motif === 'signal' && (S.kind === 'verse' || S.kind === 'verse2' || S.kind === 'lift')) {
    const i = (bar % 4) * BAR + step
    if (MORSE_UENO[i] && !MORSE_UENO[i - 1]) {
      let len = 1
      while (MORSE_UENO[i + len]) len++
      beep(d, S16 * len * 0.9)
    }
  }

  // the pad at the top of the bar (a reversed swell when it's turned over)
  if (step === 0) pad(c.tones, S16 * BAR, d, motif === 'flip', S.kind === 'break' ? 1.3 : 1)
  if (quiet && step === 8 && arr.fill === 'stop') riser(d, S16 * 8, 0.022)

  // the bass
  if (!quiet) {
    const e8 = step % 2 === 0 ? step / 2 : -1
    const r0 = c.root + 12
    switch (arr.bass) {
      case 'walk':
        if (e8 >= 0) bassNote(walk(c, nextC, e8), d, beat ? 1 : 0.7)
        break
      case 'pulse':
        if (e8 >= 0) bassNote(r0 + (e8 % 2 ? 12 : 0), d, beat ? 1 : 0.6)
        break
      case 'sync':
        if ([0, 3, 6, 10, 12].includes(step)) bassNote(step === 10 ? r0 + 7 : r0, d, step === 0 ? 1 : 0.75)
        break
      case 'pedal':
        if (step === 0 || step === 8) bassNote(r0, d, 0.9, 0.6)
        if (step === 14) bassNote(r0 + 12, d, 0.5)
        break
      case 'drone':
        if (step === 0) sub(c.root + 12, d, S16 * BAR * 0.9, 0.8)
        break
      case 'none':
        break
    }
    if (S.kind === 'memory' && step === 0) V.pluck({ f: hz(c.root), dur: 1.2, g: 0.04, delay: d, wood: 0.2 })
  }

  // the drums
  const drums = arr.groove === 'none' ? 0 : level
  if (drums >= 1 && !quiet) {
    switch (arr.groove) {
      case 'creep':
        // the intro: hats creeping in, louder each bar
        if (step % 2 === 0) hat(d, 0.25 + bar * 0.2)
        break
      case 'drive':
        hat(d, step % 4 === 2 ? 1 : 0.45, step === 14 && bar % 2 === 1)
        if (step === 0 || step === 8) kick(d)
        if (drums >= 1.5 && (step === 6 || (step === 11 && bar % 2))) kick(d, 0.6)
        break
      case 'broken':
        if (step % 2 === 0) hat(d, step % 4 === 2 ? 0.9 : 0.4)
        else if (Math.random() < 0.3) hat(d, 0.2)
        if (step === 0 || step === 7 || step === 10) kick(d, step ? 0.75 : 1)
        if (step === 6 || step === 15) rim(d, 0.8)
        break
      case 'half':
        if (step % 4 === 2) hat(d, 0.6)
        if (step === 0 || (step === 10 && bar % 2)) kick(d, step ? 0.6 : 1)
        break
      case 'bounce':
        // the jolly groove: kick on one and three, claps on two and four, sleigh bells on the offbeats
        if (step % 2 === 0) hat(d, step % 4 === 2 ? 0.7 : 0.35)
        if (step % 4 === 2) sleigh(d, 0.9)
        if (step === 0 || step === 8 || (step === 10 && bar % 2 === 1)) kick(d, step === 10 ? 0.6 : 0.9)
        if (drums >= 1.5 && (step === 4 || step === 12)) clap(d, 0.7)
        break
      case 'sleigh':
        // the break, jolly: just sleigh bells and claps
        if (step % 2 === 0) sleigh(d, step % 4 === 2 ? 1 : 0.5)
        if (step === 4 || step === 12) clap(d, 0.6)
        break
      case 'tick':
        // the breakdown: a clock, and a heartbeat under it
        if (step % 4 === 0) tock(d, step % 8 === 0)
        if (step === 0 || step === 3) kick(d, step ? 0.45 : 0.7)
        break
    }
  }
  // the snare, sub and counter-line
  if (drums >= 2 && !quiet) {
    if (arr.groove === 'drive' || arr.groove === 'broken' || arr.groove === 'bounce') {
      if (step === 4 || step === 12) {
        // the jolly version doubles its backbeat with a clap, and keeps the snare softer
        if (mode === 'jolly') clap(d, 0.5)
        snare(d, mode === 'jolly' ? 0.55 : 1)
      }
    } else if (arr.groove === 'half' && step === 8) snare(d)
    if (beat && arr.bass !== 'none' && arr.bass !== 'drone') sub(c.root + 12, d, S16 * 3.5, 0.9)
    if (step === 0 && (S.kind === 'verse2' || S.kind === 'bridge' || S.kind === 'lift')) cello(c.tones[1] - 12, d, S16 * BAR * 0.95)
  }
  // fills into the next section
  if (lastBar && level >= 2 && arr.groove !== 'none' && arr.groove !== 'creep') {
    if (arr.fill === 'toms' && step >= 8 && step % 2 === 0) tom(50 - (step - 8), d, 0.6 + (step - 8) * 0.08)
    if (arr.fill === 'roll' && step >= 8) snare(d, 0.2 + (step - 8) * 0.1)
    if (arr.fill === 'tape' && step === 12) {
      // a tape-stop: the chord slides down and dies
      c.tones.forEach((m) => V.tone({ f: hz(m), f2: hz(m) / 4, dur: S16 * 4, type: 'triangle', g: 0.014, a: 0.01, delay: d }))
    }
    if (step === 15) crashNext = true
  }
  // the arpeggio
  if (level >= 3 && !quiet && S.kind !== 'break' && S.kind !== 'memory' && arr.groove !== 'half') {
    const up = [...c.tones, c.tones[0] + 12]
    const pat = [up, [...up].reverse(), [...up, ...up.slice(1, -1).reverse()], [up[0], up[2], up[1], up[3]]][arr.arp]
    glock(pat[step % pat.length] + 12, d, beat ? 0.85 : 0.5)
    if (lastBar && step === 0) riser(d, S16 * BAR)
  }
}

function startSection() {
  arr = arrange()
  stopping = false
  played++
}

function advance() {
  step++
  if (step < BAR) return
  step = 0
  bar++
  const S = section()
  // a dead stop at the end of a section: the last bar's second half falls silent
  stopping = bar === S.bars - 1 && arr.fill === 'stop' && level >= 2
  // a cue from the story comes in on the next four-bar line, without restarting the song
  if (cued && bar % 4 === 0) {
    const c = cued
    cued = null
    if (c !== motif) {
      const wasMemory = motif === 'memory'
      motif = c
      if (c === 'memory' || wasMemory) {
        // into or out of the memories: start that form from the top (out of them, at the verse)
        sec = c === 'memory' ? 0 : 1
        bar = 0
        return startSection()
      }
      // the same place in the song, played the new way
      const keep = bar
      arr = arrange()
      bar = keep
    }
  }
  if (bar < S.bars) return
  bar = 0
  sec = (sec + 1) % form().length
  startSection()
}

const busy = () =>
  !!document.querySelector('.sx') || Array.from(document.querySelectorAll('video')).some((v) => !v.paused && !v.muted)

function loop() {
  const now = V.now()
  if (busy()) {
    next = now + 0.1
    return
  }
  if (!Number.isFinite(next) || next < now - 0.2) next = now + 0.05
  while (next < now + AHEAD) {
    play(next)
    next += S16
    advance()
  }
}

export const questMusic2 = {
  start(intensity = 0) {
    this.setLevel(intensity)
    if (timer && owner[ONE] !== timer) timer = 0
    if (timer) return
    if (cued) motif = cued
    cued = null
    // a fresh run starts on the intro (or the memories' own form); the arrangement is new each time
    sec = 0
    bar = 0
    step = 0
    played = Math.floor(Math.random() * 1000)
    startSection()
    next = V.now() + 0.08
    killOthers()
    timer = window.setInterval(loop, 25)
    owner[ONE] = timer
  },
  /** the quest's tense version, or the jolly one; switching starts the song again from the top */
  setMode(m: Mode2) {
    if (m === mode) return
    mode = m
    S16 = 60 / (m === 'jolly' ? BPM_JOLLY : BPM) / 4
    if (m === 'jolly') motif = 'tilt'
    if (timer) {
      sec = 0
      bar = 0
      step = 0
      startSection()
    }
  },
  get mode() {
    return mode
  },
  setLevel(v: number) {
    if (Number.isFinite(v)) level = Math.max(0, Math.min(3, v))
  },
  cue(name: Motif2) {
    if (!timer) {
      cued = name
      return
    }
    if (name !== motif) cued = name
  },
  /** a moment in the story, played straight away over whatever's going */
  hit(kind: 'tilt' | 'flip' | 'settle') {
    if (!V.live()) return
    const d = 0.02
    if (kind === 'tilt') {
      // a boom, and the hook falling down the chord
      V.tone({ f: hz(26), f2: hz(19), dur: 1.2, g: 0.12, a: 0.005, delay: d })
      riser(d, 0.5, 0.02)
      ;[81, 77, 74, 69].forEach((m, i) => LEADS.pluck(m, d + 0.12 + i * 0.09, 0.2, 0.9))
      pad([62, 65, 69], 1.4, d)
    } else if (kind === 'flip') {
      // a swell sucked in backwards, a crash as it lands, the hook upside down
      riser(d, 1.3, 0.03)
      pad([62, 65, 70], 1.3, d, true)
      const land = d + 1.35
      crash(land)
      V.tone({ f: hz(26), f2: hz(14), dur: 1.6, g: 0.14, a: 0.004, delay: land })
      ;[69, 74, 77, 76].forEach((m, i) => LEADS.box(m, land + 0.1 + i * 0.16, 0.3, 1.2))
    } else {
      // set straight: the hook, resolved, in D major
      ;[69, 74, 78, 76, 74].forEach((m, i) => LEADS.box(m, d + i * 0.15, 0.3, 1.1))
      pad([62, 66, 69, 74], 2.2, d + 0.5)
      sub(50, d + 0.5, 1.8)
    }
  },
  stop(hit = false) {
    if (timer) clearInterval(timer)
    if (owner[ONE] === timer) owner[ONE] = 0
    timer = 0
    if (hit && V.live()) {
      ;[69, 74, 77, 76].forEach((m, i) => LEADS.pluck(m + 12, 0.05 + i * 0.13, 0.3, 1.2))
      pad([62, 66, 69, 74], 1.8, 0.6)
      sub(50, 0.6, 1.6)
      LEADS.bell(78, 0.6, 1, 1)
    }
  },
  get playing() {
    return !!timer && owner[ONE] === timer
  },
  get state() {
    const S = section()
    return { level, bpm: mode === 'jolly' ? BPM_JOLLY : BPM, mode, motif, section: S.kind, bar, lead: arr?.lead, groove: arr?.groove, bass: arr?.bass }
  },
}

reportBand(() => questMusic2.playing && !busy())

import.meta.hot?.dispose(() => {
  if (timer) clearInterval(timer)
  timer = 0
  killOthers()
})
