/**
 * Every sound on the site is synthesized here with the Web Audio API: no audio files.
 * Browsers only let audio start after a user gesture, so `unlock()` must run inside one.
 * Soft plucks, pink noise, a gentle low-pass and a small room reverb, with slight random
 * variation on every hit so repeats never sound machine-identical.
 */

const KEY = 'sl-sound'
let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
let on = (() => {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
})()
const listeners = new Set<(v: boolean) => void>()
const last = new Map<string, number>()

/** Pink noise (Paul Kellet's filter): warmer and less hissy than white noise. */
function pinkNoise(c: AudioContext, seconds: number) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate)
  const d = buf.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + w * 0.0555179
    b1 = 0.99332 * b1 + w * 0.0750759
    b2 = 0.969 * b2 + w * 0.153852
    b3 = 0.8665 * b3 + w * 0.3104856
    b4 = 0.55 * b4 + w * 0.5329522
    b5 = -0.7616 * b5 - w * 0.016898
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
    b6 = w * 0.115926
  }
  return buf
}

/** A short, dark, decaying impulse: a small soft room. */
function roomImpulse(c: AudioContext, seconds = 1.6) {
  const len = Math.floor(c.sampleRate * seconds)
  const buf = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      const t = i / len
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2)
    }
  }
  return buf
}

function ensure() {
  if (ctx) return ctx
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  ctx = new AC()

  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -20
  comp.knee.value = 18
  comp.ratio.value = 2.5
  comp.attack.value = 0.01
  comp.release.value = 0.25
  comp.connect(ctx.destination)

  master = ctx.createGain()
  master.gain.value = 0.5

  // Dry path: roll off the harsh top end.
  const warm = ctx.createBiquadFilter()
  warm.type = 'lowpass'
  warm.frequency.value = 4800
  warm.Q.value = 0.5
  master.connect(warm).connect(comp)

  // Wet path: a little room so sounds sit in a space instead of in your ear.
  const send = ctx.createGain()
  send.gain.value = 0.22
  const verb = ctx.createConvolver()
  verb.buffer = roomImpulse(ctx)
  const verbTone = ctx.createBiquadFilter()
  verbTone.type = 'lowpass'
  verbTone.frequency.value = 2600
  master.connect(send).connect(verb).connect(verbTone).connect(comp)

  noiseBuf = pinkNoise(ctx, 2)
  return ctx
}

const live = () => on && ctx !== null && ctx.state === 'running' && !document.hidden

/** Drop repeats of the same sound that arrive closer together than `ms`. */
function gate(key: string, ms: number) {
  const now = performance.now()
  if (now - (last.get(key) ?? 0) < ms) return false
  last.set(key, now)
  return true
}

/** Random multiplier around 1, e.g. vary(0.03) is 0.97..1.03. */
const vary = (amt: number) => 1 + (Math.random() * 2 - 1) * amt

function out(pan = 0) {
  if (!ctx || !master) return null
  if (!pan || !ctx.createStereoPanner) return master
  const p = ctx.createStereoPanner()
  // Keep panning subtle; hard-panned clicks feel artificial.
  p.pan.value = Math.max(-1, Math.min(1, pan)) * 0.5
  p.connect(master)
  return p
}

interface Tone {
  f: number
  f2?: number
  dur: number
  type?: OscillatorType
  g?: number
  a?: number
  delay?: number
  pan?: number
}
/** Global pitch lift for every sound: two semitones up. */
const TUNE = Math.pow(2, 2 / 12)

function tone({ f, f2, dur, type = 'sine', g = 0.2, a = 0.006, delay = 0, pan = 0 }: Tone) {
  const dest = out(pan)
  if (!ctx || !dest) return
  f *= TUNE
  if (f2) f2 *= TUNE
  const t = ctx.currentTime + delay
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(f, t)
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur)
  const v = ctx.createGain()
  v.gain.setValueAtTime(0.0001, t)
  v.gain.exponentialRampToValueAtTime(g, t + a)
  v.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(v).connect(dest)
  o.start(t)
  o.stop(t + dur + 0.03)
}

/**
 * A soft struck-wood / kalimba note: a sine body plus a quickly fading
 * inharmonic overtone, which is what makes it read as a real object.
 */
function pluck({ f, dur, g = 0.1, delay = 0, pan = 0, wood = 0.35 }: { f: number; dur: number; g?: number; delay?: number; pan?: number; wood?: number }) {
  tone({ f, dur, g, a: 0.004, delay, pan })
  tone({ f: f * 2.76, dur: dur * 0.35, g: g * wood * 0.5, a: 0.002, delay, pan })
  tone({ f: f * 5.4, dur: dur * 0.12, g: g * wood * 0.2, a: 0.001, delay, pan })
}

interface Noise {
  dur: number
  f: number
  f2?: number
  q?: number
  g?: number
  a?: number
  type?: BiquadFilterType
  delay?: number
  pan?: number
}
function noise({ dur, f, f2, q = 1, g = 0.15, a = 0.01, type = 'bandpass', delay = 0, pan = 0 }: Noise) {
  const dest = out(pan)
  if (!ctx || !dest || !noiseBuf) return
  f *= TUNE
  if (f2) f2 *= TUNE
  const t = ctx.currentTime + delay
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  src.loop = true
  const fl = ctx.createBiquadFilter()
  fl.type = type
  fl.Q.value = q
  fl.frequency.setValueAtTime(f, t)
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur)
  const v = ctx.createGain()
  v.gain.setValueAtTime(0.0001, t)
  v.gain.exponentialRampToValueAtTime(g, t + a)
  v.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(fl).connect(v).connect(dest)
  src.start(t, Math.random() * 1.5)
  src.stop(t + dur + 0.03)
}

/**
 * A soft whistle / recorder: a sine that swells in, with a little vibrato that arrives late
 * (the way a person settles into a held note).
 */
function whistle({ f, dur, g = 0.06, delay = 0, pan = 0 }: { f: number; dur: number; g?: number; delay?: number; pan?: number }) {
  const dest = out(pan)
  if (!ctx || !dest) return
  f *= TUNE
  const t = ctx.currentTime + delay
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(f * 0.985, t)
  o.frequency.exponentialRampToValueAtTime(f, t + 0.05)
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 5 + Math.random()
  const depth = ctx.createGain()
  depth.gain.setValueAtTime(0, t)
  depth.gain.linearRampToValueAtTime(f * 0.007, t + Math.min(0.3, dur * 0.7))
  lfo.connect(depth).connect(o.frequency)
  const v = ctx.createGain()
  v.gain.setValueAtTime(0.0001, t)
  v.gain.exponentialRampToValueAtTime(g, t + 0.045)
  v.gain.setValueAtTime(g, t + Math.max(0.05, dur - 0.09))
  v.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(v).connect(dest)
  o.start(t)
  lfo.start(t)
  o.stop(t + dur + 0.05)
  lfo.stop(t + dur + 0.05)
}

/** The raw voices, for the music engine (src/music.ts) to schedule ahead on the audio clock. */
export const voices = {
  live: () => live(),
  now: () => ctx?.currentTime ?? 0,
  tone,
  noise,
  pluck,
  whistle,
}

const panOf = (x: number) => (x / window.innerWidth) * 2 - 1

/** Notes of a G major pentatonic: nothing clashes, whatever order they come in. */
const PENTA = [392, 440, 493.88, 587.33, 659.25, 783.99]

/** Snap a frequency to the nearest G-major-pentatonic note so stray sounds stay in key with the tune. */
function inKey(f: number) {
  const steps = [0, 2, 4, 7, 9, 12] // above G
  const semis = 12 * Math.log2(f / 392)
  const oct = Math.floor(semis / 12)
  const within = semis - oct * 12
  const near = steps.reduce((b, s) => (Math.abs(s - within) < Math.abs(b - within) ? s : b))
  return 392 * Math.pow(2, oct + near / 12)
}

export const sfx = {
  get on() {
    return on
  },
  /** True when the browser will let sound play right now without a click. */
  canAutoplay() {
    const c = ensure()
    return !!c && c.state === 'running'
  },
  /** Call from inside a click/keypress. */
  async unlock() {
    const c = ensure()
    if (c && c.state !== 'running') {
      try {
        await c.resume()
      } catch {
        /* ignored: stays silent */
      }
    }
  },
  setOn(v: boolean) {
    on = v
    try {
      localStorage.setItem(KEY, v ? 'on' : 'off')
    } catch {
      /* private mode */
    }
    listeners.forEach((l) => l(v))
  },
  subscribe(l: (v: boolean) => void) {
    listeners.add(l)
    return () => void listeners.delete(l)
  },
  panOf,

  /** Soft arrival: a gentle wooden note. Bigger things sound lower. */
  pop(pitch = 1, pan = 0) {
    if (!live() || !gate('pop', 30)) return
    pluck({ f: inKey(440 * pitch) * vary(0.004), dur: 0.35, g: 0.075 * vary(0.15), pan, wood: 0.25 })
  },
  /** Barely-there hover touch. */
  blip(pitch = 1) {
    if (!live() || !gate('blip', 70)) return
    pluck({ f: 660 * pitch * vary(0.02), dur: 0.16, g: 0.018 * vary(0.2), wood: 0.15 })
  },
  /** A soft wooden tap. */
  click(pitch = 1) {
    if (!live() || !gate('click', 40)) return
    pluck({ f: 523 * pitch * vary(0.02), dur: 0.18, g: 0.07 * vary(0.12), wood: 0.45 })
    noise({ dur: 0.02, f: 1800, q: 1.2, g: 0.012 })
  },
  /** Light wooden tick for dials and scrolling. */
  tick(pitch = 1, g = 1) {
    if (!live() || !gate('tick', 35)) return
    noise({ dur: 0.018, f: 2200 * pitch * vary(0.08), q: 4, g: 0.022 * g * vary(0.25), a: 0.002 })
    tone({ f: 880 * pitch * vary(0.04), dur: 0.04, g: 0.012 * g, a: 0.002 })
  },
  /** A flip block landing: a muted knock on wood. */
  clack(pitch = 1) {
    if (!live() || !gate('clack', 35)) return
    noise({ dur: 0.045, f: 1100 * pitch * vary(0.08), q: 2, g: 0.035 * vary(0.2), a: 0.002 })
    pluck({ f: 220 * pitch * vary(0.03), dur: 0.14, g: 0.06 * vary(0.15), wood: 0.5 })
  },
  /** A breath of air rather than a jet. */
  whoosh(dur = 0.5, up = true, g = 0.22, pan = 0) {
    if (!live() || !gate('whoosh', 90)) return
    const d = dur * 1.15 * vary(0.08)
    noise({
      dur: d,
      f: up ? 260 : 1500,
      f2: up ? 1500 : 240,
      q: 0.6,
      g: g * 0.45 * vary(0.12),
      a: d * 0.5,
      type: 'lowpass',
      pan,
    })
  },
  /** Something soft set down on a cushion. */
  thud(pan = 0) {
    if (!live() || !gate('thud', 60)) return
    tone({ f: 120 * vary(0.05), f2: 62, dur: 0.28, g: 0.17 * vary(0.1), a: 0.012, pan })
    noise({ dur: 0.08, f: 380, type: 'lowpass', g: 0.05, a: 0.006, pan })
  },
  grab(pan = 0) {
    if (!live() || !gate('grab', 40)) return
    pluck({ f: 392 * vary(0.03), dur: 0.14, g: 0.05 * vary(0.15), pan, wood: 0.3 })
  },
  /** Gentle release: two soft notes settling down. */
  boing(pan = 0) {
    if (!live() || !gate('boing', 90)) return
    pluck({ f: 587.33 * vary(0.01), dur: 0.22, g: 0.05, pan, wood: 0.2 })
    pluck({ f: 392 * vary(0.01), dur: 0.35, g: 0.045, delay: 0.09 * vary(0.15), pan, wood: 0.2 })
  },
  /** Kalimba-like phrase, unhurried and slightly humanized. */
  chime(base = 1, g = 1) {
    if (!live() || !gate('chime', 200)) return
    const notes = [PENTA[0], PENTA[2], PENTA[3], PENTA[5], 987.77]
    let at = 0
    notes.forEach((f, i) => {
      pluck({ f: f * base * vary(0.004), dur: 1.3, g: 0.05 * g * vary(0.15) * (i === notes.length - 1 ? 1.1 : 1), delay: at, wood: 0.18 })
      at += 0.11 * vary(0.2)
    })
  },
  /**
   * Opening theme: a short, bouncy G-major tune that runs up, dips, and climbs
   * to a bright high finish, over a soft bass line and a light shaker.
   */
  jingle(g = 1) {
    if (!live() || !gate('jingle', 1500)) return
    const e = 0.15 // one eighth note, ~200 bpm feel
    const N = { E3: 164.81, G3: 196, C3: 130.81, D3: 146.83, G4: 392, B4: 493.88, D5: 587.33, E5: 659.25, Fs5: 739.99, G5: 783.99, A5: 880, B5: 987.77, D6: 1174.66 }
    // [note, length in eighths]
    const melody: [number, number][] = [
      [N.D5, 1], [N.G5, 1], [N.A5, 1], [N.B5, 2], [N.A5, 1], [N.G5, 1], [N.E5, 1],
      [N.G5, 1], [N.A5, 1], [N.D5, 2], [N.E5, 1], [N.G5, 1], [N.Fs5, 1], [N.A5, 1],
      [N.D6, 6],
    ]
    let step = 0
    melody.forEach(([f, len], i) => {
      const last = i === melody.length - 1
      // Tiny timing looseness, like a person playing it.
      const at = step * e + (step ? (Math.random() - 0.5) * 0.012 : 0)
      pluck({ f: f * vary(0.003), dur: last ? 1.6 : 0.25 + len * 0.12, g: 0.055 * g * vary(0.1) * (last ? 1.15 : 1), delay: at, wood: 0.22 })
      step += len
    })
    // Final chord under the high note.
    const end = 16 * e
    pluck({ f: N.G4, dur: 1.5, g: 0.03 * g, delay: end, wood: 0.1 })
    pluck({ f: N.B4, dur: 1.5, g: 0.026 * g, delay: end + 0.02, wood: 0.1 })

    // Bass: G – Em – C – D – G, one note per half bar.
    ;[N.G3, N.E3, N.C3, N.D3].forEach((f, i) => {
      tone({ f, dur: 0.55, g: 0.07 * g, a: 0.01, delay: i * 4 * e })
    })
    tone({ f: N.G3, dur: 1.4, g: 0.07 * g, a: 0.01, delay: end })

    // Soft shaker on the off-beats for a little lift.
    for (let s = 1; s < 16; s += 2) {
      noise({ dur: 0.05, f: 5200, q: 1.5, g: 0.012 * g * vary(0.3), a: 0.008, delay: s * e })
    }
  },
  /** Paper turning: a few irregular soft grains. */
  rustle() {
    if (!live() || !gate('rustle', 120)) return
    const n = 3 + Math.floor(Math.random() * 3)
    let at = 0
    for (let i = 0; i < n; i++) {
      noise({
        dur: 0.05 + Math.random() * 0.08,
        f: 1800 + Math.random() * 1800,
        q: 0.7,
        g: 0.03 * vary(0.4),
        a: 0.01,
        delay: at,
      })
      at += 0.025 + Math.random() * 0.05
    }
  },
  /** A sheet being creased: a crisp crackle that ends on a soft press. */
  fold(pan = 0) {
    if (!live() || !gate('fold', 90)) return
    noise({ dur: 0.16, f: 2600 * vary(0.1), f2: 4200, q: 0.9, g: 0.035 * vary(0.2), a: 0.05, pan })
    noise({ dur: 0.035, f: 900, q: 1.4, g: 0.04, a: 0.002, delay: 0.15, pan })
    tone({ f: 180 * vary(0.05), f2: 120, dur: 0.08, g: 0.04, a: 0.004, delay: 0.15, pan })
  },
  /** Paper sliding against paper: a long, soft, slightly rising hush. */
  slide(dur = 0.5, g = 1) {
    if (!live() || !gate('slide', 120)) return
    noise({ dur, f: 1400 * vary(0.1), f2: 2400, q: 0.5, g: 0.03 * g * vary(0.15), a: dur * 0.35 })
    noise({ dur: dur * 0.8, f: 5200, q: 1, g: 0.008 * g, a: dur * 0.3 })
  },
  /** A wax seal pressed down: a soft, heavy squish. */
  stamp() {
    if (!live() || !gate('stamp', 150)) return
    tone({ f: 150 * vary(0.05), f2: 70, dur: 0.24, g: 0.16, a: 0.008 })
    noise({ dur: 0.12, f: 520, q: 0.8, g: 0.05, a: 0.004, type: 'lowpass' })
    pluck({ f: 880 * vary(0.02), dur: 0.12, g: 0.02, delay: 0.03, wood: 0.6 })
  },
  /** Wax breaking: two sharp little snaps. */
  crack() {
    if (!live() || !gate('crack', 150)) return
    noise({ dur: 0.025, f: 3400, q: 3, g: 0.07, a: 0.001 })
    noise({ dur: 0.03, f: 2400, q: 2.5, g: 0.05, a: 0.001, delay: 0.06 * vary(0.3) })
    pluck({ f: 1320 * vary(0.03), dur: 0.08, g: 0.02, wood: 0.8 })
  },
  /** A tin mailbox door: a hollow knock with a short metallic ring. */
  clank(pitch = 1) {
    if (!live() || !gate('clank', 90)) return
    noise({ dur: 0.05, f: 700 * pitch, q: 2, g: 0.06, a: 0.002 })
    tone({ f: 523 * pitch * vary(0.02), dur: 0.45, g: 0.022, a: 0.002, type: 'triangle' })
    tone({ f: 1390 * pitch * vary(0.02), dur: 0.3, g: 0.01, a: 0.002 })
  },
  /**
   * Build-up under the opening funnel that leads straight into `jingle()`.
   * `lead` is the time in seconds until the jingle starts: the pad peaks there,
   * a three-note pickup runs into the tune's first note, and the pad keeps
   * ringing underneath so there is no gap.
   */
  swell(lead = 2.75) {
    if (!live()) return
    buildUp(lead, 1, true)
  },
  /**
   * Page transition: a quick version of the opening build-up that crests as the
   * page swaps (`lead` seconds from now), then lands on a soft D–G chord.
   */
  transition(lead = 0.65) {
    if (!live() || !gate('transition', 400)) return
    buildUp(lead, 0.7, false)
    pluck({ f: 587.33, dur: 0.9, g: 0.05, delay: lead, wood: 0.2 })
    pluck({ f: 783.99, dur: 1.1, g: 0.04, delay: lead + 0.06 * vary(0.3), wood: 0.15 })
  },
}

/** Shared by `swell()` and `transition()`: pad, riser, optional hint notes, and pickup. */
function buildUp(lead: number, level: number, hint: boolean) {
  const ring = lead + 0.9
  // Warm G chord pad that grows toward the downbeat; slightly detuned pairs for width.
  ;[
    [98, 0.07],
    [196, 0.045],
    [293.66, 0.03],
    [246.94, 0.022],
  ].forEach(([f, g]) => {
    tone({ f: f * 0.998, dur: ring, g: g * level, a: lead * 0.95, pan: -0.3 })
    tone({ f: f * 1.002, dur: ring, g: g * level, a: lead * 0.95, pan: 0.3 })
  })
  // Airy riser that opens up and crests right on the downbeat.
  noise({ dur: lead + 0.25, f: 200, f2: 2600, q: 0.5, g: 0.05 * level, a: lead * 0.92, type: 'lowpass' })
  // A few soft notes drifting upward partway through, so the melody feels foreshadowed.
  if (hint) {
    ;[392, 493.88, 587.33].forEach((f, i) => {
      pluck({ f, dur: 0.9, g: 0.025 * level, delay: lead * 0.35 + i * 0.32, wood: 0.12 })
    })
  }
  // Pickup: G – A – B straight into D on the downbeat (shortened if the lead is short).
  const e = Math.min(0.15, lead / 4)
  ;[392, 440, 493.88].forEach((f, i) => {
    pluck({ f, dur: 0.3, g: (0.04 + i * 0.008) * level, delay: lead - (3 - i) * e, wood: 0.2 })
  })
}
