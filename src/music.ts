/**
 * The game's song (see ./gameSong), played live on the site's synth voices. Each section comes
 * back re-arranged, every note gets a little human looseness and the eighths swing a touch.
 * Tempo follows the game (setPace), and a "danger" flag makes the drums more urgent.
 */
import { voices as V } from './sfx'
import { CHORD, diatonic, EVENTS, hz, LIFT, SONG, UNLOCKS, type Lead } from './gameSong'

// ── voices ───────────────────────────────────────────────────────────────

const VOL = 0.75
const human = (amt = 0.15) => 1 + (Math.random() * 2 - 1) * amt

function lead(kind: Lead, m: number, dur: number, delay: number, g = 1) {
  const f = hz(m)
  if (kind === 'kalimba') V.pluck({ f, dur: Math.max(0.3, dur * 1.5), g: 0.05 * g * VOL * human(), delay, wood: 0.3 })
  else if (kind === 'whistle') V.whistle({ f, dur: Math.max(0.12, dur * 0.94), g: 0.03 * g * VOL * human(0.1), delay })
  else if (kind === 'glock') V.pluck({ f, dur: 1.1, g: 0.032 * g * VOL * human(), delay, wood: 0.1 })
  else {
    // chip: a soft triangle with a tiny pitch blip at the start, like an old handheld (but warm)
    V.tone({ f: f * 1.02, f2: f, dur: Math.max(0.09, Math.min(dur * 0.9, 0.5)), type: 'triangle', g: 0.034 * g * VOL * human(0.1), a: 0.004, delay })
  }
}

function strum(tones: number[], tr: number, delay: number, up: boolean, g = 1) {
  const order = up ? [...tones].reverse() : tones
  order.forEach((n, i) => V.pluck({ f: hz(n + tr), dur: 0.45, g: 0.017 * g * VOL * human(0.25), delay: delay + i * 0.013, wood: 0.4 }))
}

const kick = (delay: number, v = 1) => V.tone({ f: 105, f2: 44, dur: 0.22, g: 0.11 * v * VOL, a: 0.004, delay })
const brush = (delay: number, v = 1) => {
  V.noise({ dur: 0.14, f: 2300, q: 0.6, g: 0.035 * v * VOL, a: 0.008, delay })
  V.tone({ f: 185, f2: 150, dur: 0.07, g: 0.022 * v * VOL, delay })
}
const hat = (delay: number, v = 1) => V.noise({ dur: 0.035, f: 6800, q: 0.9, g: 0.011 * v * VOL, a: 0.002, delay, type: 'highpass' })
const shaker = (delay: number, v = 1) => V.noise({ dur: 0.07, f: 5200, q: 1.4, g: 0.0095 * v * VOL, a: 0.02, delay })
const tom = (delay: number, k: number) => V.tone({ f: 170 - k * 18, f2: 95 - k * 6, dur: 0.18, g: 0.06 * VOL, a: 0.004, delay })
const splash = (delay: number) => V.noise({ dur: 0.7, f: 6200, f2: 4200, q: 0.5, g: 0.016 * VOL, a: 0.004, delay })

// ── styles ───────────────────────────────────────────────────────────────

/**
 * The band can play the same song several ways. A style swaps the groove (swing, drums, bass)
 * and nudges the lead instruments; the tune and harmony stay the same, so it still feels like
 * one song, just re-arranged.
 */
type StyleName = 'pop' | 'shuffle' | 'march' | 'bossa' | 'chip'
interface Style {
  swing: number
  bass: 'root5' | 'walk' | 'bossa' | 'bounce'
  /** replacement lead per authored lead, if the style wants a different colour */
  leads?: Partial<Record<Lead, Lead>>
}
const STYLES: Record<StyleName, Style> = {
  pop: { swing: 0.16, bass: 'root5' },
  shuffle: { swing: 0.33, bass: 'walk', leads: { glock: 'kalimba' } },
  march: { swing: 0, bass: 'root5', leads: { kalimba: 'glock', whistle: 'glock' } },
  bossa: { swing: 0.06, bass: 'bossa', leads: { kalimba: 'whistle', glock: 'whistle' } },
  chip: { swing: 0, bass: 'bounce', leads: { kalimba: 'chip', whistle: 'chip' } },
}

const rim = (delay: number, v = 1) => {
  V.noise({ dur: 0.03, f: 1900, q: 3, g: 0.03 * v * VOL, a: 0.001, delay })
  V.tone({ f: 420, dur: 0.03, g: 0.012 * v * VOL, a: 0.001, delay })
}

/** the busy-section groove for each style (quiet sections keep their own light patterns) */
function groove(style: StyleName, s: number, bar: number, when: (x?: number) => number) {
  if (style === 'pop') {
    if (s === 0 || s === 8 || s === 10 || (bar % 2 === 1 && s === 6)) kick(when(), s === 0 ? 1 : 0.8)
    if (s === 4 || s === 12) brush(when())
    if (s % 2 === 0) hat(when(), s % 4 === 0 ? 0.7 : 1)
    if (s === 15 && Math.random() < 0.25) brush(when(), 0.3)
  } else if (style === 'shuffle') {
    if (s === 0 || s === 8) kick(when(), 0.95)
    if (s === 4 || s === 12) brush(when(), 0.9)
    if (s % 4 === 0 || s % 4 === 2) shaker(when(), s % 4 === 2 ? 1 : 0.6)
    if (s === 14 && bar % 2) kick(when(), 0.5)
  } else if (style === 'march') {
    if (s % 4 === 0) kick(when(), s === 0 ? 1 : 0.75)
    if (s % 2 === 0) brush(when(), s === 4 || s === 12 ? 0.95 : 0.35)
    if (s === 14 || s === 15) brush(when(), 0.5)
  } else if (style === 'bossa') {
    if (s === 0 || s === 6 || s === 8 || s === 14) kick(when(), 0.7)
    // a 3-3-2 rim pattern
    if ([0, 3, 6, 10, 12].includes(s)) rim(when(), s === 0 ? 0.9 : 0.7)
    if (s % 2 === 0) shaker(when(), 0.7)
  } else {
    // chip: four on the floor, tight snare, open-ish hats on the offbeats
    if (s % 4 === 0) kick(when(), 0.9)
    if (s === 4 || s === 12) brush(when(), 0.8)
    if (s % 4 === 2) hat(when(), 1.1)
  }
}

// ── the scheduler ────────────────────────────────────────────────────────

const AHEAD = 0.14 // seconds scheduled in advance
const AUTHORED = [1, 2, 3, 4, 5, 6, 7] // the song's own order, after the intro
/** how many remixes have happened this run (new themes unlock as this grows) */
let remixes = 0
let timer = 0
let running = false
let bpm = 112
let targetBpm = 112
let danger = false
let order: number[] = [0, ...AUTHORED]
let slot = 0 // position in `order`
let step = 0
let loop = 0
let next = 0
let style: StyleName = 'pop'
let lift = 0
/** a remix waits for the next section, so the change lands on a downbeat */
let pending: { style: StyleName; order: number[]; lift: number } | null = null
/**
 * Game moments played by the band itself, in its own key and tempo (so they never clash):
 * a friend joining gets a glockenspiel flourish on the next beat; the win gets a one-bar
 * fanfare of the motif on the next downbeat, then the band moves to a new style.
 */
let cues: ('join' | 'win')[] = []
/** break time: the band drops to a relaxed half-time groove */
let resting = false

const sixteenth = () => 60 / bpm / 4
const partNow = () => order[slot]

function play(t: number) {
  if (!V.live()) return
  const part = partNow()
  const P = SONG[part]
  const S = STYLES[style]
  const bar = Math.floor(step / 16)
  const s = step % 16
  const ch = CHORD[P.chords[bar]]
  const tr = LIFT[loop % LIFT.length] + lift
  const sx = sixteenth()
  const beat = sx * 4
  const lastBar = bar === P.chords.length - 1
  // the style's swing on the off-eighths, plus a few ms of looseness on everything
  const swing = s % 4 === 2 ? sx * S.swing : 0
  const when = (extra = 0) => Math.max(0, t + swing + extra + (Math.random() - 0.5) * 0.012 - V.now())
  const leadOf = (l: Lead) => S.leads?.[l] ?? l

  // game moments, on the beat
  if (cues.length && (cues[0] === 'win' ? s === 0 : s % 4 === 0)) {
    const c = cues.shift()!
    if (c === 'join') {
      ch.tones.forEach((n, i) => lead('glock', n + 12 + tr, sx * 2, when(i * sx * 0.5), 0.7))
    } else {
      // the motif, rising to the top, over one bar; then the new style starts next section
      ;[74, 79, 81, 83].forEach((m, i) => {
        lead('whistle', m + 12 + tr, sx * 1.8, when(i * sx * 2), 0.9)
        lead('glock', m + 12 + tr, sx * 2, when(i * sx * 2), 0.6)
      })
      lead('whistle', 86 + 12 + tr, beat * 2, when(beat * 2), 1)
      strum([...ch.tones, ch.tones[0] + 12], tr, when(beat * 2), false, 1.3)
      splash(when())
      music.remix()
    }
  }

  // melody
  const ev = EVENTS[part].get(step)
  if (ev) {
    const m = ev[0] + tr + (P.octave ?? 0)
    const dur = ev[1] * sx
    const L = leadOf(P.lead)
    if (P.ornament && ev[1] >= 4 && Math.random() < 0.55) lead(L === 'whistle' ? 'whistle' : 'kalimba', diatonic(m, 1), 0.07, when(-0.055), 0.55)
    lead(L, m, dur, when())
    if (P.harmony) lead(L === 'glock' ? 'kalimba' : L, diatonic(m, -2) - (P.octave ?? 0), dur, when(0.006), 0.5)
  }

  // countermelody: glockenspiel arpeggio of the chord on the off-eighths
  // (break time drops the countermelody and lightens the strum, so it really feels like a breather)
  if (P.counter && !resting && s % 4 === 2) {
    const tones = ch.tones
    const n = tones[(bar * 2 + Math.floor(s / 4)) % tones.length] + 12 + tr
    lead(style === 'chip' ? 'chip' : 'glock', n, sx * 2, when(), 0.45)
  }

  // ukulele-ish strum, or a soft pad in the bridge
  const strumKind = resting && P.strum === 'busy' ? 'stab' : P.strum
  if (strumKind === 'stab' && (s === 4 || s === 12)) strum(ch.tones, tr, when(), s === 12, resting ? 0.7 : 1)
  if (strumKind === 'busy' && [0, 4, 6, 10, 12].includes(s)) strum(ch.tones, tr, when(), s === 6 || s === 10, s === 0 ? 0.8 : 1)
  if (P.strum === 'pad' && s === 0)
    ch.tones.forEach((n) => V.tone({ f: hz(n + tr), dur: beat * 4.1, g: 0.011 * VOL, a: beat * 0.8, delay: when() }))

  // bass, in the style's pattern
  const root = ch.root + tr
  if (P.drums !== 'shaker' || bar >= 2) {
    const bass = (m: number, len: number, v = 1) => {
      V.tone({ f: hz(m), dur: len, g: 0.075 * v * VOL * human(0.1), a: 0.012, delay: when() })
      V.tone({ f: hz(m) * 2, dur: len * 0.5, g: 0.014 * v * VOL, a: 0.01, delay: when() })
    }
    if (S.bass === 'root5') {
      if (s === 0) bass(root, beat * 1.6)
      if (s === 8) bass(root + 7, beat * 1.2, 0.85)
      if (P.strum === 'busy' && s === 6) bass(root + 12, beat * 0.4, 0.6)
      if (s === 14 && !lastBar) bass(root + (bar % 2 ? 5 : 4), sx * 1.6, 0.6)
    } else if (S.bass === 'walk') {
      // a walking line, one note a beat
      const walk = [0, 4, 7, 9]
      if (s % 4 === 0) bass(root + walk[s / 4], beat * 0.9, s === 0 ? 1 : 0.75)
    } else if (S.bass === 'bossa') {
      if (s === 0) bass(root, beat * 1.4)
      if (s === 6) bass(root + 7, beat * 0.5, 0.7)
      if (s === 8) bass(root + 7, beat * 1.4, 0.8)
      if (s === 14) bass(root, beat * 0.5, 0.6)
    } else if (s % 2 === 0) {
      // bounce: octave hops on every eighth
      bass(root + (s % 4 === 0 ? 0 : 12), sx * 1.6, s % 4 === 0 ? 0.9 : 0.55)
    }
  }

  // drums
  const fill = lastBar && s >= 12 && P.drums !== 'shaker'
  // a soft cymbal on every new section (but not on the very first downbeat of the intro)
  if (step === 0 && (slot > 0 || order[0] !== 0 || loop > 0)) splash(when())
  if (fill) {
    tom(when(), s - 12)
    if (s === 15) brush(when(), 0.9)
    return
  }
  if (P.drums === 'shaker') {
    if (s % 2 === 0) shaker(when(), s % 4 === 2 ? 1 : 0.6)
  } else if (P.drums === 'light' && !resting) {
    if (s === 0 || s === 8) kick(when(), 0.8)
    if (s === 4 || s === 12) (style === 'bossa' ? rim : brush)(when(), 0.6)
    if (s % 2 === 0) shaker(when(), s % 4 === 2 ? 1 : 0.55)
  } else if (P.drums === 'full' && !resting) {
    groove(style, s, bar, when)
  } else if (P.drums === 'half' || resting) {
    if (s === 0) kick(when(), 0.9)
    if (s === 8) brush(when(), 0.8)
    if (s % 4 === 0) hat(when(), 0.6)
  }
  // last heart: a heartbeat kick on every beat and busier hats
  if (danger && !resting && P.drums !== 'half') {
    if (s % 4 === 0 && s !== 0 && s !== 8) kick(when(), 0.6)
    if (s % 2 === 1) hat(when(), 0.5)
  }
}

function advance() {
  next += sixteenth()
  step++
  if (step >= SONG[partNow()].chords.length * 16) {
    step = 0
    slot++
    if (pending) {
      // the remix lands here, on the downbeat of a new section
      style = pending.style
      order = pending.order
      lift = pending.lift
      pending = null
      slot = 0
    } else if (slot >= order.length) {
      slot = order[0] === 0 ? 1 : 0 // the intro only plays once
      loop++
    }
  }
}

function tick() {
  // ease toward the game's pace so speed-ups feel like a band pushing, not a jump
  bpm += (targetBpm - bpm) * 0.08
  const now = V.now()
  if (next < now - 0.2) next = now + 0.05 // fell behind (tab was hidden): pick up from here
  while (next < now + AHEAD) {
    play(next)
    advance()
  }
}

const shuffled = <T,>(a: T[]) => {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

export const music = {
  start(pace = 112) {
    this.stop()
    running = true
    bpm = targetBpm = pace
    danger = false
    style = 'pop'
    order = [0, ...AUTHORED]
    remixes = 0
    lift = 0
    pending = null
    cues = []
    resting = false
    slot = 0
    step = 0
    loop = 0
    next = V.now() + 0.08
    timer = window.setInterval(tick, 25)
  },
  /**
   * Re-arrange the song: a new style (never the same one twice in a row), the sections in a
   * new order, and maybe a small key change. Takes effect at the next section.
   */
  remix() {
    if (!running) return
    const names = (Object.keys(STYLES) as StyleName[]).filter((n) => n !== (pending?.style ?? style))
    remixes++
    // the pool grows: new themes join once they're unlocked, and a fresh one leads off
    const fresh = UNLOCKS.filter(([at]) => at === remixes).flatMap(([, ids]) => ids)
    const pool = [...AUTHORED, ...UNLOCKS.filter(([at]) => at < remixes).flatMap(([, ids]) => ids)]
    // keep the order a sensible length: a handful of the usual sections around the themes
    const mixed = shuffled(pool).slice(0, 8)
    pending = {
      style: names[Math.floor(Math.random() * names.length)],
      order: [...fresh, ...mixed],
      lift: [0, 0, 2, -2, 3][Math.floor(Math.random() * 5)],
    }
  },
  /** Stop; with `sad`, a little falling phrase, like being late for class. */
  stop(sad = false) {
    if (timer) clearInterval(timer)
    timer = 0
    const was = running
    running = false
    pending = null
    cues = []
    if (sad && was && V.live()) {
      const tr = LIFT[loop % LIFT.length] + lift
      ;[79, 76, 74, 67].forEach((m, i) => V.whistle({ f: hz(m + tr), dur: i === 3 ? 0.9 : 0.26, g: 0.03, delay: 0.12 + i * 0.24 }))
      V.tone({ f: hz(43 + tr), dur: 1.2, g: 0.06, a: 0.02, delay: 0.84 })
    }
  },
  /** Beats per minute to drift toward. */
  setPace(target: number) {
    targetBpm = Math.max(90, Math.min(180, target))
  },
  setDanger(on: boolean) {
    danger = on
  },
  /** play a game moment in time with the band ('join' on the next beat, 'win' on the next bar) */
  cue(kind: 'join' | 'win') {
    if (running) cues.push(kind)
    return running
  },
  /** break time on/off */
  setRest(on: boolean) {
    resting = on
  },
  /** for tests: what the band is playing right now */
  get state() {
    return { style, order: [...order], slot, part: partNow(), pending: pending?.style ?? null, remixes }
  },
}
