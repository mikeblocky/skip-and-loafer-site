/**
 * The game song's notes and arrangement, played by src/music.ts. A real song form rather than a
 * loop: intro, verse, verse, chorus, verse up an octave, bridge, chorus, last verse, then a key
 * lift and round again. The verse is built on the site's leitmotif (the D–G–A–B rise of the
 * opening jingle).
 */

export const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

/** [midi note (0 = rest), length in eighth notes] */
type Ev = [number, number]

// G major, for diatonic harmony lines
const SCALE = [7, 9, 11, 0, 2, 4, 6]
const inScale = (m: number) => SCALE.includes(((m % 12) + 12) % 12)
export function diatonic(m: number, steps: number) {
  let n = m
  let k = 0
  const dir = Math.sign(steps)
  while (k < Math.abs(steps)) {
    n += dir
    if (inScale(n)) k++
  }
  return n
}

export const CHORD: Record<string, { root: number; tones: number[] }> = {
  G: { root: 43, tones: [67, 71, 74] },
  Em: { root: 40, tones: [64, 67, 71] },
  C: { root: 48, tones: [64, 67, 72] },
  D: { root: 50, tones: [66, 69, 74] },
  Bm: { root: 47, tones: [66, 71, 74] },
  Am: { root: 45, tones: [64, 69, 72] },
}

/** A hint of the motif on glockenspiel over the strum. */
const INTRO: Ev[] = [
  [0, 4], [74, 1], [79, 1], [81, 1], [83, 1],
  [0, 8],
  [0, 4], [76, 1], [79, 1], [81, 1], [84, 1],
  [81, 4], [0, 4],
]

/** Verse: the leitmotif, its answer, the motif again, reaching higher, and a half cadence. */
const VERSE: Ev[] = [
  [74, 1], [79, 1], [81, 1], [83, 2], [81, 1], [79, 1], [76, 1],
  [79, 1], [81, 1], [76, 2], [0, 1], [74, 1], [76, 1], [79, 1],
  [76, 1], [79, 1], [81, 1], [84, 2], [83, 1], [81, 1], [79, 1],
  [81, 3], [78, 1], [74, 2], [0, 2],
  [74, 1], [79, 1], [81, 1], [83, 2], [81, 1], [79, 1], [76, 1],
  [79, 1], [81, 1], [83, 2], [0, 1], [83, 1], [86, 1], [83, 1],
  [84, 2], [83, 1], [81, 1], [79, 2], [76, 1], [79, 1],
  [81, 4], [78, 2], [74, 2],
]

/** Chorus: the motif's first four notes, climbed up the chords. */
const CHORUS: Ev[] = [
  [72, 1], [76, 1], [79, 2], [81, 1], [79, 1], [76, 2],
  [74, 1], [78, 1], [81, 2], [83, 1], [81, 1], [78, 2],
  [71, 1], [74, 1], [78, 2], [79, 1], [78, 1], [74, 2],
  [76, 3], [74, 1], [71, 2], [0, 2],
  [72, 1], [76, 1], [79, 2], [84, 2], [83, 1], [81, 1],
  [81, 2], [78, 1], [81, 1], [86, 4],
  [83, 2], [81, 1], [79, 1], [81, 2], [83, 2],
  [81, 4], [0, 2], [74, 1], [78, 1],
]

/** Bridge: long notes, a breath before the last climb. */
const BRIDGE: Ev[] = [
  [81, 4], [79, 2], [76, 2],
  [78, 6], [74, 2],
  [79, 3], [81, 1], [83, 4],
  [84, 6], [0, 2],
  [84, 2], [83, 2], [81, 4],
  [78, 4], [81, 4],
  [83, 4], [86, 4],
  [86, 2], [84, 2], [83, 2], [81, 2],
]

export type Lead = 'kalimba' | 'whistle' | 'glock' | 'chip'
type Drums = 'shaker' | 'light' | 'full' | 'half'
interface Part {
  mel: Ev[]
  chords: string[]
  lead: Lead
  drums: Drums
  strum: 'stab' | 'busy' | 'pad'
  counter?: boolean
  ornament?: boolean
  harmony?: boolean
  octave?: number
}

/**
 * New theme 1, "friends": a bouncy rising tune over the I–V–vi–IV progression. It answers the
 * main motif (which climbs D–G–A–B) by leaping up from B to G and skipping back down.
 */
const FRIENDS: Ev[] = [
  [71, 1], [74, 1], [79, 2], [78, 1], [79, 1], [81, 2],
  [78, 2], [74, 1], [76, 1], [78, 2], [0, 2],
  [76, 1], [79, 1], [83, 2], [81, 1], [79, 1], [76, 2],
  [72, 3], [74, 1], [76, 2], [79, 2],
  [71, 1], [74, 1], [79, 2], [78, 1], [79, 1], [83, 2],
  [81, 2], [78, 1], [81, 1], [86, 2], [0, 2],
  [84, 1], [83, 1], [81, 1], [79, 1], [76, 2], [79, 2],
  [78, 4], [74, 2], [0, 2],
]

/**
 * New theme 2, "school bell": a playful take on the old Westminster chime (public domain,
 * 1790s) that school bells ring, then it breaks into a run of its own.
 */
const BELL: Ev[] = [
  [83, 2], [79, 2], [81, 2], [74, 2],
  [74, 2], [81, 2], [83, 2], [79, 2],
  [83, 2], [81, 2], [79, 2], [74, 2],
  [74, 2], [81, 2], [83, 2], [79, 2],
  [76, 1], [79, 1], [84, 2], [83, 2], [81, 2],
  [78, 2], [81, 2], [86, 4],
  [84, 2], [83, 2], [81, 2], [79, 2],
  [81, 4], [0, 4],
]

/**
 * New theme 3, "loafer": laid-back and syncopated, in the lower register, taking its time
 * over Em–C–G–D. The cool, easygoing side of the walk to school.
 */
const LOAFER: Ev[] = [
  [71, 3], [74, 1], [76, 2], [74, 2],
  [72, 2], [71, 1], [69, 1], [67, 4],
  [0, 1], [71, 1], [74, 1], [79, 3], [78, 2],
  [76, 2], [74, 2], [69, 4],
  [71, 3], [74, 1], [76, 2], [79, 2],
  [81, 3], [79, 1], [76, 2], [72, 2],
  [74, 2], [79, 2], [78, 2], [76, 2],
  [74, 6], [0, 2],
]

/**
 * New theme 4, "summer festival": a bright five-note (pentatonic) dance that climbs to the
 * top of the range, like a festival night in the countryside.
 */
const FESTIVAL: Ev[] = [
  [76, 1], [79, 1], [81, 1], [79, 1], [76, 2], [74, 2],
  [74, 1], [76, 1], [79, 1], [76, 1], [74, 2], [71, 2],
  [71, 1], [74, 1], [76, 2], [79, 1], [81, 1], [83, 2],
  [86, 2], [83, 2], [81, 2], [0, 2],
  [88, 1], [86, 1], [83, 2], [81, 1], [83, 1], [86, 2],
  [83, 1], [81, 1], [79, 2], [81, 4],
  [79, 1], [81, 1], [83, 1], [86, 1], [83, 2], [81, 2],
  [79, 6], [0, 2],
]

const V_CH = ['G', 'Em', 'C', 'D', 'G', 'Em', 'C', 'D']
const L_CH = ['Em', 'C', 'G', 'D', 'Em', 'C', 'G', 'D']
const FEST_CH = ['C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G']
const F_CH = ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D']
const BELL_CH = ['G', 'D', 'Em', 'D', 'C', 'D', 'C', 'D']
const C_CH = ['C', 'D', 'Bm', 'Em', 'C', 'D', 'G', 'D']
const B_CH = ['Am', 'D', 'G', 'C', 'Am', 'D', 'G', 'D']

export const SONG: Part[] = [
  { mel: INTRO, chords: ['G', 'Em', 'C', 'D'], lead: 'glock', drums: 'shaker', strum: 'stab' },
  { mel: VERSE, chords: V_CH, lead: 'kalimba', drums: 'light', strum: 'stab' },
  { mel: VERSE, chords: V_CH, lead: 'kalimba', drums: 'full', strum: 'stab', ornament: true, counter: true },
  { mel: CHORUS, chords: C_CH, lead: 'whistle', drums: 'full', strum: 'busy' },
  { mel: VERSE, chords: V_CH, lead: 'glock', drums: 'full', strum: 'busy', octave: 12, harmony: true },
  { mel: BRIDGE, chords: B_CH, lead: 'whistle', drums: 'half', strum: 'pad' },
  { mel: CHORUS, chords: C_CH, lead: 'kalimba', drums: 'full', strum: 'busy', counter: true, harmony: true },
  { mel: VERSE, chords: V_CH, lead: 'whistle', drums: 'full', strum: 'stab', ornament: true, harmony: true },
  // ── unlocked by remixes as the game climbs ──
  { mel: FRIENDS, chords: F_CH, lead: 'kalimba', drums: 'full', strum: 'busy', counter: true },
  { mel: FRIENDS, chords: F_CH, lead: 'whistle', drums: 'full', strum: 'busy', harmony: true, ornament: true },
  { mel: BELL, chords: BELL_CH, lead: 'glock', drums: 'light', strum: 'stab', harmony: true },
  { mel: LOAFER, chords: L_CH, lead: 'whistle', drums: 'light', strum: 'stab' },
  { mel: LOAFER, chords: L_CH, lead: 'kalimba', drums: 'full', strum: 'busy', harmony: true, counter: true },
  { mel: FESTIVAL, chords: FEST_CH, lead: 'glock', drums: 'full', strum: 'busy', counter: true, ornament: true },
]
/** sections that only join the song through remixes: [first remix that can use it, indexes] */
export const UNLOCKS: [number, number[]][] = [
  [1, [8, 9]], // "friends" theme, from the first remix
  [2, [10]], // "school bell" theme, from the second
  [3, [11, 12]], // "loafer" theme, from the third
  [4, [13]], // "summer festival" theme, from the fourth
]
/** Each time round, the song lifts key a little before settling back. */
export const LIFT = [0, 2, 3, 5]

/** melody events by sixteenth-note step, per part */
export const EVENTS = SONG.map((p) => {
  const map = new Map<number, Ev>()
  let at = 0
  p.mel.forEach(([m, len]) => {
    if (m) map.set(at, [m, len * 2])
    at += len * 2
  })
  return map
})
