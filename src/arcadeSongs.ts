/**
 * Songs for the three newer hidden games, played by src/arcadeMusic.ts. Each has its own key,
 * groove and instruments so the games don't sound alike:
 */
export type Lead = 'kalimba' | 'whistle' | 'glock' | 'chip'
export type Groove = 'bounce' | 'tick' | 'shuffle'
type Ev = [number, number]

export interface Section {
  mel: Ev[]
  chords: string[]
  /** how busy the band is: 'light' in verses, 'full' in choruses, 'half' in the bridge */
  drums: 'intro' | 'light' | 'full' | 'half'
}

export interface ArcadeSong {
  /** chord name → bass root and the three chord tones (midi) */
  chords: Record<string, { root: number; tones: number[] }>
  /** tempo at level 0 and at level 1 */
  bpm: [number, number]
  swing: number
  groove: Groove
  /** the lead takes turns through these, a new one each section */
  leads: Lead[]
  /** the instrument for the arpeggio that joins as the game heats up */
  counter: Lead
  intro: Section
  /** verse, verse, chorus, bridge, chorus: played round and round after the intro */
  parts: Section[]
  /** sad little phrase for game over */
  sad: number[]
  /** a short rising flourish for big moments (played on top of the current chord) */
  fanfare: number[]
}

// ── toy shop (gacha) ─────────────────────────────────────────────────────

const TOY_A: Ev[] = [
  [72, 1], [76, 1], [79, 1], [76, 1], [84, 2], [79, 2],
  [81, 1], [79, 1], [76, 1], [72, 1], [76, 4],
  [77, 1], [81, 1], [84, 1], [81, 1], [77, 2], [76, 1], [74, 1],
  [74, 1], [79, 1], [83, 1], [86, 1], [83, 4],
  [72, 1], [76, 1], [79, 1], [76, 1], [84, 2], [86, 2],
  [88, 2], [84, 1], [81, 1], [84, 4],
  [81, 1], [79, 1], [77, 1], [76, 1], [74, 2], [77, 2],
  [79, 6], [0, 2],
]
const TOY_B: Ev[] = [
  [84, 2], [81, 1], [84, 1], [86, 2], [84, 2],
  [83, 2], [79, 1], [83, 1], [86, 4],
  [88, 2], [86, 1], [84, 1], [83, 2], [79, 2],
  [81, 6], [0, 2],
  [84, 2], [81, 1], [84, 1], [89, 2], [88, 2],
  [86, 2], [83, 1], [86, 1], [91, 4],
  [88, 1], [86, 1], [84, 1], [79, 1], [84, 2], [88, 2],
  [84, 6], [0, 2],
]
const TOY_BRIDGE: Ev[] = [
  [86, 4], [84, 4],
  [83, 6], [79, 2],
  [83, 4], [84, 4],
  [81, 8],
  [86, 4], [89, 4],
  [88, 4], [86, 4],
  [83, 8],
  [86, 4], [0, 4],
]
const TOY_A_CH = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G']

const TOY: ArcadeSong = {
  chords: {
    C: { root: 48, tones: [60, 64, 67] },
    Am: { root: 45, tones: [57, 60, 64] },
    F: { root: 41, tones: [57, 60, 65] },
    G: { root: 43, tones: [55, 59, 62] },
    Em: { root: 40, tones: [55, 59, 64] },
    Dm: { root: 50, tones: [57, 62, 65] },
  },
  bpm: [116, 162],
  swing: 0.1,
  groove: 'bounce',
  leads: ['glock', 'chip', 'kalimba', 'glock'],
  counter: 'chip',
  intro: {
    mel: [[72, 1], [79, 1], [84, 1], [79, 1], [76, 4], [77, 1], [81, 1], [84, 1], [81, 1], [77, 4], [79, 1], [83, 1], [86, 1], [83, 1], [79, 4], [84, 4], [0, 4]],
    chords: ['C', 'F', 'G', 'C'],
    drums: 'intro',
  },
  parts: [
    { mel: TOY_A, chords: TOY_A_CH, drums: 'light' },
    { mel: TOY_A, chords: TOY_A_CH, drums: 'full' },
    { mel: TOY_B, chords: ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'], drums: 'full' },
    { mel: TOY_BRIDGE, chords: ['Dm', 'G', 'Em', 'Am', 'Dm', 'Em', 'G', 'G'], drums: 'half' },
    { mel: TOY_B, chords: ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'], drums: 'full' },
  ],
  sad: [79, 76, 72, 67],
  fanfare: [72, 76, 79, 84],
}

// ── on the spot (quiz) ───────────────────────────────────────────────────

const SPOT_A: Ev[] = [
  [76, 1], [76, 1], [0, 1], [76, 1], [79, 1], [76, 1], [72, 2],
  [77, 1], [77, 1], [0, 1], [77, 1], [81, 1], [77, 1], [72, 2],
  [79, 1], [79, 1], [0, 1], [79, 1], [84, 1], [79, 1], [76, 2],
  [74, 2], [79, 2], [83, 2], [0, 2],
  [81, 1], [79, 1], [76, 1], [79, 1], [81, 2], [84, 2],
  [84, 1], [81, 1], [77, 1], [81, 1], [84, 2], [77, 2],
  [80, 2], [76, 2], [80, 2], [83, 2],
  [76, 4], [0, 4],
]
const SPOT_B: Ev[] = [
  [84, 3], [83, 1], [84, 2], [79, 2],
  [83, 3], [81, 1], [83, 2], [79, 2],
  [81, 2], [84, 2], [88, 2], [84, 2],
  [84, 4], [81, 2], [0, 2],
  [81, 2], [86, 2], [84, 2], [81, 2],
  [83, 2], [79, 2], [86, 4],
  [84, 2], [83, 1], [84, 1], [88, 2], [84, 2],
  [83, 2], [80, 2], [76, 2], [0, 2],
]
const SPOT_BRIDGE: Ev[] = [
  [74, 4], [77, 4],
  [76, 8],
  [77, 4], [81, 4],
  [80, 6], [0, 2],
  [81, 4], [86, 4],
  [84, 8],
  [86, 4], [84, 4],
  [83, 4], [80, 4],
]
const SPOT_A_CH = ['Am', 'F', 'C', 'G', 'Am', 'F', 'E', 'E']
const SPOT_B_CH = ['C', 'G', 'Am', 'F', 'Dm', 'G', 'C', 'E']

const SPOT: ArcadeSong = {
  chords: {
    Am: { root: 45, tones: [57, 60, 64] },
    F: { root: 41, tones: [57, 60, 65] },
    C: { root: 48, tones: [55, 60, 64] },
    G: { root: 43, tones: [55, 59, 62] },
    Dm: { root: 50, tones: [57, 62, 65] },
    E: { root: 40, tones: [56, 59, 64] },
  },
  bpm: [104, 156],
  swing: 0,
  groove: 'tick',
  leads: ['whistle', 'chip', 'whistle', 'kalimba'],
  counter: 'glock',
  intro: {
    mel: [[69, 1], [0, 1], [72, 1], [0, 1], [76, 1], [0, 1], [81, 2], [79, 1], [76, 1], [72, 1], [69, 1], [71, 4], [72, 1], [0, 1], [77, 1], [0, 1], [81, 2], [79, 2], [80, 4], [76, 2], [0, 2]],
    chords: ['Am', 'Am', 'F', 'E'],
    drums: 'intro',
  },
  parts: [
    { mel: SPOT_A, chords: SPOT_A_CH, drums: 'light' },
    { mel: SPOT_A, chords: SPOT_A_CH, drums: 'full' },
    { mel: SPOT_B, chords: SPOT_B_CH, drums: 'full' },
    { mel: SPOT_BRIDGE, chords: ['Dm', 'Am', 'Dm', 'E', 'Dm', 'Am', 'Dm', 'E'], drums: 'half' },
    { mel: SPOT_B, chords: SPOT_B_CH, drums: 'full' },
  ],
  sad: [76, 72, 71, 64],
  fanfare: [69, 72, 76, 81],
}

// ── morning crowd (find your friends) ────────────────────────────────────

const WALK_A: Ev[] = [
  [78, 1], [81, 1], [0, 1], [81, 1], [83, 1], [81, 1], [78, 2],
  [74, 1], [78, 1], [0, 1], [78, 1], [79, 1], [78, 1], [74, 2],
  [71, 1], [74, 1], [79, 1], [83, 1], [81, 2], [79, 2],
  [76, 2], [78, 1], [79, 1], [81, 4],
  [78, 1], [81, 1], [0, 1], [81, 1], [86, 2], [85, 1], [83, 1],
  [83, 1], [81, 1], [78, 1], [81, 1], [83, 4],
  [79, 1], [81, 1], [83, 1], [86, 1], [88, 2], [86, 2],
  [85, 4], [81, 2], [0, 2],
]
const WALK_B: Ev[] = [
  [86, 2], [83, 1], [86, 1], [88, 2], [86, 2],
  [85, 2], [81, 1], [85, 1], [88, 4],
  [85, 2], [81, 1], [78, 1], [81, 2], [85, 2],
  [83, 6], [0, 2],
  [86, 2], [83, 1], [86, 1], [91, 2], [90, 2],
  [88, 2], [85, 2], [81, 4],
  [90, 1], [88, 1], [86, 1], [81, 1], [86, 2], [90, 2],
  [86, 6], [0, 2],
]
const WALK_BRIDGE: Ev[] = [
  [83, 4], [79, 4],
  [81, 8],
  [83, 4], [86, 4],
  [85, 8],
  [86, 4], [83, 4],
  [85, 4], [88, 4],
  [86, 8],
  [85, 4], [81, 4],
]
const WALK_A_CH = ['D', 'Bm', 'G', 'A', 'D', 'Bm', 'G', 'A']
const WALK_B_CH = ['G', 'A', 'F#m', 'Bm', 'G', 'A', 'D', 'D']

const WALK: ArcadeSong = {
  chords: {
    D: { root: 50, tones: [62, 66, 69] },
    Bm: { root: 47, tones: [62, 66, 71] },
    G: { root: 43, tones: [62, 67, 71] },
    A: { root: 45, tones: [61, 64, 69] },
    'F#m': { root: 42, tones: [61, 66, 69] },
    Em: { root: 40, tones: [64, 67, 71] },
  },
  bpm: [108, 158],
  swing: 0.3,
  groove: 'shuffle',
  leads: ['kalimba', 'whistle', 'kalimba', 'glock'],
  counter: 'glock',
  intro: {
    mel: [[74, 2], [78, 2], [81, 4], [83, 2], [81, 1], [79, 1], [78, 4], [76, 2], [78, 1], [79, 1], [81, 4], [78, 4], [0, 4]],
    chords: ['D', 'G', 'A', 'D'],
    drums: 'intro',
  },
  parts: [
    { mel: WALK_A, chords: WALK_A_CH, drums: 'light' },
    { mel: WALK_A, chords: WALK_A_CH, drums: 'full' },
    { mel: WALK_B, chords: WALK_B_CH, drums: 'full' },
    { mel: WALK_BRIDGE, chords: ['Em', 'A', 'Em', 'A', 'G', 'A', 'Bm', 'A'], drums: 'half' },
    { mel: WALK_B, chords: WALK_B_CH, drums: 'full' },
  ],
  sad: [81, 78, 74, 69],
  fanfare: [74, 78, 81, 86],
}

export const ARCADE_SONGS = { gacha: TOY, quiz: SPOT, poll: WALK } as const
export type ArcadeSongId = keyof typeof ARCADE_SONGS
