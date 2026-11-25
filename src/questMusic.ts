/**
 * The Secret Santa music, "Snow on the Site": cosy and jolly, at one steady tempo (112 bpm),
 * played live on the site's synth voices (no files), on the music bus.
 *
 * So it doesn't feel like one tune on repeat, it's built from leitmotifs. Each is eight bars
 * with its own melody, chords and lead instrument, and they take turns, the main theme coming
 * back in between (an octave up every other time):
 *   main     the theme, on celesta. G · Em · C · D · G · B7 · C · Cm→D
 *   mitsumi  bright and hopping, on whistle. G · C · G · D · Em · C · D · G
 *   shima    laid back and offbeat, on vibes. Cmaj7 · Bm7 · Am7 · D, twice
 *   mystery  ???: a sparse music box in E minor, the drums kept down. Em · C · Am · B7, twice
 *   lights   Ueno's winter lights: long whistle notes over a glock arpeggio. C · D · Bm · Em · Am · D · G
 * The story can cue one (`cue`), and it comes in at the next half-phrase.
 *
 * The pace never changes; what grows as the quest goes on is the band, layer by layer:
 *   0  sleigh bells, a pizzicato bass, a warm pad, the motif's tune
 *   1  a glock answering, a soft kick, a shaker
 *   2  brushes and a soft clap on two and four, a bass bouncing root to octave, offbeat strums
 *   3  a tambourine with the claps, a marimba note once a bar, bell runs at the end of phrases
 * (nothing ever runs faster than the eighths)
 *
 * It rests while something else has the music: one of the hidden games, or an OP/ED video.
 */
import { voices as V } from './sfx'
import { hz } from './gameSong'

const BPM = 112
/** sixteenth notes in a bar, bars in a motif */
const BAR = 16
const BARS = 8
const AHEAD = 0.2

interface Chord {
  root: number
  tones: number[]
}
const ch = (root: number, ...tones: number[]): Chord => ({ root, tones })
const G = ch(43, 67, 71, 74)
const Em = ch(40, 64, 67, 71)
const Cmaj = ch(36, 64, 67, 72)
const D = ch(38, 66, 69, 74)
const B7 = ch(35, 63, 66, 69, 71)
const Cm = ch(36, 63, 67, 72)
const Am = ch(45, 64, 69, 72)
const Bm = ch(35, 62, 66, 71)
const Cmaj7 = ch(36, 64, 67, 71)
const Bm7 = ch(35, 62, 66, 69)
const Am7 = ch(33, 60, 64, 67)

export type MotifName = 'main' | 'mitsumi' | 'shima' | 'mystery' | 'lights'
type Lead = 'celesta' | 'whistle' | 'vibes' | 'musicbox'
interface Motif {
  /** one chord per bar, or two (the second from halfway) */
  chords: [Chord, Chord?][]
  /** one note per eighth (null rests), eight bars of eight */
  tune: (number | null)[]
  lead: Lead
  /** how long each tune note rings, in sixteenths */
  hold?: number
  /** the glock's answer in the gaps, if this motif has one */
  answer?: (number | null)[]
  /** a glock running up and down the chord on the eighths */
  arp?: boolean
  /** keep the drums down (just the kick and shaker at most) */
  hushed?: boolean
}

const _ = null
const MOTIFS: Record<MotifName, Motif> = {
  main: {
    chords: [[G], [Em], [Cmaj], [D], [G], [B7], [Cmaj], [Cm, D]],
    lead: 'celesta',
    tune: [
      74, _, 71, 74, 79, _, 78, 76,
      76, _, 71, _, 67, 69, 71, _,
      72, _, 76, 72, 79, _, 76, 72,
      74, _, _, 78, 81, _, 78, _,
      79, 78, 76, 74, 71, _, 74, _,
      75, _, 78, 75, 71, _, 69, _,
      72, 76, 79, 84, 83, _, 79, _,
      75, _, 74, _, 72, _, 69, _,
    ],
    answer: [
      _, _, _, _, _, _, _, _,
      _, _, _, 83, _, _, _, 79,
      _, _, _, _, _, _, _, _,
      _, 81, 83, _, _, _, _, 86,
      _, _, _, _, _, 83, _, 79,
      _, _, _, _, _, 81, _, 83,
      _, _, _, _, _, _, _, 88,
      _, _, _, _, _, _, _, 78,
    ],
  },
  mitsumi: {
    chords: [[G], [Cmaj], [G], [D], [Em], [Cmaj], [D], [G]],
    lead: 'whistle',
    hold: 2,
    tune: [
      67, 71, 74, _, 74, 76, 74, _,
      72, 76, 79, _, 79, 81, 79, _,
      79, 78, 76, 74, 71, _, 74, _,
      74, 76, 78, 81, 78, _, _, _,
      71, _, 76, _, 79, 78, 76, _,
      72, _, 76, _, 79, 81, 79, _,
      78, 76, 74, 72, 74, _, 78, _,
      79, _, _, _, 74, _, 67, _,
    ],
    // a little hop from the glock at the end of each bar
    answer: [
      _, _, _, _, _, _, _, 86,
      _, _, _, _, _, _, _, 88,
      _, _, _, _, _, _, _, 86,
      _, _, _, _, _, _, 90, _,
      _, _, _, _, _, _, _, 83,
      _, _, _, _, _, _, _, 84,
      _, _, _, _, _, _, _, 86,
      _, _, _, _, _, _, _, _,
    ],
  },
  shima: {
    chords: [[Cmaj7], [Bm7], [Am7], [D], [Cmaj7], [Bm7], [Am7], [D]],
    lead: 'vibes',
    hold: 3,
    tune: [
      _, 71, _, 72, 71, _, 67, _,
      _, 69, _, 71, 69, _, 66, _,
      _, 67, _, 69, 71, _, 72, 71,
      69, _, _, _, 66, _, 62, _,
      _, 71, _, 72, 74, _, 76, _,
      _, 74, _, 72, 71, _, 69, _,
      _, 67, 69, 71, 72, _, 69, _,
      66, _, 69, _, 74, _, _, _,
    ],
  },
  mystery: {
    chords: [[Em], [Cmaj], [Am], [B7], [Em], [Cmaj], [Am], [B7]],
    lead: 'musicbox',
    hold: 4,
    hushed: true,
    tune: [
      79, _, 78, _, 76, _, 71, _,
      72, _, _, _, 76, _, 79, _,
      81, _, 79, _, 76, _, 72, _,
      75, _, _, _, 78, _, _, _,
      79, _, 83, _, 81, _, 79, _,
      76, _, 79, _, 84, _, 83, _,
      81, _, 76, _, 72, _, 76, _,
      75, _, 71, _, 75, _, 78, _,
    ],
  },
  lights: {
    chords: [[Cmaj], [D], [Bm], [Em], [Am], [D], [G], [G]],
    lead: 'whistle',
    hold: 7,
    arp: true,
    hushed: true,
    tune: [
      76, _, _, _, 79, _, _, _,
      78, _, _, _, 74, _, _, _,
      74, _, _, _, 71, _, 74, _,
      76, _, _, _, _, _, _, _,
      72, _, _, _, 76, _, _, _,
      78, _, _, _, 81, _, 78, _,
      79, _, _, _, 74, _, _, _,
      79, _, _, _, _, _, _, _,
    ],
  },
}
/** the running order: the theme keeps coming home between the others */
const ORDER: MotifName[] = ['main', 'mitsumi', 'main', 'shima', 'mystery', 'main', 'lights', 'mitsumi', 'main', 'shima']

const human = (amt = 0.1) => 1 + (Math.random() * 2 - 1) * amt

// ── the band ─────────────────────────────────────────────────────────────

/** sleigh bells: a few tiny jingles smeared together */
const sleigh = (d: number, v = 1) => {
  V.noise({ dur: 0.05, f: 6400, q: 7, g: 0.011 * v, a: 0.002, delay: d })
  V.noise({ dur: 0.04, f: 8300, q: 8, g: 0.008 * v, a: 0.002, delay: d + 0.008 })
  V.noise({ dur: 0.035, f: 10200, q: 9, g: 0.005 * v, a: 0.002, delay: d + 0.016 })
}
/** celesta: a soft bell with a warm body under it */
const celesta = (m: number, d: number, g = 1) => {
  V.pluck({ f: hz(m), dur: 1.1, g: 0.036 * g * human(), delay: d, wood: 0.08 })
  V.tone({ f: hz(m), dur: 0.5, type: 'triangle', g: 0.01 * g, a: 0.004, delay: d })
}
/** vibes: rounder and longer, with a slow shimmer */
const vibes = (m: number, d: number, len: number) => {
  V.pluck({ f: hz(m), dur: Math.max(0.6, len * 1.4), g: 0.032 * human(), delay: d, wood: 0.22 })
  V.tone({ f: hz(m) * 1.003, dur: len, type: 'sine', g: 0.012, a: 0.01, delay: d })
}
/** a music box: thin, bright, a long ring */
const musicBox = (m: number, d: number) => {
  V.pluck({ f: hz(m + 12), dur: 1.5, g: 0.026 * human(), delay: d, wood: 0.05 })
  V.tone({ f: hz(m + 12) * 3.01, dur: 0.45, g: 0.004, a: 0.002, delay: d })
}
const whistle = (m: number, d: number, len: number) => V.whistle({ f: hz(m), dur: len, g: 0.024, delay: d })
const glock = (m: number, d: number, g = 1) => {
  V.pluck({ f: hz(m), dur: 0.9, g: 0.03 * g * human(), delay: d, wood: 0.1 })
  V.tone({ f: hz(m) * 2, dur: 0.3, g: 0.006 * g, a: 0.002, delay: d })
}
const pizz = (m: number, d: number, g = 1) => V.pluck({ f: hz(m), dur: 0.32, g: 0.055 * g * human(), delay: d, wood: 0.5 })
const kick = (d: number) => V.tone({ f: 110, f2: 50, dur: 0.2, g: 0.08, a: 0.003, delay: d })
const shaker = (d: number, v = 1) => V.noise({ dur: 0.06, f: 5400, q: 1.4, g: 0.007 * v, a: 0.015, delay: d })
/** a brushed snare: soft, more swish than crack */
const brush = (d: number) => {
  V.noise({ dur: 0.15, f: 2300, q: 0.6, g: 0.03, a: 0.008, delay: d })
  V.tone({ f: 185, f2: 150, dur: 0.07, g: 0.016, delay: d })
}
const tambourine = (d: number, v = 1) => {
  V.noise({ dur: 0.06, f: 7200, q: 2.5, g: 0.009 * v, a: 0.002, delay: d })
  V.noise({ dur: 0.035, f: 9800, q: 3, g: 0.006 * v, a: 0.001, delay: d + 0.012 })
}
const bass = (m: number, d: number, len: number, v = 1) => V.tone({ f: hz(m - 12), dur: len, type: 'triangle', g: 0.055 * v, a: 0.006, delay: d })
/** a handclap: a few tiny bursts smeared together */
const clap = (d: number, v = 1) => {
  for (let i = 0; i < 3; i++) V.noise({ dur: 0.012, f: 1500, q: 1.2, g: 0.014 * v, a: 0.001, delay: d + i * 0.009 })
  V.noise({ dur: 0.09, f: 1300, q: 1, g: 0.02 * v, a: 0.002, delay: d + 0.027 })
}
/** marimba: a short, woody, bright note */
const marimba = (m: number, d: number, g = 1) => {
  V.pluck({ f: hz(m), dur: 0.22, g: 0.018 * g * human(), delay: d, wood: 0.7 })
  V.tone({ f: hz(m) * 4, dur: 0.05, g: 0.003 * g, a: 0.001, delay: d })
}
/** a quick bright strum on the offbeat, like a ukulele */
function strum(tones: number[], d: number, g = 1) {
  tones.forEach((m, i) => V.pluck({ f: hz(m), dur: 0.3, g: 0.016 * g * human(0.2), delay: d + i * 0.012, wood: 0.4 }))
}
function pad(tones: number[], len: number, d: number) {
  tones.forEach((m) => V.tone({ f: hz(m - 12) * human(0.002), dur: len, type: 'triangle', g: 0.008, a: len * 0.3, delay: d }))
}

// ── the engine ───────────────────────────────────────────────────────────

/**
 * Only ever one band. The timer lives on the window, not just in this module, so a second copy
 * of this file (the dev server reloading it after an edit) stops the old band before it starts
 * playing, instead of playing on top of it.
 */
const ONE = '__slQuestMusic'
const owner = window as unknown as Record<string, number | undefined>
const killOthers = () => {
  if (owner[ONE]) clearInterval(owner[ONE])
  owner[ONE] = 0
}
let timer = 0
let next = 0
let level = 0
let bar = 0
let step = 0
/** where we are in the running order, and which motif is playing */
let slot = 0
let motif: MotifName = 'main'
/** a motif the story asked for: it comes in at the next half-phrase */
let cued: MotifName | null = null
/** how many times the main theme has come round: it's an octave up every other time */
let homecomings = 0

/** schedule one sixteenth; `t` is on the audio clock, the voices want seconds from now */
function play(t: number) {
  const d = Math.max(0, t - V.now())
  const s16 = 60 / BPM / 4
  const M = MOTIFS[motif]
  const [first, second] = M.chords[bar]
  const c = second && step >= 8 ? second : first
  const e8 = step % 2 === 0 ? step / 2 : -1 // which eighth this is, or -1 on the in-betweens
  const up = motif === 'main' && homecomings % 2 === 1 ? 12 : 0
  const drums = M.hushed ? Math.min(level, 1) : level

  // ── always: bells, pizzicato, pad, the motif's tune
  // sleigh bells on the eighths; once the shaker's in, they keep to the offbeats so the two don't pile up
  if (level < 1 ? step % 2 === 0 : step % 4 === 2) sleigh(d, (step % 4 === 2 ? 0.9 : 0.5) * (M.hushed ? 0.6 : 1))
  if (step === 0 || step === 8) pizz(c.root + 24, d, M.hushed ? 0.7 : 1)
  if (step === 0 || (second && step === 8)) pad(c.tones, s16 * (second ? 8 : 16), d)
  if (e8 >= 0) {
    const m = M.tune[bar * 8 + e8]
    if (m) {
      const len = s16 * (M.hold ?? 2)
      if (M.lead === 'celesta') celesta(m + up, d, up ? 0.85 : 1)
      else if (M.lead === 'whistle') whistle(m, d, len)
      else if (M.lead === 'vibes') vibes(m, d, len)
      else musicBox(m, d)
    }
    // the lights: a glock climbing up and down the chord under the long notes
    if (M.arp) {
      const run = [...c.tones, c.tones[0] + 12, ...c.tones.slice(1).reverse()]
      glock(run[e8 % run.length] + 12, d, 0.45)
    }
  }

  // ── 1: the glock answers, a soft kick, a shaker
  if (level >= 1) {
    if (e8 >= 0 && M.answer) {
      const n = M.answer[bar * 8 + e8]
      if (n) glock(n - (up ? 0 : 12), d, 0.8)
    }
    if (drums >= 1 && (step === 0 || step === 8)) kick(d)
    if (drums >= 1 && step % 2 === 0) shaker(d, (step % 4 === 2 ? 0.9 : 0.45) * (M.hushed ? 0.6 : 1))
  }

  // ── 2: a relaxed groove. Brushes and a soft clap on two and four, a bass that bounces
  //       between the root and its octave on the beats (never faster), and the offbeat strum
  if (drums >= 2) {
    if (step === 4 || step === 12) {
      brush(d)
      clap(d, 0.6)
    }
    if (step % 4 === 0) bass(c.root + (step % 8 === 4 ? 24 : 12), d, s16 * 3.2)
    if (step === 2 || step === 6 || step === 10 || step === 14) strum(c.tones, d)
  }

  // ── 3: brighter, not faster. A tambourine with the claps, a marimba note once a bar, and a
  //       bell run to close each phrase
  if (drums >= 3) {
    if (step === 4 || step === 12) tambourine(d, 0.7)
    if (step === 14) marimba(c.tones[2] + 12, d, 0.8)
    if ((bar === 3 || bar === 7) && step >= 8 && step % 2 === 0) glock([79, 81, 83, 86][(step - 8) / 2], d, 0.7)
  }
}

function begin(name: MotifName) {
  motif = name
  bar = 0
  if (name === 'main') homecomings++
}

/** move one sixteenth on, and to the next motif when this one's done */
function advance() {
  step++
  if (step < BAR) return
  step = 0
  bar++
  // a cue from the story comes in halfway through, rather than waiting the whole eight bars
  if (cued && (bar === 4 || bar === BARS)) {
    const c = cued
    cued = null
    if (c !== motif) {
      slot = Math.max(0, ORDER.indexOf(c))
      return begin(c)
    }
  }
  if (bar < BARS) return
  slot = (slot + 1) % ORDER.length
  begin(ORDER[slot])
}

/** somebody else has the music right now */
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
    next += 60 / BPM / 4
    advance()
  }
}

export const questMusic = {
  start(intensity = 0) {
    this.setLevel(intensity)
    if (timer && owner[ONE] !== timer) timer = 0
    if (timer) return
    step = 0
    slot = 0
    homecomings = -1
    begin(cued ?? 'main')
    cued = null
    next = V.now() + 0.08
    killOthers()
    timer = window.setInterval(loop, 25)
    owner[ONE] = timer
  },
  /** 0 to 3: how many layers are playing (the tempo stays the same) */
  setLevel(v: number) {
    if (Number.isFinite(v)) level = Math.max(0, Math.min(3, v))
  },
  /** bring in a character's motif at the next half-phrase (or first, if it isn't playing yet) */
  cue(name: MotifName) {
    if (name !== motif || !timer) cued = name
  },
  /** stop; with `hit`, a little flourish to close on */
  stop(hit = false) {
    if (timer) clearInterval(timer)
    if (owner[ONE] === timer) owner[ONE] = 0
    timer = 0
    if (hit && V.live()) {
      const d = 0.05
      ;[67, 71, 74, 79].forEach((m, i) => celesta(m + 12, d + i * 0.1, 1.2))
      strum([67, 71, 74, 79], d + 0.42, 1.4)
      sleigh(d + 0.42, 1.4)
      bass(55, d + 0.42, 1.4)
    }
  },
  get playing() {
    return !!timer && owner[ONE] === timer
  },
  get state() {
    return { level, bpm: BPM, motif, bar }
  },
}

// the dev server swapping this file out: silence this copy first
import.meta.hot?.dispose(() => {
  if (timer) clearInterval(timer)
  timer = 0
  killOthers()
})
