/**
 * The Secret Santa music, "Snow on the Site": cosy and jolly, played live on the site's synth
 * voices (no files), on the music bus.
 *
 * It's built from leitmotifs that share one hook, D – G – B – A (the same four notes the
 * Christmas opening jingle starts with). Every theme states it in its own way, which is what
 * makes them feel like one soundtrack and stick in your head. Each theme is eight bars shaped
 * like a song: the hook, the hook answered, something new in the middle, the hook coming home.
 * And each has its own pace and feel, so the music keeps moving instead of droning:
 *
 *   main     112 bpm, straight. The hook on celesta, stately, in quarter notes. G Em C D | Em C Am→D G
 *   mitsumi  126 bpm, a bouncy swing. The hook quick and hopping, on whistle. G C G D | Em C D G
 *   shima    92 bpm, laid back, half-time drums. The hook on the offbeats, on vibes. Cmaj7 Bm7 Am7 D | … G
 *   lights   104 bpm, a waltz in three. The hook stretched long on whistle over a glock. C D Bm Em | Am D G G
 *   mystery  84 bpm, ???'s theme: the hook turned minor on a music box, drums kept down. Em C Am B7 | …
 *
 * The running order brings the main theme home between the others, and finishes the round with
 * the main theme a step higher, for a lift, before it all starts again. The busier themes thin
 * out for two bars in the middle and come back in on a drum fill, and every theme ends on a
 * little run into the next. The story can cue a theme (`cue`): it comes in at the next half-phrase.
 *
 * What grows as the quest goes on is the band, layer by layer:
 *   0  sleigh bells, a pizzicato bass, a warm pad, the theme's tune
 *   1  a glock answering, a soft kick, a shaker
 *   2  brushes and a soft clap, a bouncing bass, strums (each theme in its own pattern)
 *   3  a tambourine, a marimba note once a bar, bell runs at the end of phrases
 *
 * It rests while something else has the music: one of the hidden games, or an OP/ED video.
 */
import { reportBand, voices as V } from './sfx'
import { hz } from './gameSong'

/** bars in a theme */
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
const Am = ch(45, 64, 69, 72)
const Bm = ch(35, 62, 66, 71)
const Cmaj7 = ch(36, 64, 67, 71)
const Bm7 = ch(35, 62, 66, 69)
const Am7 = ch(33, 60, 64, 67)

export type MotifName = 'main' | 'mitsumi' | 'shima' | 'mystery' | 'lights'
type Lead = 'celesta' | 'whistle' | 'vibes' | 'musicbox'
/** how the drums and the bass move under a theme */
type Feel = 'straight' | 'bounce' | 'laid' | 'waltz' | 'hush'
interface Motif {
  bpm: number
  /** beats in a bar: 4, or 3 for the waltz */
  beats: 4 | 3
  /** how late the offbeat eighths come, as a share of an eighth (0 straight, ~0.33 a lilting swing) */
  swing: number
  feel: Feel
  /** one chord per bar, or two (the second from halfway) */
  chords: [Chord, Chord?][]
  /** one note per eighth (null rests), eight bars */
  tune: (number | null)[]
  lead: Lead
  /** how long each tune note rings, in sixteenths */
  hold?: number
  /** the glock's answer in the gaps, if this theme has one */
  answer?: (number | null)[]
  /** a glock running up and down the chord on the eighths */
  arp?: boolean
}

const _ = null
const MOTIFS: Record<MotifName, Motif> = {
  // the hook in quarter notes, answered, a high middle, and home
  main: {
    bpm: 112,
    beats: 4,
    swing: 0,
    feel: 'straight',
    chords: [[G], [Em], [Cmaj], [D], [Em], [Cmaj], [Am, D], [G]],
    lead: 'celesta',
    tune: [
      74, _, 79, _, 83, _, 81, _,
      79, _, _, 76, 79, _, _, _,
      74, _, 79, _, 83, _, 84, _,
      83, _, 81, _, 78, _, _, _,
      83, _, 86, _, 88, _, 86, 83,
      84, _, 83, 81, 79, _, 76, _,
      74, _, 79, _, 83, _, 81, 78,
      79, _, _, _, _, _, _, _,
    ],
    answer: [
      _, _, _, _, _, _, _, _,
      _, _, _, _, _, 83, _, 86,
      _, _, _, _, _, _, _, _,
      _, _, _, _, _, 86, _, 81,
      _, _, _, _, _, _, _, _,
      _, _, _, _, _, _, _, 79,
      _, _, _, _, _, _, _, _,
      _, _, 86, _, 83, _, 79, _,
    ],
  },
  // Mitsumi: the hook quick and hopping, as if she's running ahead
  mitsumi: {
    bpm: 126,
    beats: 4,
    swing: 0.3,
    feel: 'bounce',
    chords: [[G], [Cmaj], [G], [D], [Em], [Cmaj], [D], [G]],
    lead: 'whistle',
    hold: 2,
    tune: [
      74, 79, 83, 81, 79, _, 74, _,
      76, 79, 84, 83, 81, _, 79, _,
      74, 79, 83, 81, 79, _, 83, _,
      81, _, 78, _, 74, _, _, _,
      76, _, 79, _, 83, _, 81, 79,
      76, _, 79, _, 84, _, 83, 81,
      78, 81, 86, _, 84, _, 81, 78,
      79, _, 74, _, 79, _, _, _,
    ],
    // a little hop from the glock at the end of each bar
    answer: [
      _, _, _, _, _, _, _, 86,
      _, _, _, _, _, _, _, 88,
      _, _, _, _, _, _, _, 86,
      _, _, _, _, _, _, 90, 86,
      _, _, _, _, _, _, _, 83,
      _, _, _, _, _, _, _, 84,
      _, _, _, _, _, _, _, _,
      _, _, _, _, _, 86, _, 91,
    ],
  },
  // Shima: the hook on the offbeats, unhurried, never quite on time
  shima: {
    bpm: 92,
    beats: 4,
    swing: 0.33,
    feel: 'laid',
    chords: [[Cmaj7], [Bm7], [Am7], [D], [Cmaj7], [Bm7], [Am7, D], [G]],
    lead: 'vibes',
    hold: 3,
    tune: [
      _, 74, _, 79, _, 83, 81, _,
      _, 81, _, 78, 74, _, _, _,
      _, 72, _, 76, _, 79, 78, _,
      76, _, 74, _, 69, _, _, _,
      _, 74, _, 79, _, 83, 84, _,
      83, _, 81, _, 78, _, 74, _,
      _, 76, _, 72, _, 74, 78, _,
      79, _, _, _, _, _, _, _,
    ],
  },
  // ???: the hook turned minor (B E G F#), slow and far away
  mystery: {
    bpm: 84,
    beats: 4,
    swing: 0,
    feel: 'hush',
    chords: [[Em], [Cmaj], [Am], [B7], [Em], [Cmaj], [Am, B7], [Em]],
    lead: 'musicbox',
    hold: 4,
    tune: [
      71, _, 76, _, 79, _, 78, _,
      76, _, _, _, 72, _, _, _,
      69, _, 72, _, 76, _, 75, _,
      75, _, _, _, 71, _, _, _,
      71, _, 76, _, 79, _, 83, _,
      84, _, 83, _, 79, _, 76, _,
      72, _, 76, _, 78, _, 75, _,
      76, _, _, _, _, _, _, _,
    ],
  },
  // Ueno's winter lights: a waltz, the hook stretched long over a glock turning round the chord
  lights: {
    bpm: 104,
    beats: 3,
    swing: 0,
    feel: 'waltz',
    chords: [[Cmaj], [D], [Bm], [Em], [Am], [D], [G], [G]],
    lead: 'whistle',
    hold: 7,
    arp: true,
    tune: [
      76, _, _, _, 79, _,
      78, _, _, _, 74, _,
      74, _, 79, _, 83, _,
      81, _, _, _, _, _,
      72, _, _, _, 76, _,
      78, _, _, _, 81, _,
      79, _, 74, _, 71, _,
      74, _, 79, _, _, _,
    ],
  },
}

/** the running order: home between the others, and the round ends on the theme a step higher */
const ORDER: { name: MotifName; lift?: number }[] = [
  { name: 'main' },
  { name: 'mitsumi' },
  { name: 'main' },
  { name: 'shima' },
  { name: 'lights' },
  { name: 'mitsumi' },
  { name: 'mystery' },
  { name: 'main', lift: 2 },
]

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
const kick = (d: number, v = 1) => V.tone({ f: 110, f2: 50, dur: 0.2, g: 0.08 * v, a: 0.003, delay: d })
const shaker = (d: number, v = 1) => V.noise({ dur: 0.06, f: 5400, q: 1.4, g: 0.007 * v, a: 0.015, delay: d })
/** a brushed snare: soft, more swish than crack */
const brush = (d: number, v = 1) => {
  V.noise({ dur: 0.15, f: 2300, q: 0.6, g: 0.03 * v, a: 0.008, delay: d })
  V.tone({ f: 185, f2: 150, dur: 0.07, g: 0.016 * v, delay: d })
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
/** where we are in the running order, and which theme is playing, in which key */
let slot = 0
let motif: MotifName = 'main'
let lift = 0
/** a theme the story asked for: it comes in at the next half-phrase */
let cued: MotifName | null = null
/** how many times the main theme has come round: it's an octave up every other time */
let homecomings = 0

/** sixteenths in a bar of the theme playing, and how long one lasts */
const barLen = () => MOTIFS[motif].beats * 4
const s16 = () => 60 / MOTIFS[motif].bpm / 4

/** the chord at a step of a bar (a second chord takes over halfway) */
function chordAt(b: number, s: number) {
  const [first, second] = MOTIFS[motif].chords[Math.min(b, BARS - 1)]
  const c = second && s >= barLen() / 2 ? second : first
  return lift ? { root: c.root + lift, tones: c.tones.map((t) => t + lift) } : c
}

/** schedule one sixteenth; `t` is on the audio clock, the voices want seconds from now */
function play(t: number) {
  const M = MOTIFS[motif]
  const len = barLen()
  const half = len / 2
  const sixteenth = s16()
  // the offbeat eighths come a little late in the swung themes
  const late = step % 4 === 2 ? M.swing * sixteenth * 2 : 0
  const d = Math.max(0, t - V.now()) + late
  const c = chordAt(bar, step)
  const e8 = step % 2 === 0 ? step / 2 : -1 // which eighth this is, or -1 on the in-betweens
  const up = (motif === 'main' && homecomings % 2 === 1 ? 12 : 0) + lift
  const hushed = M.feel === 'hush'
  const drums = hushed ? Math.min(level, 1) : level
  const lastBar = bar === BARS - 1
  // the busier themes thin out for two bars in the middle, then come back in on a fill
  const thin = (M.feel === 'straight' || M.feel === 'bounce') && (bar === 4 || bar === 5) && level >= 2
  const beat = step % 4 === 0
  const downbeat = step === 0
  const secondChord = !!M.chords[bar]?.[1]

  // ── always: bells, pizzicato, pad, the theme's tune
  if (M.feel === 'waltz') {
    if (downbeat) sleigh(d, 0.8)
  } else if (level < 1 ? step % 2 === 0 : step % 4 === 2) {
    sleigh(d, (step % 4 === 2 ? 0.9 : 0.5) * (hushed ? 0.6 : 1))
  }
  if (M.feel === 'waltz') {
    if (downbeat) pizz(c.root + 24, d)
  } else if (step === 0 || step === half) pizz(c.root + 24, d, hushed ? 0.7 : 1)
  if (step === 0 || (secondChord && step === half)) pad(c.tones, sixteenth * (secondChord ? half : len), d)
  if (e8 >= 0) {
    const m = M.tune[bar * M.beats * 2 + e8]
    if (m) {
      const ring = sixteenth * (M.hold ?? 2)
      if (M.lead === 'celesta') celesta(m + up, d, up >= 12 ? 0.85 : 1)
      else if (M.lead === 'whistle') whistle(m + lift, d, ring)
      else if (M.lead === 'vibes') vibes(m + lift, d, ring)
      else musicBox(m + lift, d)
    }
    // the lights: a glock turning round the chord on the eighths
    if (M.arp) {
      const run = [...c.tones, c.tones[0] + 12, ...c.tones.slice(1).reverse()]
      glock(run[e8 % run.length] + 12, d, 0.45)
    }
  }

  // ── 1: the glock answers, a soft kick, a shaker
  if (level >= 1) {
    if (e8 >= 0 && M.answer) {
      const n = M.answer[bar * M.beats * 2 + e8]
      if (n) glock(n - (up >= 12 ? 0 : 12) + lift, d, 0.8)
    }
    if (drums >= 1 && !thin) {
      if (M.feel === 'waltz') {
        if (downbeat) kick(d, 0.8)
      } else if (M.feel === 'laid') {
        if (downbeat) kick(d)
      } else if (step === 0 || step === half) kick(d)
    }
    if (drums >= 1 && step % 2 === 0 && M.feel !== 'waltz') shaker(d, (step % 4 === 2 ? 0.9 : 0.45) * (hushed ? 0.6 : 1) * (thin ? 0.7 : 1))
  }

  // ── 2: the groove, in each theme's own pattern
  if (drums >= 2) {
    if (M.feel === 'waltz') {
      // oom-pah-pah: the bass on one, a soft brush and a strum on two and three
      if (downbeat) bass(c.root + 12, d, sixteenth * 3.5)
      if (step === 4 || step === 8) {
        brush(d, 0.55)
        strum(c.tones, d, 0.8)
      }
    } else if (M.feel === 'laid') {
      // half time: the clap only on three, a walking bass on the beats, strums on the and of two and four
      if (step === 8) {
        brush(d)
        clap(d, 0.5)
      }
      if (beat) bass(c.root + (step === 4 || step === 12 ? 19 : 12), d, sixteenth * 3.6, 0.9)
      if (step === 6 || step === 14) strum(c.tones, d, 0.9)
    } else {
      if (!thin && (step === 4 || step === 12)) {
        brush(d)
        clap(d, 0.6)
      }
      if (beat) bass(c.root + (step % 8 === 4 ? 24 : 12), d, sixteenth * 3.2, thin ? 0.7 : 1)
      if (!thin && (step === 2 || step === 6 || step === 10 || step === 14)) strum(c.tones, d, M.feel === 'bounce' ? 1.1 : 1)
    }
    // the drums come back in: a little brush roll across the last beat of the thin stretch
    if (bar === 5 && step >= 12 && (M.feel === 'straight' || M.feel === 'bounce')) brush(d, 0.35 + (step - 12) * 0.15)
  }

  // ── 3: brighter, not faster
  if (drums >= 3) {
    if (!thin && M.feel !== 'waltz' && (step === 4 || step === 12)) tambourine(d, 0.7)
    if (step === len - 2) marimba(c.tones[2] + 12, d, 0.8)
  }

  // every theme hands over on a little run up the chord in its last beat
  if (lastBar && level >= 1 && step >= len - 4 && step % 2 === 0) {
    const run = [...c.tones, c.tones[0] + 12]
    glock(run[(step - (len - 4)) / 2 + 1] + 12, d, 0.6)
  }
  if (level >= 3 && (bar === 3 || lastBar) && step >= half && step % 2 === 0 && M.feel !== 'waltz') {
    glock([79, 81, 83, 86][((step - half) / 2) % 4] + lift, d, 0.5)
  }
}

function begin(i: number, name: MotifName = ORDER[i].name) {
  slot = i
  motif = name
  lift = ORDER[i]?.name === name ? ORDER[i].lift ?? 0 : 0
  bar = 0
  step = 0
  if (name === 'main' && !lift) homecomings++
}

/** move one sixteenth on, and to the next theme when this one's done */
function advance() {
  step++
  if (step < barLen()) return
  step = 0
  bar++
  // a cue from the story comes in halfway through, rather than waiting the whole eight bars
  if (cued && (bar === 4 || bar === BARS)) {
    const c = cued
    cued = null
    if (c !== motif) {
      const at = ORDER.findIndex((o) => o.name === c && !o.lift)
      return begin(Math.max(0, at), c)
    }
  }
  if (bar < BARS) return
  begin((slot + 1) % ORDER.length)
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
    // the step just played belongs to the theme that was playing, at its own tempo
    next += s16()
    advance()
  }
}

export const questMusic = {
  start(intensity = 0) {
    this.setLevel(intensity)
    if (timer && owner[ONE] !== timer) timer = 0
    if (timer) return
    homecomings = -1
    const first = cued ? Math.max(0, ORDER.findIndex((o) => o.name === cued && !o.lift)) : 0
    begin(first, cued ?? ORDER[first].name)
    cued = null
    next = V.now() + 0.08
    killOthers()
    timer = window.setInterval(loop, 25)
    owner[ONE] = timer
  },
  /** 0 to 3: how many layers are playing */
  setLevel(v: number) {
    if (Number.isFinite(v)) level = Math.max(0, Math.min(3, v))
  },
  /** bring in a character's theme at the next half-phrase (or first, if it isn't playing yet) */
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
      // the hook, one last time, and the chord
      ;[74, 79, 83, 81].forEach((m, i) => celesta(m + 12, d + i * 0.14, 1.2))
      strum([67, 71, 74, 79], d + 0.6, 1.4)
      sleigh(d + 0.6, 1.4)
      bass(55, d + 0.6, 1.4)
    }
  },
  get playing() {
    return !!timer && owner[ONE] === timer
  },
  get state() {
    return { level, bpm: MOTIFS[motif].bpm, motif, bar, lift }
  },
}

// the countdown's Christmas song keeps quiet while this plays
reportBand(() => questMusic.playing && !busy())

// the dev server swapping this file out: silence this copy first
import.meta.hot?.dispose(() => {
  if (timer) clearInterval(timer)
  timer = 0
  killOthers()
})
