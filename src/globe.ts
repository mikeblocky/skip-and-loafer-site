/**
 * The snow globe in Secret Santa part 2: an ice maze. Tip the globe and the snowball slides
 * until something stops it: it can't stop halfway. Slide over all four stars, then into the
 * gate (it stays shut, like a wall, until the fourth star is lit). Roll into a hole and it's
 * back to the start with no stars.
 */

export const SIZE = 9
export type Cell = 0 | 1 | 2 // ice, wall, hole
export type Dir = 'up' | 'down' | 'left' | 'right'
export const DIRS: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }

export interface Maze {
  grid: Cell[]
  start: number
  gate: number
  /** cell index of each star; its number is the same index in `nums` */
  stars: number[]
  nums: number[]
  /** the fewest tips it takes */
  best: number
}

const MIN_MOVES = 10
const MAX_MOVES = 18

export const at = (x: number, y: number) => y * SIZE + x
export const xy = (i: number): [number, number] => [i % SIZE, Math.floor(i / SIZE)]

export type Slide =
  /** where it ends up, and every cell on the way (for the animation) */
  { to: number; path: number[]; got: number; fell: boolean; won: boolean }

/** tip the globe: where the ball goes from `from`, with `got` stars (a bit mask) */
export function slide(m: Maze, from: number, got: number, dir: Dir): Slide {
  const [dx, dy] = DIRS[dir]
  const all = (1 << m.stars.length) - 1
  let [x, y] = xy(from)
  const path: number[] = []
  for (;;) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) break
    const i = at(nx, ny)
    if (m.grid[i] === 1) break
    // the gate is a wall until every star is lit
    if (i === m.gate && got !== all) break
    x = nx
    y = ny
    path.push(i)
    const s = m.stars.indexOf(i)
    if (s >= 0) got |= 1 << s
    if (m.grid[i] === 2) return { to: i, path, got, fell: true, won: false }
    if (i === m.gate) return { to: i, path, got, fell: false, won: true }
  }
  return { to: at(x, y), path, got, fell: false, won: false }
}

/** the fewest tips from the start to the gate with every star, or -1 if it can't be done */
export function solve(m: Maze): number {
  const all = (1 << m.stars.length) - 1
  const seen = new Set<number>()
  let front: [number, number][] = [[m.start, 0]]
  seen.add(m.start * 32)
  for (let depth = 1; depth <= MAX_MOVES + 4 && front.length; depth++) {
    const nextFront: [number, number][] = []
    for (const [p, got] of front) {
      for (const d of Object.keys(DIRS) as Dir[]) {
        const r = slide(m, p, got, d)
        if (r.won) return depth
        if (r.fell || r.to === p) continue
        const key = r.to * 32 + r.got
        if (seen.has(key)) continue
        seen.add(key)
        nextFront.push([r.to, r.got])
      }
    }
    front = nextFront
    if (all === 0) break
  }
  return -1
}

function make(rand: () => number): Maze | null {
  const n = SIZE * SIZE
  const grid: Cell[] = Array.from({ length: n }, () => (rand() < 0.17 ? 1 : 0))
  const free = () => {
    for (let k = 0; k < 200; k++) {
      const i = Math.floor(rand() * n)
      if (grid[i] === 0 && !used.has(i)) return used.add(i), i
    }
    return -1
  }
  const used = new Set<number>()
  const start = free()
  const gate = free()
  const stars = [free(), free(), free(), free()]
  // a few holes
  for (let h = 0; h < 3; h++) {
    const i = free()
    if (i >= 0) grid[i] = 2
  }
  if ([start, gate, ...stars].some((i) => i < 0)) return null
  // the gate sits against a wall or the edge, so it reads as a doorway
  const [gx, gy] = xy(gate)
  const edged = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ].some(([dx, dy]) => {
    const x = gx + dx
    const y = gy + dy
    return x < 0 || y < 0 || x >= SIZE || y >= SIZE || grid[at(x, y)] === 1
  })
  if (!edged) return null
  const m: Maze = { grid, start, gate, stars, nums: [], best: 0 }
  const best = solve(m)
  if (best < MIN_MOVES || best > MAX_MOVES) return null
  m.best = best
  return m
}

/** the four stars carry the locker code: four random digits, read in the order they light */
const deal = (rand: () => number) => Array.from({ length: 4 }, () => Math.floor(rand() * 10))

/** a ready-made maze, in case the dice are unkind (checked by the same solver) */
const FALLBACK: Maze = (() => {
  const rows = [
    '#..S....#',
    '..*...#..',
    '.#....o..',
    '....#...*',
    '*..o.....',
    '..#...#..',
    '....*..#.',
    '.o...#...',
    '#...G....',
  ]
  const grid: Cell[] = []
  const stars: number[] = []
  let start = 0
  let gate = 0
  rows.forEach((r, y) =>
    Array.from(r).forEach((c, x) => {
      const i = at(x, y)
      grid.push(c === '#' ? 1 : c === 'o' ? 2 : 0)
      if (c === '*') stars.push(i)
      if (c === 'S') start = i
      if (c === 'G') gate = i
    }),
  )
  return { grid, start, gate, stars, nums: [], best: 0 }
})()

export function newMaze(rand: () => number = Math.random): Maze {
  for (let k = 0; k < 4000; k++) {
    const m = make(rand)
    if (m) return { ...m, nums: deal(rand) }
  }
  return { ...FALLBACK, best: solve(FALLBACK), nums: deal(rand) }
}
