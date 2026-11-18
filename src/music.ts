/**
 * THE LINE-UP. Every section has the same core band: drums, bass, strummed chords and the tune
 * (with at most one voice alongside it). On top of that a section gets ONE colour, never more:
 * a glockenspiel countermelody, a tambourine, or brass pushes (or nothing). Energy comes from the
 * drums driving harder and the tempo climbing, not from piling on more instruments.
 *
 * The game's song (see ./gameSong), played live on the site's synth voices. Each section comes
 * back re-arranged, every note gets a little human looseness and the eighths swing a touch.
 * Tempo follows the game (setPace), and a "danger" flag makes the drums more urgent. Sections end
 * on a different fill each time, and the band changes style every time round so it never settles.
 */
import { voices as V } from './sfx'
import { CHORD, diatonic, EVENTS, hz, LIFT, SONG, UNLOCKS, type Lead } from './gameSong'

// ── voices ───────────────────────────────────────────────────────────────

const VOL = 0.9
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

// a kick with a click on the front so it cuts through, and a longer body underneath
const kick = (delay: number, v = 1) => {
  V.tone({ f: 120, f2: 46, dur: 0.26, g: 0.13 * v * VOL, a: 0.003, delay })
  V.noise({ dur: 0.012, f: 3200, q: 0.8, g: 0.014 * v * VOL, a: 0.001, delay })
}
const brush = (delay: number, v = 1) => {
  V.noise({ dur: 0.14, f: 2300, q: 0.6, g: 0.035 * v * VOL, a: 0.008, delay })
  V.tone({ f: 185, f2: 150, dur: 0.07, g: 0.022 * v * VOL, delay })
}
const hat = (delay: number, v = 1) => V.noise({ dur: 0.035, f: 6800, q: 0.9, g: 0.008 * v * VOL, a: 0.002, delay, type: 'highpass' })
const shaker = (delay: number, v = 1) => V.noise({ dur: 0.07, f: 5200, q: 1.4, g: 0.0095 * v * VOL, a: 0.02, delay })
const tom = (delay: number, k: number) => V.tone({ f: 170 - k * 18, f2: 95 - k * 6, dur: 0.18, g: 0.06 * VOL, a: 0.004, delay })
const splash = (delay: number, v = 1) => V.noise({ dur: 0.8, f: 6200, f2: 4200, q: 0.5, g: 0.016 * v * VOL, a: 0.004, delay })
/** a proper snare: the brush plus a crack and a little drum-head tone */
const snare = (delay: number, v = 1) => {
  brush(delay, v * 0.7)
  V.noise({ dur: 0.11, f: 1800, q: 0.7, g: 0.05 * v * VOL, a: 0.002, delay })
  V.tone({ f: 230, f2: 170, dur: 0.06, g: 0.03 * v * VOL, a: 0.002, delay })
}
/** handclap: a few bursts smeared together */
const clap = (delay: number, v = 1) => {
  for (let i = 0; i < 3; i++) V.noise({ dur: 0.012, f: 1500, q: 1.2, g: 0.02 * v * VOL, a: 0.001, delay: delay + i * 0.009 })
  V.noise({ dur: 0.1, f: 1300, q: 1, g: 0.03 * v * VOL, a: 0.002, delay: delay + 0.027 })
}
/** a whoosh rising into the next section */
const riser = (delay: number, len: number) => V.noise({ dur: len, f: 300, f2: 4200, q: 0.6, g: 0.026 * VOL, a: len * 0.9, delay, type: 'lowpass' })

/**
 * A pep-band brass section, kept round so it sits with the acoustic band: a triangle for the body,
 * a quiet sine an octave up for the shine, and a triangle an octave down for weight.
 */
function brass(tones: number[], tr: number, dur: number, delay: number, g = 1) {
  tones.forEach((n, i) => {
    const f = hz(n + tr)
    const at = delay + i * 0.004
    V.tone({ f, dur, type: 'triangle', g: 0.016 * g * VOL, a: 0.014, delay: at })
    V.tone({ f: f * 2.003, dur: dur * 0.6, g: 0.004 * g * VOL, a: 0.02, delay: at })
    V.tone({ f: f / 2, dur: dur * 1.1, type: 'triangle', g: 0.012 * g * VOL, a: 0.01, delay: at })
  })
}
/** tambourine: a bright shake with jingles riding on top */
const tamb = (delay: number, v = 1) => {
  V.noise({ dur: 0.06, f: 7200, q: 2.5, g: 0.01 * v * VOL, a: 0.002, delay })
  V.noise({ dur: 0.035, f: 9800, q: 3, g: 0.007 * v * VOL, a: 0.001, delay: delay + 0.012 })
}
/** taiko: a big festival drum, deep with a skin slap on top (the stomp build-up uses it) */
const taiko = (delay: number, v = 1) => {
  V.tone({ f: 110, f2: 58, dur: 0.38, g: 0.12 * v * VOL, a: 0.004, delay })
  V.noise({ dur: 0.05, f: 600, q: 1, g: 0.04 * v * VOL, a: 0.002, delay, type: 'lowpass' })
}
/** the drop: a deep hit on the new key's root (and its octave), held steady so the landing feels like a lift */
const boom = (m: number, delay: number) => {
  V.tone({ f: hz(m), f2: hz(m) * 0.985, dur: 0.8, g: 0.11 * VOL, a: 0.006, delay })
  V.tone({ f: hz(m + 12), dur: 0.5, type: 'triangle', g: 0.03 * VOL, a: 0.004, delay })
}

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
function groove(style: StyleName, s: number, bar: number, when: (x?: number) => number, big: boolean) {
  // choruses (the busy sections) clap along on the backbeat and run the hats in sixteenths
  if (big && style !== 'bossa' && (s === 4 || s === 12)) clap(when(0.004), 0.75)
  // when it gets going, the choruses drive on a four-on-the-floor kick under whatever the style plays
  if (big && energy() > 0.6 && style !== 'bossa' && s % 4 === 0 && s !== 0) kick(when(), 0.7)
  if (style === 'pop') {
    // steady and clean: kick on one and three, snare on two and four, even eighth hats
    if (s === 0 || s === 8) kick(when(), s === 0 ? 1 : 0.85)
    if (s === 4 || s === 12) snare(when(), 0.9)
    if (s % 2 === 0) hat(when(), s % 4 === 0 ? 0.6 : 0.85)
  } else if (style === 'shuffle') {
    if (s === 0 || s === 8) kick(when(), 0.95)
    if (s === 4 || s === 12) brush(when(), 0.9)
    if (s % 4 === 0 || s % 4 === 2) shaker(when(), s % 4 === 2 ? 1 : 0.6)
    if (s === 14 && bar % 2) kick(when(), 0.5)
  } else if (style === 'march') {
    if (s % 4 === 0) kick(when(), s === 0 ? 1 : 0.75)
    if (s === 4 || s === 12) snare(when(), 0.9)
    else if (s % 2 === 0) brush(when(), 0.35)
    if (s === 14 || s === 15) brush(when(), 0.5)
  } else if (style === 'bossa') {
    if (s === 0 || s === 6 || s === 8 || s === 14) kick(when(), 0.7)
    // a 3-3-2 rim pattern
    if ([0, 3, 6, 10, 12].includes(s)) rim(when(), s === 0 ? 0.9 : 0.7)
    if (s % 2 === 0) shaker(when(), 0.7)
  } else {
    // chip: four on the floor, tight snare, open-ish hats on the offbeats
    if (s % 4 === 0) kick(when(), 0.9)
    if (s === 4 || s === 12) snare(when(), 0.85)
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
/** how this section ends: a tom fill, a snare roll into a whoosh, or everything stopping for a big hit */
type Fill = 'toms' | 'roll' | 'stop'
let fill: Fill = 'toms'
const pickFill = (): Fill => (['toms', 'roll', 'roll', 'stop'] as Fill[])[Math.floor(Math.random() * 4)]
/**
 * The styles the band rotates through: the original four. Chip is left out: next to the acoustic
 * band it came across as muddy and grating.
 */
const STYLE_NAMES: StyleName[] = ['pop', 'shuffle', 'march', 'bossa']

const sixteenth = () => 60 / bpm / 4
/** how hyped the band is, 0..1: it follows the game's pace, and the last heart pushes it too */
/** the band's own push on top of the game's pace: a little faster every section, up to MAX_BPM */
let drive = 0
const MAX_BPM = 200
/** a build-up just played, so the next downbeat drops */
let dropNext = false
/**
 * The key climbs: a drop lands a whole step higher than the last, like a song lifting for its last
 * chorus, until it's KEY_MAX semitones up; then it holds there. It never steps back down in a run.
 */
let climb = 0
const KEY_STEP = 2
const KEY_MAX = 5
/** the semitones everything is shifted by right now */
const keyNow = () => Math.min(KEY_MAX, lift + Math.max(LIFT[loop % LIFT.length], climb))
/** where the key goes at the next drop */
const keyNext = () => Math.min(KEY_MAX, keyNow() + KEY_STEP)

/**
 * How the two bars before a chorus wind up. Each build is a different kind, never the same twice
 * in a row: a snare roll, stadium stomps and claps, a breakdown that strips back and rebuilds, a
 * stutter of chord stabs getting faster, a lift on toms and a climbing bass, or brass and kalimba
 * calling and answering.
 */
type Build = 'roll' | 'stomp' | 'breakdown' | 'stutter' | 'lift' | 'call'
const BUILDS: Build[] = ['roll', 'stomp', 'breakdown', 'stutter', 'lift', 'call']
let build: Build = 'roll'
let lastBuild: Build | null = null
const pick = <T,>(pool: T[], not?: T | null) => {
  const ok = pool.filter((x) => x !== not)
  return ok[Math.floor(Math.random() * ok.length)]
}
const pickBuild = () => pick(BUILDS, lastBuild)

/**
 * The notes a build climbs on, one a beat for eight beats, in semitones below the note the drop
 * lands on. Chosen separately from the build's drums, so the same rhythm can climb a new way.
 */
const CLIMBS = {
  scale: [-12, -10, -8, -7, -5, -3, -2, -1],
  arpeggio: [-24, -20, -17, -12, -8, -5, -3, -1],
  chromatic: [-8, -7, -6, -5, -4, -3, -2, -1],
  octaves: [-24, -12, -22, -10, -20, -8, -17, -5],
  pedal: [-12, -12, -12, -12, -12, -12, -5, -1],
} as const
type Climb = keyof typeof CLIMBS
const CLIMB_NAMES = Object.keys(CLIMBS) as Climb[]
let climbLine: Climb = 'scale'

/**
 * How the tune is played this time round. Each section picks a treatment (never the one it had
 * last), and sometimes hands the tune to a different instrument, so repeats never sound the same.
 */
type Treatment = 'plain' | 'octaves' | 'punchy' | 'thirds'
// (echoes, broken-up arpeggios and turns were tried and made the tune too busy to follow)
const TREATMENTS: Treatment[] = ['plain', 'octaves', 'punchy', 'thirds']
let treatment: Treatment = 'plain'
let swapLead: Lead | null = null

/** this section's one colour layer on top of the core band */
type Colour = 'glock' | 'tamb' | 'brass' | 'none'
let colour: Colour = 'none'
/** busy sections nearly always get a colour; the rest often go without, to leave room */
const pickColour = (busy: boolean): Colour =>
  pick<Colour>(busy ? ['glock', 'tamb', 'brass', 'glock', 'brass'] : ['glock', 'tamb', 'none', 'none'], colour)
const energy = () => Math.min(1, Math.max(0, (bpm - 116) / 40) + (danger ? 0.2 : 0))
const partNow = () => order[slot]

function play(t: number) {
  if (!V.live()) return
  const part = partNow()
  const P = SONG[part]
  const S = STYLES[style]
  const bar = Math.floor(step / 16)
  const s = step % 16
  const ch = CHORD[P.chords[bar]]
  const tr = keyNow()
  const sx = sixteenth()
  const beat = sx * 4
  const lastBar = bar === P.chords.length - 1
  // the style's swing on the off-eighths, plus a few ms of looseness on everything
  const swing = s % 4 === 2 ? sx * S.swing : 0
  const when = (extra = 0) => Math.max(0, t + swing + extra + (Math.random() - 0.5) * 0.012 - V.now())
  // each section picks its one colour layer as it starts
  if (step === 0) colour = pickColour(P.strum === 'busy')
  // the two bars before a chorus are a build-up
  const nextPart = pending ? pending.order[0] : slot + 1 < order.length ? order[slot + 1] : order[order[0] === 0 ? 1 : 0]
  const bars = P.chords.length
  const building = P.drums !== 'shaker' && !resting && bars >= 4 && bar >= bars - 2 && SONG[nextPart]?.strum === 'busy'
  const first = bar === bars - 2
  /** a breakdown drops the band out, so only the melody, claps and a held chord are left */
  const stripped = building && build === 'breakdown'
  const leadOf = (l: Lead) => S.leads?.[l] ?? l

  // game moments, on the beat
  if (cues.length && (cues[0] === 'win' ? s === 0 : s % 4 === 0)) {
    const c = cues.shift()!
    if (c === 'join') {
      ch.tones.forEach((n, i) => lead('glock', n + 12 + tr, sx * 2, when(i * sx * 0.5), 0.7))
      // the band cheers a new friend in: a short brass hit
      brass(ch.tones, tr, sx * 2.5, when(), 0.9)
    } else {
      // the motif, rising to the top, over one bar; then the new style starts next section
      ;[74, 79, 81, 83].forEach((m, i) => {
        lead('whistle', m + 12 + tr, sx * 1.8, when(i * sx * 2), 0.9)
        lead('glock', m + 12 + tr, sx * 2, when(i * sx * 2), 0.6)
      })
      lead('whistle', 86 + 12 + tr, beat * 2, when(beat * 2), 1)
      strum([...ch.tones, ch.tones[0] + 12], tr, when(beat * 2), false, 1.3)
      // the brass answers the fanfare: two pushes and a long held chord
      brass(ch.tones, tr, sx * 1.5, when(beat * 1.5), 1)
      brass(ch.tones, tr, sx * 1.5, when(beat * 1.75), 1)
      brass([...ch.tones, ch.tones[0] + 12], tr, beat * 2, when(beat * 2), 1.3)
      splash(when())
      music.remix()
    }
  }

  // melody
  // scale steps in the key we're in now (the song is written in G; tr moves it)
  const dia = (m: number, k: number) => diatonic(m - tr, k) + tr
  const ev = EVENTS[part].get(step)
  if (ev) {
    const m = ev[0] + tr + (P.octave ?? 0)
    const dur = ev[1] * sx
    const long = ev[1] >= 4
    // the intro always states the tune plainly; after that each section has its own treatment
    const how: Treatment = part === 0 ? 'plain' : treatment
    const L = part !== 0 && swapLead && style !== 'chip' ? swapLead : leadOf(P.lead)
    if (P.ornament && long && Math.random() < 0.55) lead(L === 'whistle' ? 'whistle' : 'kalimba', dia(m, 1), 0.07, when(-0.055), 0.55)
    if (how === 'punchy') {
      // short and accented
      lead(L, m, Math.min(dur, sx * 1.2), when(), 1.15)
    } else {
      lead(L, m, dur, when())
    }
    // At most ONE extra voice ever joins the tune, so it stays clear: the treatment's own if it has
    // one, otherwise the section's written harmony, otherwise (in a chorus) an octave below for body.
    const second = L === 'glock' ? 'kalimba' : L
    if (how === 'octaves') lead(second, m - 12, dur, when(0.003), 0.55)
    else if (how === 'thirds') lead(second, dia(m, 2), dur, when(0.005), 0.45)
    else if (P.harmony) lead(second, dia(m, -2) - (P.octave ?? 0), dur, when(0.006), 0.45)
    else if (P.strum === 'busy' && !resting && L !== 'chip') lead('kalimba', m - 12, dur, when(0.004), 0.45)
  }

  // countermelody: glockenspiel arpeggio of the chord on the off-eighths
  // (break time drops the countermelody and lightens the strum, so it really feels like a breather)
  if ((P.counter || colour === 'glock') && colour !== 'tamb' && colour !== 'brass' && !resting && !stripped && s % 4 === 2) {
    const tones = ch.tones
    const n = tones[(bar * 2 + Math.floor(s / 4)) % tones.length] + 12 + tr
    lead(style === 'chip' ? 'chip' : 'glock', n, sx * 2, when(), 0.45)
  }

  // ukulele-ish strum, or a soft pad in the bridge
  const strumKind = stripped ? 'none' : resting && P.strum === 'busy' ? 'stab' : P.strum
  if (strumKind === 'stab' && (s === 4 || s === 12)) strum(ch.tones, tr, when(), s === 12, resting ? 0.7 : 1)
  if (strumKind === 'busy' && [0, 4, 6, 10, 12].includes(s)) strum(ch.tones, tr, when(), s === 6 || s === 10, s === 0 ? 0.8 : 1)
  if (P.strum === 'pad' && s === 0)
    ch.tones.forEach((n) => V.tone({ f: hz(n + tr), dur: beat * 4.1, g: 0.011 * VOL, a: beat * 0.8, delay: when() }))

  // ── hype layers: they pile on as the game speeds up, in the full sections only ──
  const hype = P.drums === 'full' && !resting && !stripped
  const big = P.strum === 'busy'
  const e = energy()
  if (hype) {
    // every busy section opens with the whole band hitting the chord (a drop brings its own hit)
    if (big && step === 0 && !dropNext) brass([...ch.tones, ch.tones[0] + 12], tr, beat * 1.2, when(), 1.1)
    // tambourine on the off-beats only
    if (colour === 'tamb' && s % 4 === 2) tamb(when(), 0.9)
    // one brass push a bar, once the pace has picked up
    if (colour === 'brass' && big && (s === 10 || (e > 0.6 && s === 6)) && !lastBar) brass(ch.tones, tr, sx * 1.3, when(), 0.65)
  }

  // bass, in the style's pattern
  const root = ch.root + tr
  if ((P.drums !== 'shaker' || bar >= 2) && !stripped) {
    const bass = (m: number, len: number, v = 1) => {
      V.tone({ f: hz(m), dur: len, g: 0.09 * v * VOL * human(0.1), a: 0.01, delay: when() })
      V.tone({ f: hz(m) * 2, dur: len * 0.5, g: 0.022 * v * VOL, a: 0.008, type: 'triangle', delay: when() })
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
      bass(root + (s % 4 === 0 ? 0 : 12), sx * (s % 4 === 0 ? 1.4 : 1), s % 4 === 0 ? 0.7 : 0.35)
    }
  }

  // drums
  const drumsOn = P.drums !== 'shaker' && !resting
  const inFill = lastBar && drumsOn && s >= (fill === 'roll' ? 8 : 12)
  // a cymbal on every new section (but not on the very first downbeat of the intro); a big one into the busy parts
  if (step === 0 && (slot > 0 || order[0] !== 0 || loop > 0)) {
    splash(when(), P.drums === 'full' ? 1.25 : 1)
    if (P.drums === 'full') kick(when(), 1)
    // after a build-up, the chorus lands with a sub boom and the whole band
    if (dropNext) {
      boom(ch.root + tr, when())
      brass([...ch.tones, ch.tones[0] + 12], tr, beat * 1.5, when(), 1.3)
      dropNext = false
    }
  }

  // build-up: the two bars before a chorus wind up, then everything drops
  if (building) {
    dropNext = true
    if (first && s === 0) lastBuild = build
    // the chorus's first chord, in the key it will land in
    const next = CHORD[SONG[nextPart].chords[0]]
    const lift2 = keyNext()
    const land = next.root + lift2 + 24
    /** how far through the build we are, 0..1 */
    const rise = (first ? s : 16 + s) / 32
    /** which beat of the build this is, 0..7, and the climb line's note for it */
    const k = (first ? 0 : 4) + Math.floor(s / 4)
    const climbNote = land + CLIMBS[climbLine][k]
    // the very last sixteenth is silence: a breath before the drop
    if (!first && s === 15) return
    // every build has a rising sweep somewhere, aimed at the note the drop lands on
    const sweep = (len: number) => {
      riser(when(), len)
      V.tone({ f: hz(land - 12), f2: hz(land + 12), dur: len, type: 'triangle', g: 0.01 * VOL, a: len * 0.94, delay: when() })
    }

    if (build === 'roll') {
      // the brass walks up a scale, one note a beat, onto the new root; the snare rolls faster and faster
      if (s % 4 === 0) brass([climbNote], 0, beat * 0.85, when(), 0.55 + k * 0.07)
      if (first && s === 0) sweep(beat * 8)
      if (first ? s % 4 === 0 : s % 2 === 0) kick(when(), 0.75 + (first ? 0 : s / 60))
      // eighths, then sixteenths only for the last beat
      if (first || s < 12 ? s % 2 === 0 : true) snare(when(), 0.3 + rise * 0.6)
      if (s % 2 === 0) V.tone({ f: hz(ch.root + tr + (first ? 0 : 12)), dur: sx * 1.5, g: 0.06 * VOL, a: 0.006, delay: when() })
    } else if (build === 'stomp') {
      // stadium stomps: STOMP, STOMP, CLAP... then stomping eighths and the toms running up the kit
      if (first) {
        if (s === 0 || s === 4) {
          kick(when(), 1)
          taiko(when(), 0.8)
        }
        if (s === 8 || s === 12) {
          clap(when(), 1.1)
          snare(when(), 0.45)
        }
      } else {
        if (s < 8 && s % 2 === 0) {
          kick(when(), 0.9)
          taiko(when(), 0.6)
        }
        if (s >= 8) clap(when(), 0.6 + rise * 0.5)
        if (s % 2 === 0) {
          const f = 110 + s * 22
          V.tone({ f, f2: f * 0.62, dur: 0.17, g: 0.065 * VOL, a: 0.004, delay: when() })
        }
        if (s === 0) sweep(beat * 4)
      }
      // short brass hits on the climb line, one a beat
      if (s % 4 === 0) brass([climbNote], 0, beat * 0.6, when(), 0.6 + k * 0.06)
    } else if (build === 'breakdown') {
      // the band drops away: a held chord and claps, then the kick comes back and it all rebuilds
      if (first && s === 0) {
        ch.tones.forEach((n) => V.tone({ f: hz(n + tr), dur: beat * 8, type: 'triangle', g: 0.016 * VOL, a: beat * 1.5, delay: when() }))
        sweep(beat * 8)
      }
      if (first ? s % 4 === 0 : s < 8 ? s % 2 === 0 : true) clap(when(), 0.5 + rise * 0.6)
      if (!first && s >= 8 && s % 2 === 0) kick(when(), 0.6 + (s - 8) * 0.06)
      if (!first && s >= 12) snare(when(), 0.5 + (s - 12) * 0.15)
      // a lone whistle sings the climb over the bare band
      if (s % 4 === 0) lead('whistle', climbNote, beat * 0.9, when(), 0.8)
    } else if (build === 'stutter') {
      // stutter: chord stabs repeat in eighths, then sixteenths, over four on the floor and a reverse cymbal
      if (s % 4 === 0) kick(when(), 0.95)
      // stabs in eighths, sixteenths only for the last beat
      if (first || s < 12 ? s % 2 === 0 : true) brass(ch.tones, tr, sx * 0.75, when(), 0.35 + rise * 0.5)
      if (s % 4 === 2) hat(when(), 0.6 + rise)
      if (!first && s === 0) {
        // a cymbal played backwards: swelling up into the drop
        V.noise({ dur: beat * 4, f: 3000, f2: 9000, q: 0.6, g: 0.03 * VOL, a: beat * 3.9, delay: when(), type: 'highpass' })
        sweep(beat * 4)
      }
    } else if (build === 'lift') {
      // no snare at all: kicks on the beat, the bass climbing the line, toms filling in faster
      if (s % 4 === 0) {
        kick(when(), 0.8 + rise * 0.3)
        V.tone({ f: hz(climbNote - 24), dur: beat * 0.9, g: 0.085 * VOL, a: 0.008, delay: when() })
        V.tone({ f: hz(climbNote - 12), dur: beat * 0.5, type: 'triangle', g: 0.02 * VOL, a: 0.008, delay: when() })
      }
      if (first ? s % 4 === 2 : s % 2 === 0 || s >= 12) {
        const f = 100 + (first ? s : 16 + s) * 9
        V.tone({ f, f2: f * 0.62, dur: 0.16, g: 0.06 * VOL, a: 0.004, delay: when() })
      }
      if (first && s === 0) sweep(beat * 8)
    } else {
      // call and response: the brass calls on beats one and three, the kalimba answers an octave up
      if (s === 0 || s === 8) brass([climbNote], 0, beat * 0.9, when(), 0.65 + rise * 0.5)
      if (s === 4 || s === 12) lead('kalimba', climbNote + 12, beat * 0.9, when(), 0.9)
      if (s === 4 || s === 12) clap(when(), 0.7 + rise * 0.4)
      if (s % 4 === 0) kick(when(), 0.85)
      if (s % 4 === 2) hat(when(), 0.5 + rise * 0.5)
      if (!first && s === 0) sweep(beat * 4)
      if (!first && s >= 12 && s % 2 === 0) snare(when(), 0.5 + rise * 0.5)
    }
    return
  }
  if (inFill) {
    if (fill === 'toms') {
      tom(when(), s - 12)
      if (s === 15) snare(when(), 0.9)
    } else if (fill === 'roll') {
      // a snare roll that swells into the next section, with a whoosh underneath
      if (s === 8) riser(when(), beat * 2)
      snare(when(), 0.3 + (s - 8) * 0.09)
    } else if (s === 12) {
      // stop-time: one big hit, then silence until the downbeat
      kick(when(), 1)
      snare(when(), 1)
      splash(when(), 0.8)
    }
    return
  }
  if (P.drums === 'shaker') {
    if (s % 2 === 0) shaker(when(), s % 4 === 2 ? 1 : 0.6)
  } else if (P.drums === 'light' && !resting) {
    if (s === 0 || s === 8) kick(when(), 0.8)
    if (s === 4 || s === 12) (style === 'bossa' ? rim : brush)(when(), 0.6)
    if (s % 2 === 0) shaker(when(), s % 4 === 2 ? 1 : 0.55)
  } else if (P.drums === 'full' && !resting) {
    groove(style, s, bar, when, P.strum === 'busy')
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
    fill = pickFill()
    if (dropNext) climb = Math.max(climb, keyNext() - lift)
    build = pickBuild()
    climbLine = pick(CLIMB_NAMES, climbLine)
    treatment = pick(TREATMENTS, treatment)
    swapLead = Math.random() < 0.4 ? pick<Lead>(['kalimba', 'whistle', 'glock']) : null
    // keep pushing: every section a touch faster (but a break lets the band breathe)
    if (!resting) drive = Math.min(40, drive + 2.5)
    if (pending) {
      // the remix lands here, on the downbeat of a new section
      style = pending.style
      order = pending.order
      lift = pending.lift
      pending = null
      slot = 0
    } else if (slot >= order.length) {
      slot = order[0] === 0 ? 1 : 0 // the intro only plays once
      // keep whatever height the key reached, so going round again never steps it back down
      climb = Math.max(climb, LIFT[loop % LIFT.length])
      loop++
      // every time round the band changes style, so a long run never settles into one groove
      const others = STYLE_NAMES.filter((n) => n !== style)
      style = others[Math.floor(Math.random() * others.length)]
    }
  }
}

function tick() {
  // ease toward the game's pace so speed-ups feel like a band pushing, not a jump
  bpm += (Math.min(MAX_BPM, targetBpm + drive) - bpm) * 0.08
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
    fill = 'toms'
    drive = 0
    dropNext = false
    climb = 0
    build = 'roll'
    lastBuild = null
    climbLine = 'scale'
    treatment = 'plain'
    swapLead = null
    colour = 'none'
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
    const names = STYLE_NAMES.filter((n) => n !== (pending?.style ?? style))
    remixes++
    // the pool grows: new themes join once they're unlocked, and a fresh one leads off
    const fresh = UNLOCKS.filter(([at]) => at === remixes).flatMap(([, ids]) => ids)
    const pool = [...AUTHORED, ...UNLOCKS.filter(([at]) => at < remixes).flatMap(([, ids]) => ids)]
    // keep the order a sensible length: a handful of the usual sections around the themes
    const mixed = shuffled(pool).slice(0, 8)
    pending = {
      style: names[Math.floor(Math.random() * names.length)],
      order: [...fresh, ...mixed],
      lift: Math.max(lift, [0, 0, 2, 3][Math.floor(Math.random() * 4)]),
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
      const tr = keyNow()
      ;[79, 76, 74, 67].forEach((m, i) => V.whistle({ f: hz(m + tr), dur: i === 3 ? 0.9 : 0.26, g: 0.03, delay: 0.12 + i * 0.24 }))
      V.tone({ f: hz(43 + tr), dur: 1.2, g: 0.06, a: 0.02, delay: 0.84 })
    }
  },
  /** Beats per minute to drift toward. */
  setPace(target: number) {
    targetBpm = Math.max(90, Math.min(MAX_BPM, target))
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
  /** for tests: switch the band to a style straight away */
  testStyle(name: StyleName) {
    style = name
  },
  /** for tests: what the band is playing right now */
  get state() {
    return { style, order: [...order], slot, part: partNow(), pending: pending?.style ?? null, remixes, key: keyNow(), bpm: Math.round(bpm), build, climbLine, treatment, swapLead, colour }
  },
}
