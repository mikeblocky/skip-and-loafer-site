/**
 * The band for the three newer hidden games (Skip to School has its own, in ./music). Same
 * instruments and the same idea, scaled down: one song per game (see ./arcadeSongs), played
 * live on the site's synth voices, with the band getting busier and faster as the game gets
 * harder. The game sets a level from 0 to 1; on top of the core band (drums, bass, strum and
 * tune), an arpeggio joins past a third of the way, the drums double up past half way and the
 * song's colour (chip runs, brass stabs or a tambourine) comes in near the top. A danger flag
 * (last heart, or the clock nearly out) adds a heartbeat kick. Every time round the song lifts
 * a little in key, and stings play big moments in time with the band.
 */
import { voices as V } from './sfx'
import { ARCADE_SONGS, type ArcadeSong, type ArcadeSongId, type Lead } from './arcadeSongs'

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
const VOL = 0.85
const human = (amt = 0.15) => 1 + (Math.random() * 2 - 1) * amt

// ── instruments (the same voices Skip to School's band uses) ─────────────

function lead(kind: Lead, m: number, dur: number, delay: number, g = 1) {
  const f = hz(m)
  if (kind === 'kalimba') V.pluck({ f, dur: Math.max(0.3, dur * 1.5), g: 0.05 * g * VOL * human(), delay, wood: 0.3 })
  else if (kind === 'whistle') V.whistle({ f, dur: Math.max(0.12, dur * 0.94), g: 0.03 * g * VOL * human(0.1), delay })
  else if (kind === 'glock') V.pluck({ f, dur: 1.1, g: 0.032 * g * VOL * human(), delay, wood: 0.1 })
  else V.tone({ f: f * 1.02, f2: f, dur: Math.max(0.09, Math.min(dur * 0.9, 0.5)), type: 'triangle', g: 0.034 * g * VOL * human(0.1), a: 0.004, delay })
}
function strum(tones: number[], tr: number, delay: number, up: boolean, g = 1) {
  const order = up ? [...tones].reverse() : tones
  order.forEach((n, i) => V.pluck({ f: hz(n + tr), dur: 0.45, g: 0.017 * g * VOL * human(0.25), delay: delay + i * 0.013, wood: 0.4 }))
}
const kick = (delay: number, v = 1) => {
  V.tone({ f: 120, f2: 46, dur: 0.26, g: 0.13 * v * VOL, a: 0.003, delay })
  V.noise({ dur: 0.012, f: 3200, q: 0.8, g: 0.014 * v * VOL, a: 0.001, delay })
}
const brush = (delay: number, v = 1) => {
  V.noise({ dur: 0.14, f: 2300, q: 0.6, g: 0.035 * v * VOL, a: 0.008, delay })
  V.tone({ f: 185, f2: 150, dur: 0.07, g: 0.022 * v * VOL, delay })
}
const snare = (delay: number, v = 1) => {
  brush(delay, v * 0.7)
  V.noise({ dur: 0.11, f: 1800, q: 0.7, g: 0.05 * v * VOL, a: 0.002, delay })
  V.tone({ f: 230, f2: 170, dur: 0.06, g: 0.03 * v * VOL, a: 0.002, delay })
}
const hat = (delay: number, v = 1) => V.noise({ dur: 0.035, f: 6800, q: 0.9, g: 0.008 * v * VOL, a: 0.002, delay, type: 'highpass' })
const shaker = (delay: number, v = 1) => V.noise({ dur: 0.07, f: 5200, q: 1.4, g: 0.0095 * v * VOL, a: 0.02, delay })
const rim = (delay: number, v = 1) => {
  V.noise({ dur: 0.03, f: 1900, q: 3, g: 0.03 * v * VOL, a: 0.001, delay })
  V.tone({ f: 420, dur: 0.03, g: 0.012 * v * VOL, a: 0.001, delay })
}
/** the quiz's clock: a dry wooden tick, higher on the beat */
const clockTick = (delay: number, up: boolean, v = 1) => V.tone({ f: up ? 1900 : 1500, dur: 0.025, g: 0.012 * v * VOL, a: 0.001, delay })
const tamb = (delay: number, v = 1) => {
  V.noise({ dur: 0.06, f: 7200, q: 2.5, g: 0.01 * v * VOL, a: 0.002, delay })
  V.noise({ dur: 0.035, f: 9800, q: 3, g: 0.007 * v * VOL, a: 0.001, delay: delay + 0.012 })
}
const clap = (delay: number, v = 1) => {
  for (let i = 0; i < 3; i++) V.noise({ dur: 0.012, f: 1500, q: 1.2, g: 0.02 * v * VOL, a: 0.001, delay: delay + i * 0.009 })
  V.noise({ dur: 0.1, f: 1300, q: 1, g: 0.03 * v * VOL, a: 0.002, delay: delay + 0.027 })
}
const tom = (delay: number, k: number) => V.tone({ f: 170 - k * 18, f2: 95 - k * 6, dur: 0.18, g: 0.06 * VOL, a: 0.004, delay })
const splash = (delay: number, v = 1) => V.noise({ dur: 0.8, f: 6200, f2: 4200, q: 0.5, g: 0.016 * v * VOL, a: 0.004, delay })
function brass(tones: number[], tr: number, dur: number, delay: number, g = 1) {
  tones.forEach((n, i) => {
    const f = hz(n + tr)
    const at = delay + i * 0.004
    V.tone({ f, dur, type: 'triangle', g: 0.016 * g * VOL, a: 0.014, delay: at })
    V.tone({ f: f * 2.003, dur: dur * 0.6, g: 0.004 * g * VOL, a: 0.02, delay: at })
    V.tone({ f: f / 2, dur: dur * 1.1, type: 'triangle', g: 0.012 * g * VOL, a: 0.01, delay: at })
  })
}
function bass(m: number, len: number, delay: number, v = 1) {
  V.tone({ f: hz(m), dur: len, g: 0.09 * v * VOL * human(0.1), a: 0.01, delay })
  V.tone({ f: hz(m) * 2, dur: len * 0.5, g: 0.022 * v * VOL, a: 0.008, type: 'triangle', delay })
}

// ── the scheduler ────────────────────────────────────────────────────────

const AHEAD = 0.14
/** each time round the song lifts this many semitones (and holds at the top) */
const LIFTS = [0, 2, 3, 5]

type Sting = 'good' | 'big' | 'bad'

let song: ArcadeSong | null = null
let timer = 0
let level = 0
let danger = false
let bpm = 110
let next = 0
let step = 0
/** -1 = the intro, then an index into song.parts */
let part = -1
let loop = 0
let sectionN = 0
let stings: Sting[] = []

/** the melody of each section as sixteenth-step → [note, length in sixteenths] */
const eventsOf = new WeakMap<object, Map<number, [number, number]>>()
function events(mel: [number, number][]) {
  let map = eventsOf.get(mel)
  if (!map) {
    map = new Map()
    let at = 0
    for (const [m, len] of mel) {
      if (m) map.set(at, [m, len * 2])
      at += len * 2
    }
    eventsOf.set(mel, map)
  }
  return map
}

const sixteenth = () => 60 / bpm / 4
const section = () => (part < 0 ? song!.intro : song!.parts[part])
const keyNow = () => LIFTS[Math.min(loop, LIFTS.length - 1)]

function play(t: number) {
  if (!song || !V.live()) return
  const S = song
  const P = section()
  const bar = Math.floor(step / 16)
  const s = step % 16
  const ch = S.chords[P.chords[bar]] ?? Object.values(S.chords)[0]
  const tr = keyNow()
  const sx = sixteenth()
  const beat = sx * 4
  const lastBar = bar === P.chords.length - 1
  const swing = s % 4 === 2 ? sx * S.swing : 0
  const when = (extra = 0) => Math.max(0, t + swing + extra + (Math.random() - 0.5) * 0.01 - V.now())
  const full = P.drums === 'full'
  const busy = level > 0.5
  const hot = level > 0.72

  // stings: big moments, in key and on the beat
  if (stings.length && s % 4 === 0) {
    const k = stings.shift()!
    if (k === 'bad') {
      lead('kalimba', ch.root + 12 + tr, beat, when(), 0.8)
      lead('kalimba', ch.root + 11 + tr, beat, when(sx * 2), 0.6)
    } else if (k === 'good') {
      ch.tones.forEach((n, i) => lead('glock', n + 24 + tr, sx * 2, when(i * sx * 0.5), 0.6))
    } else {
      S.fanfare.forEach((m, i) => {
        lead('whistle', m + 12 + tr, sx * 1.8, when(i * sx), 0.8)
        lead('glock', m + 12 + tr, sx * 2, when(i * sx), 0.5)
      })
      brass([...ch.tones, ch.tones[0] + 12], tr, beat * 1.5, when(sx * 4), 1.1)
      splash(when(sx * 4))
    }
  }

  // the tune, on this section's lead
  const ev = events(P.mel).get(step)
  if (ev) {
    const L = part < 0 ? 'glock' : S.leads[sectionN % S.leads.length]
    const m = ev[0] + tr
    const dur = ev[1] * sx
    // the quiz plays its verses short and punchy, like someone talking fast
    const short = S.groove === 'tick' && P.drums !== 'half'
    lead(L, m, short ? Math.min(dur, sx * 1.4) : dur, when(), short ? 1.1 : 1)
    // in the choruses a second voice sits an octave below for body
    if (full && L !== 'chip') lead(L === 'glock' ? 'kalimba' : L, m - 12, dur, when(0.004), 0.4)
  }

  // the arpeggio that joins once things heat up
  if (level > 0.33 && P.drums !== 'intro' && P.drums !== 'half' && (busy ? s % 2 === 0 : s % 4 === 2)) {
    const tones = ch.tones
    const n = tones[(Math.floor(s / 2) + bar) % tones.length] + 12 + tr
    lead(S.counter, n, sx * 1.5, when(), busy ? 0.32 : 0.42)
  }

  // chords
  if (P.drums === 'half') {
    if (s === 0) ch.tones.forEach((n) => V.tone({ f: hz(n + tr), dur: beat * 4.1, g: 0.011 * VOL, a: beat * 0.8, delay: when() }))
  } else if (S.groove === 'tick') {
    // quiz: tight stabs on the off-beats
    if (s === 2 || s === 6 || s === 10 || s === 14) strum(ch.tones, tr, when(), false, s === 14 ? 0.8 : 0.6)
  } else if (full ? [0, 4, 6, 10, 12].includes(s) : s === 4 || s === 12) {
    strum(ch.tones, tr, when(), s === 6 || s === 10 || s === 12, s === 0 ? 0.8 : 1)
  }

  // bass, in the song's groove
  const root = ch.root + tr
  if (P.drums !== 'intro' || bar >= 2) {
    if (S.groove === 'bounce') {
      if (s % 2 === 0) bass(root + (s % 4 === 0 ? 0 : 12), sx * (s % 4 === 0 ? 1.4 : 1), when(), s % 4 === 0 ? 0.75 : 0.4)
    } else if (S.groove === 'tick') {
      // a pulsing eighth-note bass, root and fifth, that gets more insistent with level
      if (s % 2 === 0) bass(root + (s === 8 || s === 12 ? 7 : 0), sx * 1.2, when(), s % 4 === 0 ? 0.8 : 0.45 + level * 0.2)
    } else {
      // a walking line, one note a beat
      const walk = [0, 4, 7, 9]
      if (s % 4 === 0) bass(root + walk[s / 4], beat * 0.9, when(), s === 0 ? 1 : 0.75)
    }
  }

  // drums
  if (step === 0 && sectionN > 0) splash(when(), full ? 1.2 : 0.8)
  if (lastBar && P.drums !== 'intro' && s >= 12) {
    // a quick tom fill into the next section
    tom(when(), s - 12)
    if (s === 15) snare(when(), 0.8)
    return
  }
  if (P.drums === 'intro') {
    if (s % 2 === 0) shaker(when(), s % 4 === 2 ? 1 : 0.6)
    if (S.groove === 'tick' && s % 4 === 0) clockTick(when(), s === 0)
  } else if (P.drums === 'half') {
    if (s === 0) kick(when(), 0.9)
    if (s === 8) brush(when(), 0.8)
    if (s % 4 === 0) hat(when(), 0.6)
    if (S.groove === 'tick' && s % 4 === 0) clockTick(when(), s === 0, 0.8)
  } else if (S.groove === 'bounce') {
    if (s % 4 === 0) kick(when(), s === 0 ? 1 : 0.8)
    if (s === 4 || s === 12) (full ? snare : brush)(when(), 0.85)
    if (busy ? true : s % 2 === 0) hat(when(), s % 4 === 2 ? 1.1 : 0.6)
    if (!full && s % 2 === 0) shaker(when(), 0.7)
    // near the top: a chip run up the chord every other bar
    if (hot && bar % 2 === 1 && s >= 8 && s % 2 === 0) lead('chip', ch.tones[((s - 8) / 2) % 3] + 24 + tr, sx, when(), 0.5)
  } else if (S.groove === 'tick') {
    if (s === 0 || s === 8 || (full && s === 10)) kick(when(), s === 0 ? 1 : 0.8)
    if (s === 4 || s === 12) (full ? snare : rim)(when(), 0.8)
    // the clock ticks under everything, doubling up when it's busy
    if (busy || s % 2 === 0) clockTick(when(), s % 4 === 0, s % 2 ? 0.6 : 1)
    // near the top: brass stabs pushing on the and-of-two and four
    if (hot && full && (s === 6 || s === 14)) brass(ch.tones, tr, sx * 1.2, when(), 0.6)
  } else {
    // shuffle
    if (s === 0 || s === 8 || (busy && s === 14)) kick(when(), s === 0 ? 1 : 0.85)
    if (s === 4 || s === 12) (full ? snare : brush)(when(), 0.85)
    if (s % 4 === 0 || s % 4 === 2) shaker(when(), s % 4 === 2 ? 1 : 0.6)
    if (full && busy && (s === 4 || s === 12)) clap(when(0.004), 0.6)
    // near the top: tambourine on the off-beats
    if (hot && s % 4 === 2) tamb(when(), 0.9)
  }
  // last heart or the clock nearly out: a heartbeat kick on every beat and busier hats
  if (danger) {
    if (s % 4 === 0 && s !== 0 && s !== 8) kick(when(), 0.6)
    if (s % 2 === 1) hat(when(), 0.5)
  }
}

function advance() {
  next += sixteenth()
  step++
  if (step >= section().chords.length * 16) {
    step = 0
    sectionN++
    part++
    if (part >= song!.parts.length) {
      part = 0
      loop++
    }
  }
}

function tick() {
  if (!song) return
  const [lo, hi] = song.bpm
  // ease toward the level's tempo, so speed-ups feel like the band pushing
  bpm += (lo + (hi - lo) * level - bpm) * 0.06
  const now = V.now()
  if (next < now - 0.2) next = now + 0.05 // fell behind (tab was hidden): pick up from here
  while (next < now + AHEAD) {
    play(next)
    advance()
  }
}

export const arcade = {
  /** start a game's song from the intro */
  start(id: ArcadeSongId) {
    this.stop()
    song = ARCADE_SONGS[id]
    level = 0
    danger = false
    bpm = song.bpm[0]
    step = 0
    part = -1
    loop = 0
    sectionN = 0
    stings = []
    next = V.now() + 0.08
    timer = window.setInterval(tick, 25)
  },
  /** stop; with `sad`, the song's little falling phrase */
  stop(sad = false) {
    if (timer) clearInterval(timer)
    timer = 0
    const was = song
    song = null
    stings = []
    if (sad && was && V.live()) {
      const tr = keyNow()
      was.sad.forEach((m, i) => V.whistle({ f: hz(m + tr), dur: i === 3 ? 0.9 : 0.26, g: 0.03, delay: 0.12 + i * 0.24 }))
      V.tone({ f: hz(was.sad[3] - 24 + tr), dur: 1.2, g: 0.06, a: 0.02, delay: 0.84 })
    }
  },
  /** how hard the game is right now, 0..1: tempo and layers follow it */
  setLevel(v: number) {
    level = Math.max(0, Math.min(1, v))
  },
  setDanger(on: boolean) {
    danger = on
  },
  /** a moment played by the band on the next beat; false when the band isn't playing */
  sting(kind: Sting) {
    if (!song) return false
    stings.push(kind)
    return true
  },
  get playing() {
    return !!song
  },
  /** for tests */
  get state() {
    return { part, loop, bpm: Math.round(bpm), level, danger, key: keyNow() }
  },
}
