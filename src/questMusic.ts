/**
 * The Secret Santa theme, "Snow on the Site": a cosy, jolly little tune for walking around town
 * in December. One steady tempo the whole way (112 bpm) in a bright G major, with one wistful
 * borrowed chord at the end of the phrase (C minor, before D) for the mystery of who ??? is.
 * Played live on the site's synth voices (no files), on the music bus.
 *
 * An eight-bar loop: G · Em · C · D · G · B7 · C · Cm→D. The tune comes back an octave up on
 * every other pass. The pace never changes; what grows is the band, layer by layer:
 *   0  sleigh bells, a pizzicato bass on the beat, a warm pad, the tune on celesta
 *   1  a glockenspiel answering the tune, a soft kick, a shaker
 *   2  upbeat: brushes and a handclap on two and four, a bouncing octave bass, offbeat strums
 *   3  more upbeat: a light kick on every beat, tambourine on the offbeats, a marimba running
 *      up and down the chords, and bell runs at the end of each phrase
 *
 * It rests while something else has the music: one of the hidden games, or an OP/ED video.
 */
import { voices as V } from './sfx'
import { hz } from './gameSong'

const BPM = 112
/** sixteenth notes in a bar, bars in the loop */
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
/** one chord per bar, except the last, which turns from C minor to D halfway */
const CHORDS: [Chord, Chord?][] = [[G], [Em], [Cmaj], [D], [G], [B7], [Cmaj], [Cm, D]]

// the tune: one note per eighth (null rests), eight bars of eight
const TUNE: (number | null)[] = [
  74, null, 71, 74, 79, null, 78, 76,
  76, null, 71, null, 67, 69, 71, null,
  72, null, 76, 72, 79, null, 76, 72,
  74, null, null, 78, 81, null, 78, null,
  79, 78, 76, 74, 71, null, 74, null,
  75, null, 78, 75, 71, null, 69, null,
  72, 76, 79, 84, 83, null, 79, null,
  75, null, 74, null, 72, null, 69, null,
]
// the glockenspiel's answer, in the gaps the tune leaves
const ANSWER: (number | null)[] = [
  null, null, null, null, null, null, null, null,
  null, null, null, 83, null, null, null, 79,
  null, null, null, null, null, null, null, null,
  null, 81, 83, null, null, null, null, 86,
  null, null, null, null, null, 83, null, 79,
  null, null, null, null, null, 81, null, 83,
  null, null, null, null, null, null, null, 88,
  null, null, null, null, null, null, null, 78,
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
const clap = (d: number) => {
  for (let i = 0; i < 3; i++) V.noise({ dur: 0.012, f: 1500, q: 1.2, g: 0.014, a: 0.001, delay: d + i * 0.009 })
  V.noise({ dur: 0.09, f: 1300, q: 1, g: 0.02, a: 0.002, delay: d + 0.027 })
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
/** how many times round the loop: the tune goes up an octave on every other pass */
let pass = 0

/** schedule one sixteenth; `t` is on the audio clock, the voices want seconds from now */
function play(t: number) {
  const d = Math.max(0, t - V.now())
  const s16 = 60 / BPM / 4
  const [first, second] = CHORDS[bar]
  const c = second && step >= 8 ? second : first
  const e8 = step % 2 === 0 ? step / 2 : -1 // which eighth this is, or -1 on the in-betweens
  const up = pass % 2 === 1 ? 12 : 0

  // ── always: bells, pizzicato, pad, the tune
  // sleigh bells on the eighths; once the shaker's in, they keep to the offbeats so the two don't pile up
  if (level < 1 ? step % 2 === 0 : step % 4 === 2) sleigh(d, step % 4 === 2 ? 0.9 : 0.5)
  if (step === 0 || step === 8) pizz(c.root + 24, d)
  if (step === 0 || (second && step === 8)) pad(c.tones, s16 * (second ? 8 : 16), d)
  if (e8 >= 0) {
    const m = TUNE[bar * 8 + e8]
    if (m) {
      celesta(m + up, d, up ? 0.85 : 1)
    }
  }

  // ── 1: the glock answers, a soft kick, a shaker
  if (level >= 1) {
    if (e8 >= 0) {
      const n = ANSWER[bar * 8 + e8]
      if (n) glock(n - (up ? 0 : 12), d, 0.8)
    }
    if (step === 0 || step === 8) kick(d)
    if (step % 2 === 0) shaker(d, step % 4 === 2 ? 0.9 : 0.45)
  }

  // ── 2: it gets a groove. Brushes and a handclap on two and four, a bouncing octave bass
  //       (root, octave, root, octave on the eighths), and the offbeat strum
  if (level >= 2) {
    if (step === 4 || step === 12) {
      brush(d)
      clap(d)
    }
    if (step % 2 === 0) bass(c.root + (step % 4 === 2 ? 24 : 12), d, s16 * 1.6, step % 4 === 0 ? 1 : 0.7)
    if (step === 2 || step === 6 || step === 10 || step === 14) strum(c.tones, d)
  }

  // ── 3: properly upbeat. A light kick on every beat, the tambourine on the offbeats, a marimba
  //       running up and down the chord in sixteenths, and a bell run to close each phrase
  if (level >= 3) {
    if (step % 4 === 0) kick(d)
    if (step % 4 === 2) tambourine(d, 0.8)
    const arp = [...c.tones, c.tones[1] + 12, c.tones[0] + 12, c.tones[2]]
    marimba(arp[step % arp.length] + 12, d, step % 4 === 0 ? 1 : 0.65)
    if ((bar === 3 || bar === 7) && step >= 8 && step % 2 === 0) glock([79, 81, 83, 86][(step - 8) / 2], d, 0.7)
  }
}

/** move one sixteenth on */
function advance() {
  step++
  if (step < BAR) return
  step = 0
  bar++
  if (bar < BARS) return
  bar = 0
  pass++
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
    bar = 0
    step = 0
    pass = 0
    next = V.now() + 0.08
    killOthers()
    timer = window.setInterval(loop, 25)
    owner[ONE] = timer
  },
  /** 0 to 3: how many layers are playing (the tempo stays the same) */
  setLevel(v: number) {
    if (Number.isFinite(v)) level = Math.max(0, Math.min(3, v))
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
    return { level, bpm: BPM, bar, pass }
  },
}

// the dev server swapping this file out: silence this copy first
import.meta.hot?.dispose(() => {
  if (timer) clearInterval(timer)
  timer = 0
  killOthers()
})
