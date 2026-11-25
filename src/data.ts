export const C = {
  pink: '#F53D84',
  blue: '#246BE8',
  sky: '#1FADEE',
  yellow: '#FBBA14',
  green: '#12B266',
  orange: '#F86E1A',
  violet: '#7A45E0',
  red: '#F0344F',
  mint: '#1AC8AC',
  // deep vivid tones that always carry white text
  amber: '#F5900F',
  magenta: '#CC3DC0',
  indigo: '#3F44D6',
  teal: '#0EA09E',
  ink: '#1D1B2C',
} as const

export const RAINBOW = [C.pink, C.blue, C.yellow, C.green, C.orange, C.violet, C.red, C.mint, C.sky]

export type Side = 'left' | 'right'
export interface Character {
  id: string
  name: string
  src: string
  side: Side
  color: string
}

// Order inside a side = front (closest to the middle) to back.
export const CHARACTERS: Character[] = [
  { id: 'mitsumi', name: 'Mitsumi', src: '/characters/mitsumi.webp', side: 'left', color: C.pink },
  { id: 'makoto', name: 'Makoto', src: '/characters/makoto.webp', side: 'left', color: C.violet },
  { id: 'mika', name: 'Mika', src: '/characters/mika.webp', side: 'left', color: C.yellow },
  { id: 'ujie', name: 'Ujie', src: '/characters/ujie.webp', side: 'left', color: C.green },
  { id: 'fumi', name: 'Fumi', src: '/characters/fumi.webp', side: 'left', color: C.mint },
  { id: 'nao', name: 'Nao', src: '/characters/nao.webp', side: 'left', color: C.amber },
  { id: 'takamine', name: 'Takamine', src: '/characters/takamine.webp', side: 'left', color: C.magenta },
  { id: 'shima', name: 'Shima', src: '/characters/shima.webp', side: 'right', color: C.sky },
  { id: 'yuzuki', name: 'Yuzuki', src: '/characters/yuzuki.webp', side: 'right', color: C.orange },
  { id: 'yasaka', name: 'Yasaka', src: '/characters/yasaka.webp', side: 'right', color: C.red },
  { id: 'yamada', name: 'Yamada', src: '/characters/yamada.webp', side: 'right', color: C.teal },
  { id: 'mukai', name: 'Mukai', src: '/characters/mukai.webp', side: 'right', color: C.indigo },
  { id: 'kanechika', name: 'Kanechika', src: '/characters/kanechika.webp', side: 'right', color: C.blue },
]

// Left-to-right order of the group shot during the intro.
export const CLUSTER_ORDER = ['takamine', 'nao', 'fumi', 'ujie', 'mika', 'makoto', 'mitsumi', 'shima', 'yuzuki', 'yasaka', 'yamada', 'mukai', 'kanechika']

export { VOLUMES } from './volumes'

/**
 * New chapters run in Monthly Afternoon, on sale the 25th of each month (JST).
 * Set NEXT_CHAPTER_NUMBER to show the chapter number on the countdown.
 */
export const RELEASE_DAY = 25
export const RELEASE_UTC_OFFSET_HOURS = 9
export const NEXT_CHAPTER_NUMBER: number | null = 86

export function releaseWindow(now = Date.now()) {
  const d = new Date(now)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const at = (mo: number) => Date.UTC(y, mo, RELEASE_DAY, -RELEASE_UTC_OFFSET_HOURS)
  for (let i = -1; i < 3; i++) {
    if (at(m + i) > now) return { prev: at(m + i - 1), next: at(m + i) }
  }
  return { prev: at(m), next: at(m + 1) }
}

export interface Birthday {
  name: string
  m: number
  d: number
  color: string
  /** id of a character image in /characters (a .webp), when there is one */
  img?: string
}

export const BIRTHDAYS: Birthday[] = [
  { name: 'Kanechika', m: 2, d: 1, color: C.violet, img: 'kanechika' },
  { name: 'Mitsumi', m: 3, d: 3, color: C.orange, img: 'mitsumi' },
  { name: 'Makoto', m: 4, d: 17, color: C.green, img: 'makoto' },
  { name: 'Kazakami', m: 4, d: 24, color: C.amber },
  { name: 'Mukai', m: 5, d: 19, color: '#3560DC', img: 'mukai' },
  { name: 'Takamine', m: 6, d: 30, color: C.red, img: 'takamine' },
  { name: 'Mika', m: 7, d: 29, color: C.pink, img: 'mika' },
  { name: 'Yamada', m: 8, d: 6, color: C.orange, img: 'yamada' },
  { name: 'Chris', m: 8, d: 24, color: C.indigo },
  { name: 'Shima', m: 10, d: 9, color: C.amber, img: 'shima' },
  { name: 'Ririka', m: 10, d: 30, color: '#CC3DC0' },
  { name: 'Yuzuki', m: 12, d: 11, color: C.teal, img: 'yuzuki' },
]
