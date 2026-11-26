/**
 * The Secret Santa music, "Snow on the Site": cosy and jolly, played live on the site's synth
 * voices (no files), on the music bus.
 *
 * It's one song. Every character's theme is a variation of the same eight-bar tune, over the
 * same chords, at the same pace and with the same small band, so when the theme changes it
 * sounds like the next verse rather than a different track. The tune opens on the hook
 * D – G – B – A (the same four notes as the Christmas opening jingle), and is shaped like a
 * song: the hook, the hook answered, a lift in the middle, the hook coming home.
 *
 *   main     the tune as it is, on celesta
 *   mitsumi  on whistle, with little skipping notes in the gaps
 *   shima    on vibes, a few notes pushed early for an easy, laid-back lilt
 *   lights   Ueno's winter lights: just the long notes on whistle, a glock circling the chord
 *   mystery  ???: the same tune in E minor (the same notes, a sadder home), on a music box, drums hushed
 *
 *   chords   G  Em  C  D | Em7  C  G→D  G      (mystery: Em  C  Am  B7 | Cmaj7  Am  Em→B7  Em)
 *
 * The running order brings the main theme home between the others, and finishes the round on
 * the main theme a step higher, for a lift, before it all starts again. Two bars in the middle
 * of each verse thin out and come back in on a brush roll. The story can cue a theme (`cue`): it
 * comes in at the next half-phrase.
 *
 * What grows as the quest goes on is the band, layer by layer:
 *   0  sleigh bells, a pizzicato bass, a warm pad, the tune
 *   1  a glock answering, a soft kick, a shaker
 *   2  brushes and a bouncing bass
 *   3  a soft clap with the brushes
 * Just that one small band: no extra instruments coming and going.
 *
 * It rests while something else has the music: one of the hidden games, or an OP/ED video.
 */
import { reportBand, voices as V } from './sfx'
import { hz } from './gameSong'

/** one pace for the whole song, with the offbeat eighths a touch late for a gentle lilt */
const BPM = 104
const SWING = 0.1
/** sixteenths in a bar, bars in a verse */
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
const Am = ch(45, 64, 69, 72)
const B7 = ch(35, 63, 66, 69, 71)
const Em7 = ch(40, 64, 67, 71, 74)
const Cmaj7 = ch(36, 64, 67, 71)

export type MotifName = 'main' | 'mitsumi' | 'shima' | 'mystery' | 'lights'
type Lead = 'celesta' | 'whistle' | 'vibes' | 'musicbox'
interface Motif {
  /** one chord per bar, or two (the second from halfway) */
  chords: [Chord, Chord?][]
  /** one note per eighth (null rests), eight bars */
  tune: (number | null)[]
  lead: Lead
  /** how long each tune note rings, in sixteenths */
  hold?: number
  /** the glock's answers in the gaps */
  answer?: (number | null)[]
  /** a glock circling the chord on the eighths */
  arp?: boolean
  /** the drums kept down */
  hushed?: boolean
}

const _ = null
/** the song's chords, shared by every theme in G */
const HOME: [Chord, Chord?][] = [[G], [Em], [Cmaj], [D], [Em7], [Cmaj], [G, D], [G]]
/** the glock's answers, the same in every theme that has them */
const ANSWER = [
  _, _, _, _, _, _, _, _,
  _, _, _, _, _, 83, _, 86,
  _, _, _, _, _, _, _, _,
  _, _, _, _, _, 86, _, 81,
  _, _, _, _, _, _, _, _,
  _, _, _, _, _, _, _, 79,
  _, _, _, _, _, _, _, _,
  _, _, 86, _, 83, _, 79, _,
]

const MOTIFS: Record<MotifName, Motif> = {
  // the tune as it is
  main: {
    chords: HOME,
    lead: 'celesta',
    tune: [
      74, _, 79, _, 83, _, 81, _,
      79, _, _, 76, 79, _, _, _,
      76, _, 79, _, 84, _, 83, _,
      81, _, 78, _, 74, _, _, _,
      83, _, 86, _, 88, _, 86, 83,
      84, _, 79, 81, 79, _, 76, _,
      74, _, 79, 83, 81, _, 78, _,
      79, _, _, _, _, _, _, _,
    ],
    answer: ANSWER,
  },
  // Mitsumi: the same tune, skipping along, with little notes filling the gaps
  mitsumi: {
    chords: HOME,
    lead: 'whistle',
    hold: 2,
    tune: [
      74, 76, 79, _, 83, _, 81, 79,
      79, _, 76, 78, 79, _, 71, _,
      76, 78, 79, _, 84, _, 83, 79,
      81, _, 78, _, 74, _, 78, _,
      83, _, 86, _, 88, _, 86, 83,
      84, _, 79, 81, 79, _, 76, 74,
      74, 76, 79, 83, 81, _, 78, 74,
      79, _, 74, _, 79, _, _, _,
    ],
    answer: ANSWER,
  },
  // Shima: the same tune, in no hurry, a few notes arriving early
  shima: {
    chords: HOME,
    lead: 'vibes',
    hold: 3,
    tune: [
      74, _, 79, _, _, 83, 81, _,
      79, _, _, 76, _, 79, _, _,
      76, _, 79, _, _, 84, 83, _,
      81, _, 78, _, _, 74, _, _,
      83, _, 86, _, _, 88, 86, _,
      84, _, 79, _, _, 81, 79, _,
      74, _, 79, 83, _, 81, _, 78,
      79, _, _, _, _, _, _, _,
    ],
    answer: ANSWER,
  },
  // Ueno's lights: only the tune's long notes, with a glock circling the chord underneath
  lights: {
    chords: HOME,
    lead: 'whistle',
    hold: 7,
    arp: true,
    tune: [
      74, _, _, _, 83, _, _, _,
      79, _, _, _, _, _, _, _,
      76, _, _, _, 84, _, _, _,
      81, _, _, _, 78, _, _, _,
      83, _, _, _, 88, _, _, _,
      84, _, _, _, 79, _, _, _,
      74, _, _, _, 81, _, 78, _,
      79, _, _, _, _, _, _, _,
    ],
  },
  // ???: the same tune and rhythm, every note a third lower, so it sits in E minor
  mystery: {
    chords: [[Em], [Cmaj], [Am], [B7], [Cmaj7], [Am], [Em, B7], [Em]],
    lead: 'musicbox',
    hold: 4,
    hushed: true,
    tune: [
      71, _, 76, _, 79, _, 78, _,
      76, _, _, 72, 76, _, _, _,
      72, _, 76, _, 81, _, 79, _,
      78, _, 75, _, 71, _, _, _,
      79, _, 83, _, 84, _, 83, 79,
      81, _, 76, 78, 76, _, 72, _,
      71, _, 76, 79, 78, _, 75, _,
      76, _, _, _, _, _, _, _,
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
  V.pluck({ f: hz(m), dur: 1.7, g: 0.036 * g * human(), delay: d, wood: 0.08 })
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
  V.pluck({ f: hz(m), dur: 1.3, g: 0.028 * g * human(), delay: d, wood: 0.1 })
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
const bass = (m: number, d: number, len: number, v = 1) => V.tone({ f: hz(m - 12), dur: len, type: 'triangle', g: 0.055 * v, a: 0.006, delay: d })
/** a handclap: a few tiny bursts smeared together */
const clap = (d: number, v = 1) => {
  for (let i = 0; i < 3; i++) V.noise({ dur: 0.012, f: 1500, q: 1.2, g: 0.014 * v, a: 0.001, delay: d + i * 0.009 })
  V.noise({ dur: 0.09, f: 1300, q: 1, g: 0.02 * v, a: 0.002, delay: d + 0.027 })
}
function pad(tones: number[], len: number, d: number) {
  tones.forEach((m) => V.tone({ f: hz(m - 12) * human(0.002), dur: len + 0.4, type: 'triangle', g: 0.0095, a: len * 0.45, delay: d }))
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

/** how long a sixteenth lasts */
const S16 = 60 / BPM / 4

/** the chord at a step of a bar (a second chord takes over halfway), in the key the verse is in */
function chordAt(b: number, s: number) {
  const [first, second] = MOTIFS[motif].chords[Math.min(b, BARS - 1)]
  const c = second && s >= BAR / 2 ? second : first
  return lift ? { root: c.root + lift, tones: c.tones.map((t) => t + lift) } : c
}

/** schedule one sixteenth; `t` is on the audio clock, the voices want seconds from now */
function play(t: number) {
  const M = MOTIFS[motif]
  const half = BAR / 2
  // the offbeat eighths come a touch late: a gentle lilt, the same all the way through
  const late = step % 4 === 2 ? SWING * S16 * 2 : 0
  const d = Math.max(0, t - V.now()) + late
  const c = chordAt(bar, step)
  const e8 = step % 2 === 0 ? step / 2 : -1 // which eighth this is, or -1 on the in-betweens
  const up = (motif === 'main' && homecomings % 2 === 1 ? 12 : 0) + lift
  const hushed = !!M.hushed
  const drums = hushed ? Math.min(level, 1) : level
  // two bars in the middle of each verse thin out, then come back in on a brush roll
  const thin = !hushed && (bar === 4 || bar === 5) && level >= 2
  const beat = step % 4 === 0
  const secondChord = !!M.chords[bar]?.[1]

  // ── always: bells, pizzicato, pad, the tune
  if (level < 1 ? step % 2 === 0 : step % 4 === 2) sleigh(d, (step % 4 === 2 ? 0.9 : 0.5) * (hushed ? 0.6 : 1))
  if (step === 0 || step === half) pizz(c.root + 24, d, hushed ? 0.7 : 1)
  if (step === 0 || (secondChord && step === half)) pad(c.tones, S16 * (secondChord ? half : BAR), d)
  if (e8 >= 0) {
    const m = M.tune[bar * 8 + e8]
    if (m) {
      const ring = S16 * (M.hold ?? 2)
      if (M.lead === 'celesta') celesta(m + up, d, up >= 12 ? 0.85 : 1)
      else if (M.lead === 'whistle') whistle(m + lift, d, ring)
      else if (M.lead === 'vibes') vibes(m + lift, d, ring)
      else musicBox(m + lift, d)
    }
    // the lights: a glock circling the chord on the eighths
    if (M.arp) {
      const run = [...c.tones, c.tones[0] + 12, ...c.tones.slice(1).reverse()]
      glock(run[e8 % run.length] + 12, d, 0.45)
    }
  }

  // ── 1: the glock answers, a soft kick, a shaker
  if (level >= 1) {
    if (e8 >= 0 && M.answer) {
      const n = M.answer[bar * 8 + e8]
      if (n) glock(n - (up >= 12 ? 0 : 12) + lift, d, 0.8)
    }
    if (drums >= 1 && !thin && (step === 0 || step === half)) kick(d)
    if (drums >= 1 && beat) shaker(d, (step % 8 === 4 ? 0.8 : 0.45) * (hushed ? 0.6 : 1) * (thin ? 0.7 : 1))
  }

  // ── 2: brushes on two and four, and a bass bouncing between the root and its octave
  if (drums >= 2) {
    if (!thin && (step === 4 || step === 12)) brush(d)
    if (beat) bass(c.root + (step % 8 === 4 ? 24 : 12), d, S16 * 3.2, thin ? 0.7 : 1)
    if (bar === 5 && step >= 12) brush(d, 0.35 + (step - 12) * 0.15)
  }

  // ── 3: a soft clap joins the brushes
  if (drums >= 3 && !thin && (step === 4 || step === 12)) clap(d, 0.4)
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
  if (step < BAR) return
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
    next += S16
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
      pad([67, 71, 74, 79], 1.6, d + 0.6)
      sleigh(d + 0.6, 1.4)
      bass(55, d + 0.6, 1.4)
    }
  },
  get playing() {
    return !!timer && owner[ONE] === timer
  },
  get state() {
    return { level, bpm: BPM, motif, bar, lift }
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
