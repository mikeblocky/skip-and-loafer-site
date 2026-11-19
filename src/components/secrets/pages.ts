import { C, CHARACTERS, RAINBOW } from '../../data'
import type { IconName } from '../../icons'

/**
 * "Pages" for the skip-to-school road. The run starts on the familiar notebook page; at each
 * milestone (10k, 25k, 50k, 100k, 250k, 500k, 1M, …) it turns to a freshly generated one: new paper, lines, margin, road line,
 * background doodles, road clutter, flying hazard, and a different character leading the way.
 */
export interface Sticker {
  name: IconName
  color: string
}
export interface Page {
  n: number
  paper: string
  /** CSS background-image and size for the page's lines (empty string = blank paper) */
  lines: string
  lineSize: string
  margin: string
  /** CSS url() of the road line tile */
  floor: string
  ground: Sticker[]
  air: Sticker
  doodles: IconName[]
  doodleColor: string
  /** character id at the front */
  leader: string
}

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`

/** the road line, 120 units wide so it tiles; drawn in the page's ink colour */
function floorTile(style: 'wavy' | 'zigzag' | 'dashed' | 'double', ink: string) {
  const paths: Record<typeof style, string> = {
    wavy: 'M0 7c10-2.5 20-2.5 30 0s20 2.5 30 0 20-2.5 30 0 20 2.5 30 0',
    zigzag: 'M0 7l7.5-4 15 8 15-8 15 8 15-8 15 8 15-8 15 8 7.5-4',
    dashed: 'M2 7h16M26 7h16M50 7h16M74 7h16M98 7h16',
    double: 'M0 5h120M0 10h120',
  }
  const ticks = style === 'double' ? '' : `<path d="M14 13l3-3M52 13l3-3M88 13l4-3" stroke="${ink}" stroke-opacity=".25" stroke-width="2" stroke-linecap="round"/>`
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="14" viewBox="0 0 120 14"><path d="${paths[style]}" fill="none" stroke="${ink}" stroke-width="${style === 'double' ? 2 : 2.6}" stroke-linecap="round" stroke-linejoin="round"/>${ticks}</svg>`,
  )
}

/** the page every run starts on: the site's own notebook paper */
export const FIRST_PAGE: Page = {
  n: 0,
  paper: '#ffffff',
  lines: 'linear-gradient(var(--line) 1.5px, transparent 1.5px)',
  lineSize: '100% 30px',
  margin: '#ffc7e0',
  floor: floorTile('wavy', C.ink),
  ground: [
    { name: 'onigiri', color: C.ink },
    { name: 'umbrella', color: C.blue },
    { name: 'watermelon', color: C.green },
    { name: 'basket', color: C.orange },
    { name: 'suitcase', color: C.violet },
  ],
  air: { name: 'plane', color: C.sky },
  doodles: ['cloud', 'star', 'note', 'heart', 'sakura', 'moon', 'sun', 'clover'],
  doodleColor: C.ink,
  leader: 'mitsumi',
}

// stickers that can be road clutter (never the pickups: star, heart, clover, note, sun, bolt, sparkle)
const GROUND_POOL: IconName[] = [
  'onigiri', 'umbrella', 'watermelon', 'basket', 'suitcase', 'bag', 'school', 'mountain', 'wave', 'flame',
  'masks', 'torii', 'gradcap', 'book', 'film', 'heartbreak', 'clock', 'pencil', 'bunting',
]
const AIR_POOL: IconName[] = ['plane', 'envelope', 'bubble', 'bow']
const DOODLE_POOL: IconName[] = ['cloud', 'moon', 'sakura', 'squiggle', 'ring', 'smile', 'wave', 'mountain', 'bunting', 'pencil', 'envelope', 'bubble', 'torii', 'umbrella']
const INKS = [C.ink, '#2b2a6b', '#3d2b1f', '#163a35', '#4a1d3f']

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]
const pickN = <T,>(a: readonly T[], n: number) => [...a].sort(() => Math.random() - 0.5).slice(0, n)

/** A new random page; the leader is never the one who led the previous page. */
export function makePage(n: number, prevLeader: string): Page {
  const hue = Math.floor(Math.random() * 360)
  const lineHue = (hue + 150 + Math.floor(Math.random() * 60)) % 360
  const lc = `hsl(${lineHue} 55% 86%)`
  const style = pick(['ruled', 'grid', 'dots', 'blank'] as const)
  const lines =
    style === 'ruled'
      ? `linear-gradient(${lc} 1.5px, transparent 1.5px)`
      : style === 'grid'
        ? `linear-gradient(${lc} 1px, transparent 1px), linear-gradient(90deg, ${lc} 1px, transparent 1px)`
        : style === 'dots'
          ? `radial-gradient(circle, ${lc} 1.6px, transparent 2.1px)`
          : ''
  const lineSize = style === 'ruled' ? '100% 30px' : style === 'grid' ? '30px 30px' : '22px 22px'
  const ink = pick(INKS)
  return {
    n,
    paper: `hsl(${hue} 70% 97%)`,
    lines,
    lineSize,
    margin: Math.random() < 0.7 ? `hsl(${(hue + 320) % 360} 80% 82%)` : 'transparent',
    floor: floorTile(pick(['wavy', 'zigzag', 'dashed', 'double'] as const), ink),
    ground: pickN(GROUND_POOL, 5).map((name) => ({ name, color: pick([...RAINBOW, ink]) })),
    air: { name: pick(AIR_POOL), color: pick([C.sky, C.blue, C.violet, C.pink, C.teal]) },
    doodles: pickN(DOODLE_POOL, 8),
    doodleColor: ink,
    leader: pick(CHARACTERS.filter((c) => c.id !== prevLeader)).id,
  }
}
