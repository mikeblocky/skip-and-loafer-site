import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { C, CHARACTERS } from '../../data'
import { Icon, type IconName } from '../../icons'
import { sfx } from '../../sfx'
import { secrets } from '../../secrets'
import { music } from '../../music'
import { FIRST_PAGE, makePage, type Page } from './pages'
import { TUNE, at, difficulty, gapAt, lerp, minGapAt, speedAt, stage, stageD } from './difficulty'

/** every this many points, the road turns to a freshly generated page with a new leader */
const PAGE_EVERY = 10000

/** Things on the road: the site's own stickers. */
const GROUND: { name: IconName; color: string }[] = [
  { name: 'onigiri', color: C.ink },
  { name: 'umbrella', color: C.blue },
  { name: 'watermelon', color: C.green },
  { name: 'basket', color: C.orange },
  { name: 'suitcase', color: C.violet },
]
/** Paper doodles drifting in the background. */
const DOODLES: IconName[] = ['cloud', 'star', 'note', 'heart', 'sakura', 'moon', 'sun', 'clover']

// The game is laid out in a fixed 300-unit-tall world, then scaled to fit the field, so every
// size and distance stays in proportion however big the screen is.
const WORLD_H = 300
const MIN_WORLD_W = 420 // never show less road ahead than this
const FLOOR = 46 // the ink line, units from the bottom
const PLAYER_H = 96
const FRIEND_H = 86
const FRIEND_GAP = 30
const PX = 210 // Mitsumi's left edge: room behind her for the whole gang
const GRAVITY = 1900
// A single hop peaks ~88 units with plenty of hang time: clears the clutter (36–52 tall) while
// Mitsumi's head (top ~164) stays under the paper planes (lowest ~184). Skipping mid-air lifts
// her to ~168, into their lane.
const JUMP = 580
const SKIP = 550
/** a tap this soon before landing still hops, the moment she touches down */
const BUFFER = 0.14
const START_SPEED = TUNE.speed.start
/** a single hop's time in the air (no skip), under a gravity multiplier */
const airTime = (grav = 1) => (2 * JUMP) / (GRAVITY * grav)
const LIVES = 3
const POOL = 24

/**
 * Power-ups, each one of the site's stickers. Every pickup floats low enough to grab by running
 * through it or with a single hop (bottoms 15–95 units up; a hop reaches ~168).
 */
const POWERS: Record<string, { icon: IconName; color: string; label: string; secs: number }> = {
  clover: { icon: 'clover', color: C.green, label: 'lucky shield!', secs: 6 },
  note: { icon: 'note', color: C.violet, label: 'double points!', secs: 8 },
  sun: { icon: 'sun', color: C.amber, label: 'star magnet!', secs: 7 },
  bolt: { icon: 'bolt', color: C.orange, label: 'triple skip!', secs: 8 },
  sparkle: { icon: 'sparkle', color: C.pink, label: 'star shower!', secs: 0 },
  // a temporary 4th heart: soaks up the next hit, or fades when its time runs out
  goldheart: { icon: 'heart', color: '#FFB300', label: 'golden heart: +1 for a while!', secs: 12 },
}
type Power = 'clover' | 'note' | 'sun' | 'bolt' | 'sparkle' | 'goldheart'
const TIMED = ['clover', 'note', 'sun', 'bolt', 'goldheart'] as const
type Timed = (typeof TIMED)[number]
const isPower = (k: string): k is Power => k in POWERS

const FRIENDS = CHARACTERS.filter((c) => c.id !== 'mitsumi')
/** score at which each friend catches up; when the last one joins, you've won */
// a new friend roughly every 8–10 seconds of clean running; all six in about a minute
const JOIN_AT = [70, 170, 300, 460, 650, 870]
/** after the win, the band remixes (and calls out a new level) every this many points */
const LEVEL_AFTER_WIN = 900
/** every so often, a breather: no hazards for a few seconds */
const BREAK_EVERY = 50
const BREAK_LEN = 7
/**
 * Twists, for the very long runs. From TWIST_AT points, every so often the camera does
 * something nasty for a few seconds (announced first). How long they last, how often they
 * come and how many stack all blend in along the difficulty curve (see ./difficulty).
 * They only change how the road looks, never the controls, and never during a break.
 */
const TWIST_AT = 5000
/** the new events unlock here, and the "mayhem" stretch starts climbing (full by 25,000) */
const MAYHEM_AT = 10000
// Every late-game knob is a window on the one difficulty curve: stage(score, from, to) is 0 up
// to `from`, 1 from `to`, and eases smoothly in between, so nothing jumps at a particular score.
/** the 10k+ stretch: 0 at 10,000, all the way up by 25,000 */
const mayhem = (score: number) => stage(score, MAYHEM_AT, 25000)
/** twists stretch out and come closer together from 5,000 to 25,000 (the first ones are rare) */
const twistTiming = (score: number) => {
  const t = stage(score, TWIST_AT, 25000)
  return { len: lerp(7, 13, t), gap: lerp(16, 4, t) }
}
/** chance a twist brings a second one along (from ~7k), and a third (from ~15k) */
const stackOdds = (score: number) => ({ two: 0.85 * stage(score, 7000, 20000), three: 0.4 * stage(score, 15000, 25000) })
/** late-game breathing room: hearts / power-ups wait this long after one appears (from ~7k) */
const cooldowns = (score: number) => {
  const t = stage(score, 7000, 25000)
  return { heart: lerp(0, HEART_COOLDOWN, t), power: lerp(0, POWER_COOLDOWN, t) }
}
/** extra clutter slipped in between patterns, building up all the way from the win */
const extraClutter = (score: number) => 0.8 * stage(score, 900, 25000)
/** how strong boosts are: stars, power-up time, star showers (0 at the start, full by ~2,700) */
const boostOf = (score: number) => stage(score, 0, 2700)
/** the golden heart gets offered more and more often from the win to 5,000 */
const goldOdds = (score: number) => 0.35 * stage(score, 870, 5000)
const TWISTS = {
  tilt: { label: 'the road tilts!', from: TWIST_AT },
  mirror: { label: 'mirror world!', from: TWIST_AT },
  zoom: { label: 'zoomed in!', from: TWIST_AT },
  dark: { label: 'lights out!', from: TWIST_AT },
  sway: { label: 'sea legs!', from: TWIST_AT },
  // ── new events, 10k+ ──
  quake: { label: 'earthquake!', from: MAYHEM_AT }, // the whole picture shakes hard
  moon: { label: 'moon gravity!', from: MAYHEM_AT }, // floaty hops that reach the paper planes
  rush: { label: 'rush hour!', from: MAYHEM_AT }, // a burst of speed past the usual top speed
  storm: { label: 'paper plane storm!', from: MAYHEM_AT }, // planes pour in at every height
  flicker: { label: 'flickering lights!', from: MAYHEM_AT }, // the lights strobe on and off
} as const
type Twist = keyof typeof TWISTS
/** moon gravity: hops float this much longer (and higher) */
const MOON = 0.55
/** rush hour: road speed multiplier, and how far past the usual top speed it may go */
const rushOf = (score: number) => lerp(1.15, 1.3, mayhem(score))
/** past 10k, a pause after each heart / power-up before the next one can appear (seconds) */
const HEART_COOLDOWN = 8
const POWER_COOLDOWN = 6
/** the paper warms a little with each friend, then glows once everyone's there */
const TINTS = ['#ffffff', '#fffcf2', '#fff8e8', '#fff3ee', '#fdf0f6', '#f5f1ff', '#eef5ff']
const WON_TINT = '#fff6d8'

/**
 * Level: one per friend who has joined, then one more every 900 points after the win. Only the
 * music and the call-outs follow it; how hard the road is comes from the difficulty curve.
 */
const tierOf = (friends: number, score: number) =>
  friends + Math.floor(Math.max(0, score - JOIN_AT[JOIN_AT.length - 1]) / LEVEL_AFTER_WIN)
/**
 * Road patterns and the score where each starts to show up. A pattern blends in over a short
 * stretch of the curve (TUNE.fade) rather than switching on, roughly as each friend arrives.
 */
const COMBOS = [
  { name: 'single', from: 0 },
  { name: 'pair', from: 70 }, // two close together: a long hop or hop + skip
  { name: 'under', from: 170 }, // clutter with a paper plane right above: hop, don't skip
  { name: 'triple', from: 300 }, // three in a row
  { name: 'low', from: 460 }, // a plane at head height: stay on the ground
  { name: 'drop', from: 650 }, // a sticker falls out of the sky ahead
  // ── chaos, from the win on ──
  { name: 'bounce', from: 870 }, // clutter that hops along the road
  { name: 'zigzag', from: 870 }, // a plane that swoops up and down through the hop zone
  { name: 'swarm', from: 1800 }, // a few planes at mixed heights
  { name: 'rain', from: 1800 }, // several stickers falling at once
  { name: 'roll', from: 2700 }, // clutter rolling at you faster than the road
  { name: 'chaos', from: 3600 }, // two patterns at the same time
] as const
const COMBO_D = COMBOS.map((c) => difficulty(c.from))
/** how likely each pattern is at difficulty d: blended in after its score; plain singles fade out */
const comboWeights = (d: number) =>
  COMBOS.map((c, i) => {
    const on = Math.max(0, Math.min(1, (d - COMBO_D[i]) / TUNE.fade))
    return c.name === 'single' ? 0.6 + 3.4 * Math.pow(1 - d, 3) : on * on * (3 - 2 * on)
  })
type ComboName = (typeof COMBOS)[number]['name']
/** how things move besides scrolling with the road */
type Mode = 'normal' | 'bounce' | 'zigzag' | 'roll'

const NAME_KEY = 'sl-skip-name'
const API = '/api/leaderboard'

type Kind = 'ground' | 'drop' | 'plane' | 'star' | 'heart' | Power
interface Thing {
  on: boolean
  kind: Kind
  x: number
  y: number // bottom, units above the floor
  vy: number // only falling stickers use this
  base: number // resting height for bouncing / weaving things
  mode: Mode
  size: number
  look: number
  phase: number
}
interface Entry {
  name: string
  score: number
  won: boolean
}

function useLeaderboard() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'offline'>('loading')
  useEffect(() => {
    let alive = true
    fetch(API)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { entries: Entry[] }) => alive && (setEntries(d.entries), setState('ok')))
      .catch(() => alive && setState('offline'))
    return () => {
      alive = false
    }
  }, [])
  return { entries, setEntries, state, setState }
}

/**
 * Skip to School. Tap (or Space) to hop, again mid-air to skip. Road clutter has to be hopped,
 * paper planes cruise at skip height so a careless double-hop runs into them, stars are points
 * and hearts heal. A friend catches up at each milestone and copies your hops a beat later;
 * when all six are running with you, you've won, and you can keep going for the leaderboard.
 */
export function SkipGame() {
  const field = useRef<HTMLDivElement>(null)
  const world = useRef<HTMLDivElement>(null)
  const player = useRef<HTMLDivElement>(null)
  const ground = useRef<HTMLDivElement>(null)
  const thingEls = useRef<HTMLDivElement[]>([])
  const friendEls = useRef<HTMLDivElement[]>([])
  const doodleEls = useRef<HTMLDivElement[]>([])
  const scoreEl = useRef<HTMLElement>(null)
  const [phase, setPhase] = useState<'ready' | 'run' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(secrets.get().skipBest)
  const [lives, setLives] = useState(LIVES)
  const [team, setTeam] = useState<typeof FRIENDS>([])
  /** the page (look, objects and leader) the road is on right now */
  const [page, setPage] = useState<Page>(FIRST_PAGE)
  const [flipping, setFlipping] = useState(false)
  const [won, setWon] = useState(false)
  const [shout, setShout] = useState<string | null>(null)
  const [looks, setLooks] = useState<{ kind: Kind; look: number }[]>(() => Array.from({ length: POOL }, () => ({ kind: 'ground', look: 0 })))
  const [view, setView] = useState({ scale: 1, w: 600, h: WORLD_H })
  /** seconds left on each timed power-up, refreshed when a whole second ticks over */
  const [powers, setPowers] = useState<Record<Timed, number>>({ clover: 0, note: 0, sun: 0, bolt: 0, goldheart: 0 })
  /** seconds of break time left (0 = playing) */
  const [rest, setRest] = useState(0)
  /** camera twists running right now, and which way the road tilts */
  const [twists, setTwists] = useState<Twist[]>([])
  const [tiltDir, setTiltDir] = useState(1)

  const board = useLeaderboard()
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [save, setSave] = useState<{ state: 'idle' | 'saving' | 'saved' | 'error'; rank?: number | null; msg?: string }>({ state: 'idle' })

  /** The board keeps your best under your name from any device; this device's best catches up to it. */
  const syncBest = (n: number | null | undefined) => {
    if (!n || n <= secrets.get().skipBest) return
    secrets.update((st) => ({ ...st, skipBest: n }))
    setBest(n)
  }
  useEffect(() => {
    let saved = ''
    try {
      saved = (localStorage.getItem(NAME_KEY) ?? '').trim().toLowerCase()
    } catch {
      /* private mode */
    }
    if (saved) syncBest(board.entries.find((e) => e.name.toLowerCase() === saved)?.score)
  }, [board.entries])

  const g = useRef({
    y: 0,
    vy: 0,
    hops: 0,
    speed: START_SPEED,
    dist: 0,
    score: 0,
    lives: LIVES,
    hurt: 0,
    next: 1,
    friends: 0,
    won: false,
    overAt: 0,
    pw: { clover: 0, note: 0, sun: 0, bolt: 0, goldheart: 0 } as Record<Timed, number>,
    shieldHits: 0,
    tier: 0,
    playT: 0, // seconds since the last break
    twistT: 0, // seconds left on the current twist(s)
    active: [] as Twist[], // twists running right now
    stormT: 0, // countdown to the next storm plane
    pageN: 0, // which page of the road we're on (one per PAGE_EVERY points)
    leader: 'mitsumi',
    heartCd: 0, // 10k+: seconds until another heart may appear
    powerCd: 0, // 10k+: seconds until another power-up may appear
    twistWait: 11, // seconds until the next one may start
    breakT: 0, // seconds of break left
    clock: 0, // seconds since the run started
    lastHit: 0, // clock time the last hazard spawned so far reaches Mitsumi (for fair gaps)
    calm: 0, // seconds of breather left after a big moment
    batch: null as number[] | null, // things spawned by the hazard group being placed
    buffer: 0,
    fy: [0, 0, 0, 0, 0, 0],
    fvy: [0, 0, 0, 0, 0, 0],
    pwShown: '',
    order: [] as typeof FRIENDS,
    things: [] as Thing[],
    doodles: [] as { x: number; y: number; s: number }[],
    last: 0,
    raf: 0,
  })

  // fit the 300-unit world to the field: as tall as the screen comfortably allows, while always
  // showing at least MIN_WORLD_W units of road ahead
  useLayoutEffect(() => {
    const el = field.current
    if (!el) return
    const fit = () => {
      const w = el.clientWidth
      const phone = window.innerWidth < 760
      if (phone) {
        // phones: fill the width, and let the field grow tall (extra sky above the road)
        // so the whole lower half of the screen is one big tap target
        const scale = w / 360
        const h = Math.max(WORLD_H * scale, Math.min(window.innerHeight * 0.6, 620))
        setView({ scale, w: w / scale, h })
        return
      }
      const want = Math.min(window.innerHeight * 0.62, 620) / WORLD_H
      const scale = Math.max(0.6, Math.min(want, w / MIN_WORLD_W))
      setView({ scale, w: w / scale, h: WORLD_H * scale })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const worldW = useRef(600)
  worldW.current = view.w

  const reset = () => {
    const s = g.current
    Object.assign(s, { y: 0, vy: 0, hops: 0, speed: START_SPEED, dist: 0, score: 0, lives: LIVES, hurt: 0, next: 1.2, friends: 0, won: false, pwShown: '', buffer: 0 })
    s.fy = [0, 0, 0, 0, 0, 0]
    s.fvy = [0, 0, 0, 0, 0, 0]
    s.pw = { clover: 0, note: 0, sun: 0, bolt: 0, goldheart: 0 }
    s.shieldHits = 0
    s.tier = 0
    s.playT = 0
    s.breakT = 0
    s.twistT = 0
    s.active = []
    s.heartCd = 0
    s.pageN = 0
    s.leader = FIRST_PAGE.leader
    setPage(FIRST_PAGE)
    s.powerCd = 0
    s.twistWait = 11
    s.clock = 0
    s.lastHit = 0
    s.calm = 0
    s.batch = null
    setTwists([])
    music.setRest(false)
    setRest(0)
    setPowers({ ...s.pw })
    s.order = [...FRIENDS].sort(() => Math.random() - 0.5)
    s.things = Array.from({ length: POOL }, () => ({ on: false, kind: 'ground' as Kind, x: 0, y: 0, vy: 0, base: 0, mode: 'normal' as Mode, size: 40, look: 0, phase: 0 }))
    s.doodles = DOODLES.map((_, i) => ({ x: 60 + i * 120, y: 30 + ((i * 53) % 130), s: 0.2 + (i % 3) * 0.12 }))
    thingEls.current.forEach((el) => el && (el.style.opacity = '0'))
    setLives(LIVES)
    setTeam([])
    setWon(false)
    setSave({ state: 'idle' })
  }

  const start = () => {
    reset()
    setScore(0)
    setPhase('run')
    sfx.click(1.2)
    music.start(112)
  }

  const hop = () => {
    const s = g.current
    if (phase === 'over' && performance.now() - s.overAt < 700) return // don't restart by accident
    if (phase !== 'run') return start()
    if (s.hops >= (s.pw.bolt > 0 ? 3 : 2)) {
      // out of hops but about to land: remember the tap and hop on touchdown
      if (s.vy < 0 && s.y < 30) s.buffer = BUFFER
      return
    }
    s.buffer = 0
    s.vy = s.hops === 0 ? JUMP : s.hops === 1 ? SKIP : SKIP * 0.85
    s.hops++
    if (s.hops === 1) sfx.pop(1.25)
    else sfx.boing()
    const el = player.current
    el?.classList.remove('is-hop')
    void el?.offsetWidth
    el?.classList.add('is-hop')
  }

  const end = (final: number) => {
    music.stop(true)
    g.current.overAt = performance.now()
    setPhase('over')
    setScore(final)
    if (final > secrets.get().skipBest) {
      secrets.update((st) => ({ ...st, skipBest: final }))
      setBest(final)
      window.setTimeout(() => sfx.chime(1.2, 0.8), 300)
    }
  }

  const say = (text: string, ms = 1700) => {
    setShout(text)
    window.setTimeout(() => setShout((t) => (t === text ? null : t)), ms)
  }

  const submit = async () => {
    const n = name.trim()
    if (!n || save.state === 'saving') return
    try {
      localStorage.setItem(NAME_KEY, n)
    } catch {
      /* private mode */
    }
    setSave({ state: 'saving' })
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, score, won: g.current.won }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'could not save')
      board.setEntries(d.entries)
      board.setState('ok')
      setSave({ state: 'saved', rank: d.rank })
      syncBest(Number(d.best))
      sfx.chime(1.1, 0.7)
    } catch (e) {
      setSave({ state: 'error', msg: e instanceof Error ? e.message : 'could not save' })
    }
  }

  useEffect(() => {
    if (phase !== 'run') return
    const s = g.current
    s.last = performance.now()

    const spawn = (kind: Kind, x: number, yAt?: number, mode: Mode = 'normal') => {
      const i = s.things.findIndex((t) => !t.on)
      if (i < 0) return
      const look = kind === 'ground' || kind === 'drop' ? Math.floor(Math.random() * GROUND.length) : 0
      const size = kind === 'ground' || kind === 'drop' ? 36 + Math.random() * 16 : kind === 'plane' ? 44 : kind === 'star' ? 30 : 34
      // pickups stay within reach: low ones you run through, the rest a single hop
      const y =
        kind === 'ground'
          ? 0
          : kind === 'drop'
            ? 240
            : kind === 'plane'
              ? 186 + Math.random() * 16
              : kind === 'star'
                ? 15 + Math.random() * 80
                : 30 + Math.random() * 55
      const y0 = yAt ?? y
      s.things[i] = { on: true, kind, x, y: y0, vy: 0, base: y0, mode, size, look, phase: Math.random() * 6 }
      s.batch?.push(i)
      setLooks((L) => (L[i].kind === kind && L[i].look === look ? L : L.map((v, j) => (j === i ? { kind, look } : v))))
    }

    // ── fair spacing ──
    /** how much faster than the road a thing moves */
    const pace = (t: Thing) => (t.kind === 'plane' ? 1.3 : t.mode === 'roll' ? 1.45 : 1)
    /** clock time a thing reaches Mitsumi, at the current speed */
    const arrival = (t: Thing) => s.clock + Math.max(0, t.x + t.size * 0.25 - PX) / (s.speed * pace(t))
    /** things you have to dodge (a plane cruising high overhead only matters if you skip into it) */
    const counts = (t: Thing) =>
      t.kind === 'ground' || t.kind === 'drop' || (t.kind === 'plane' && (t.mode !== 'normal' || t.base < 180))
    /** the least time between hazard groups right now: always room to land and hop again */
    const minGap = () => minGapAt(difficulty(s.score), airTime(s.active.includes('moon') ? MOON : 1))
    /**
     * Spawn one group of hazards (a pattern, a stray bit of clutter, a storm plane). If it would
     * reach Mitsumi sooner than minGap after the last group, the whole group is pushed back
     * (keeping its own shape), so every gap between groups can be cleared with a plain hop.
     */
    const group = (place: () => void) => {
      s.batch = []
      place()
      const ids = s.batch
      s.batch = null
      const hz = ids.map((i) => s.things[i]).filter(counts)
      if (!hz.length) return
      const late = s.lastHit + minGap() - Math.min(...hz.map(arrival))
      if (late > 0) ids.forEach((i) => (s.things[i].x += late * s.speed * pace(s.things[i])))
      s.lastHit = Math.max(s.lastHit, ...hz.map(arrival))
    }
    /** start a breather: the road eases off for a few seconds (never shortens one already running) */
    const breathe = (secs: number) => (s.calm = Math.max(s.calm, secs))

    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - s.last) / 1000)
      s.last = now
      const w = worldW.current
      s.clock += dt
      s.calm = Math.max(0, s.calm - dt)
      /** where the run is on the difficulty curve */
      const D = difficulty(s.score)
      // break time: every BREAK_EVERY seconds, a few seconds with no hazards and a slower road
      if (s.breakT > 0) {
        s.breakT = Math.max(0, s.breakT - dt)
        if (s.breakT === 0) {
          s.playT = 0
          music.setRest(false)
          say('here we go!', 1300)
          breathe(TUNE.breather.rest)
        }
      } else {
        s.playT += dt
        const clear = !s.things.some((t) => t.on && (t.kind === 'ground' || t.kind === 'drop' || t.kind === 'plane') && t.x > PX - 60)
        if (s.playT >= BREAK_EVERY && clear) {
          s.breakT = BREAK_LEN
          music.setRest(true)
          say('break time! catch your breath', 2200)
          // a heart is always waiting on a break if you're missing one
          if (s.lives < LIVES) spawn('heart', w + 30, 40)
        }
      }
      // twists: a new one every so often past TWIST_AT points (not during breaks)
      if (s.twistT > 0) {
        s.twistT = Math.max(0, s.twistT - dt)
        if (s.twistT === 0 || s.breakT > 0) {
          s.twistT = 0
          s.active = []
          setTwists([])
        }
      } else if (s.score >= TWIST_AT && s.breakT <= 0) {
        s.twistWait -= dt
        if (s.twistWait <= 0) {
          const { len, gap } = twistTiming(s.score)
          const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map(([, v]) => v)
          const open = (Object.keys(TWISTS) as Twist[]).filter((k) => s.score >= TWISTS[k].from)
          const fresh = shuffle(open.filter((k) => TWISTS[k].from === MAYHEM_AT))
          const older = shuffle(open.filter((k) => TWISTS[k].from !== MAYHEM_AT))
          // from 10k the new events usually lead, so you actually meet them
          const M = mayhem(s.score)
          // the new 10k events lead more and more often as the stretch goes on
          const names = Math.random() < 0.15 + 0.5 * M ? [...fresh, ...older] : shuffle(open)
          const odds = stackOdds(s.score)
          const count = Math.random() < odds.three ? 3 : Math.random() < odds.two ? 2 : 1
          // lights out and flickering lights would fight over the same overlay; never stack them
          const picked: Twist[] = []
          for (const n of names) {
            if (picked.length >= count) break
            if (n === 'dark' && picked.includes('flicker')) continue
            if (n === 'flicker' && picked.includes('dark')) continue
            // early in the stretch, only one of the new 10k events at a time
            if (M < 0.5 && TWISTS[n].from === MAYHEM_AT && picked.some((x) => TWISTS[x].from === MAYHEM_AT)) continue
            picked.push(n)
          }
          s.twistT = len
          s.twistWait = gap * (0.8 + Math.random() * 0.5)
          s.active = picked
          // a moment to get used to the new view before the road gets busy again
          breathe(TUNE.breather.twist)
          setTiltDir(Math.random() < 0.5 ? -1 : 1)
          setTwists(picked)
          say(picked.map((t) => TWISTS[t].label).join(' + '), 2000)
          sfx.whoosh(0.5, true, 0.14)
        }
      }
      // the road's speed comes straight off the difficulty curve (approaching a ceiling a person can
      // still react at); rush hour and breaks only nudge that target, and the road eases toward it
      // so nothing ever lurches
      const target = speedAt(D) * (s.active.includes('rush') ? rushOf(s.score) : 1) * (s.breakT > 0 ? TUNE.speed.rest : 1)
      s.speed += (target - s.speed) * Math.min(1, dt * TUNE.speed.follow)
      s.dist += s.speed * dt
      // the band speeds up with the road: ~112 bpm at the start, up to ~172 when it's frantic
      music.setPace(116 + (s.speed - START_SPEED) * 0.09 - (s.breakT > 0 ? 10 : 0))
      const mult = s.pw.note > 0 ? 2 : 1
      // points come from distance, so the counter speeds up with the road: ~5.5/s at the start,
      // ~20/s at top speed (before the friend bonus and double points)
      s.score += ((dt * s.speed) / 55) * (1 + 0.1 * s.friends) * mult

      // power-up timers; the HUD only re-renders when a whole second ticks over
      TIMED.forEach((k) => (s.pw[k] = Math.max(0, s.pw[k] - dt)))
      const shown = TIMED.map((k) => Math.ceil(s.pw[k])).join() + '|' + Math.ceil(s.breakT)
      if (shown !== s.pwShown) {
        s.pwShown = shown
        setPowers({ ...s.pw })
        setRest(Math.ceil(s.breakT))
      }
      if (player.current) player.current.classList.toggle('is-shield', s.pw.clover > 0)

      // Mitsumi
      const grav = GRAVITY * (s.active.includes('moon') ? MOON : 1)
      s.vy -= grav * dt
      s.y = Math.max(0, s.y + s.vy * dt)
      if (s.y === 0) {
        s.vy = 0
        s.hops = 0
        if (s.buffer > 0) {
          s.buffer = 0
          hop()
        }
      }
      s.buffer = Math.max(0, s.buffer - dt)
      s.hurt = Math.max(0, s.hurt - dt)
      if (player.current) {
        player.current.style.transform = `translateY(${-s.y}px)`
        player.current.classList.toggle('is-blink', s.hurt > 0)
      }

      // friends hop over the clutter coming at them on their own (just for show; they can't get hurt)
      friendEls.current.forEach((el, k) => {
        if (!el) return
        const fx = PX - FRIEND_GAP * (k + 1)
        s.fvy[k] -= grav * dt
        s.fy[k] = Math.max(0, s.fy[k] + s.fvy[k] * dt)
        if (s.fy[k] === 0) {
          s.fvy[k] = 0
          const ahead = s.things.some((t) => {
            if (!t.on || !(t.kind === 'ground' || (t.kind === 'drop' && t.y === 0))) return false
            const gap = t.x + t.size * 0.2 - (fx + 30)
            return gap > 0 && gap < s.speed * 0.17
          })
          if (ahead) s.fvy[k] = JUMP * (0.96 + Math.random() * 0.06)
        }
        el.style.transform = `translateY(${-s.fy[k]}px)`
      })
      // a new page every PAGE_EVERY points: new look, new objects, a new leader
      const pageN = Math.floor(s.score / PAGE_EVERY)
      if (pageN > s.pageN) {
        s.pageN = pageN
        const next = makePage(pageN, s.leader)
        s.leader = next.leader
        // clear the road so the switch is fair, and give a beat before the next pattern
        s.things.forEach((t, i) => {
          t.on = false
          const el = thingEls.current[i]
          if (el) el.style.opacity = '0'
        })
        s.next = Math.max(s.next, 1.4)
        s.lastHit = s.clock
        breathe(TUNE.breather.page)
        setPage(next)
        setFlipping(true)
        window.setTimeout(() => setFlipping(false), 800)
        const lead = CHARACTERS.find((c) => c.id === next.leader)?.name.toLowerCase() ?? 'someone'
        say(`new page! ${lead} leads the way`, 2400)
        sfx.rustle()
        music.remix()
      }
      const tier = tierOf(s.friends, s.score)
      if (tier > s.tier) {
        s.tier = tier
        // every milestone, the band re-arranges the song in a new style
        // (the win's fanfare does its own remix right after, so don't stack a second one)
        if (!(s.won && tier === JOIN_AT.length)) music.remix()
        // after the win, each extra level gets its own heads-up (not the one the last friend brought)
        if (s.won && tier > JOIN_AT.length) say(`the road gets busier · boosts get stronger (level ${tier})`, 2200)
      }
      const joined = JOIN_AT.filter((t) => s.score >= t).length
      if (joined > s.friends && s.friends < s.order.length) {
        s.friends = joined
        const who = s.order.slice(0, joined)
        setTeam(who)
        if (joined === JOIN_AT.length && !s.won) {
          s.won = true
          setWon(true)
          breathe(TUNE.breather.win)
          say('everyone made it to school! keep skipping…', 3200)
          // the band plays a fanfare on the next downbeat (falls back to the jingle if it's silent)
          if (!music.cue('win')) sfx.jingle(0.8)
        } else {
          say(`${who[joined - 1].name.toLowerCase()} joined! (${joined}/${JOIN_AT.length})`)
          if (!music.cue('join')) sfx.chime(1 + joined * 0.08, 0.7)
        }
        // each new friend brings a heart along if you're missing one
        if (s.lives < LIVES) spawn('heart', w + 60, 45)
      }

      // doodles drift slowly behind everything
      doodleEls.current.forEach((el, i) => {
        const d = s.doodles[i]
        if (!el || !d) return
        d.x -= s.speed * d.s * dt
        if (d.x < -60) d.x = w + 40 + Math.random() * 80
        el.style.transform = `translate(${d.x}px, ${d.y}px)`
      })
      if (ground.current) ground.current.style.backgroundPositionX = `${-s.dist % 120}px`

      // what turns up on the road, and how often, all follows the difficulty curve
      s.next -= dt
      s.heartCd = Math.max(0, s.heartCd - dt)
      s.powerCd = Math.max(0, s.powerCd - dt)
      /** 1 just after a big moment, fading to 0 as the breather runs out */
      const ease = Math.min(1, s.calm / 1.5)
      /** the difficulty patterns are picked at: the curve, eased off during a breather */
      const Dp = D * (1 - TUNE.breather.ease * ease)
      if (s.active.includes('storm')) {
        s.stormT -= dt
        if (s.stormT <= 0) {
          s.stormT = lerp(0.9, 0.45, mayhem(s.score)) + Math.random() * 0.35
          group(() => spawn('plane', w + 40 + Math.random() * 60, 92 + Math.random() * 110, Math.random() < 0.3 ? 'zigzag' : 'normal'))
        }
      }
      if (s.next <= 0) {
        const r = Math.random()
        const odds = TUNE.odds
        // chances for each kind of spawn, read off the curve; whatever is left is road clutter
        const pPlane = stage(s.score, 40, 250) * at(odds.plane, D)
        const pPower = s.score > 15 && s.powerCd <= 0 ? at(odds.power, D) : 0
        const pStar = at(odds.star, D)
        const pHeart = s.lives < LIVES && s.heartCd <= 0 ? at(odds.heart, D) : 0
        const x0 = w + 20
        const powerUp = () => {
          // a power-up, never one that is already running
          const choices = (Object.keys(POWERS) as Power[]).filter((k) => k === 'sparkle' || s.pw[k as Timed] <= 0)
          // the wilder the road, the more often the golden heart is the one on offer
          if (s.pw.goldheart <= 0 && Math.random() < goldOdds(s.score)) spawn('goldheart', x0)
          else spawn(choices[Math.floor(Math.random() * choices.length)], x0)
        }
        if (s.breakT > 0) {
          // break: a gentle trickle of stars, the odd heart or power-up
          if (s.lives < LIVES && r < 0.2) spawn('heart', x0)
          else if (r < 0.3) powerUp()
          else spawn('star', x0)
        } else if (r < pPlane) group(() => spawn('plane', w + 40))
        else if (r < pPlane + pPower) {
          s.powerCd = cooldowns(s.score).power
          powerUp()
        } else if (r < pPlane + pPower + pStar) spawn('star', x0)
        else if (r < pPlane + pPower + pStar + pHeart) {
          s.heartCd = cooldowns(s.score).heart
          spawn('heart', x0)
        } else {
          // pick a road pattern: each one blends in after its score, plain singles fade out
          const weights = comboWeights(Dp)
          let pick = Math.random() * weights.reduce((a, b) => a + b, 0)
          let k = 0
          while (k < weights.length - 1 && pick > weights[k]) pick -= weights[k++]
          const combo = COMBOS[k].name
          const pattern = (c: ComboName, x: number) => {
            if (c === 'single') spawn('ground', x)
            else if (c === 'pair') {
              spawn('ground', x)
              spawn('ground', x + 52 + Math.random() * 30)
            } else if (c === 'under') {
              spawn('ground', x)
              // planes fly 1.3× faster; start it further out so both reach Mitsumi together
              spawn('plane', PX + (x - PX) * 1.3 + 10)
            } else if (c === 'triple') {
              for (let j = 0; j < 3; j++) spawn('ground', x + j * 46)
            } else if (c === 'low') {
              // head height when you hop, clear over you when you stay down
              spawn('plane', x + 20, 98 + Math.random() * 6)
            } else if (c === 'drop') {
              spawn('drop', x + 160)
            } else if (c === 'bounce') {
              spawn('ground', x, 0, 'bounce')
            } else if (c === 'zigzag') {
              spawn('plane', x + 40, 140, 'zigzag')
            } else if (c === 'swarm') {
              const n = 2 + Math.floor(Math.random() * 2)
              for (let j = 0; j < n; j++) spawn('plane', x + 40 + j * 70, j % 2 ? 100 + Math.random() * 6 : 188 + Math.random() * 12)
            } else if (c === 'rain') {
              const n = 2 + Math.floor(Math.random() * 2)
              for (let j = 0; j < n; j++) spawn('drop', x + 120 + j * (90 + Math.random() * 40))
            } else if (c === 'roll') {
              spawn('ground', x + 60, 0, 'roll')
            }
          }
          const road: ComboName[] = ['pair', 'triple', 'bounce', 'roll', 'drop']
          const air: ComboName[] = ['zigzag', 'swarm', 'rain', 'under']
          const any = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
          group(() => {
            if (combo === 'chaos') {
              // two different patterns stacked: something on the road and something in the air
              pattern(any(road), x0)
              pattern(any(air), x0 + 140 + Math.random() * 80)
            } else pattern(combo, x0)
          })
          // extra groups slipped in behind (each one spaced fairly after the last): a third
          // pattern on chaos past 10k, stray clutter from the win on, more and more past 10k
          const extra = 1 - ease
          if (combo === 'chaos' && Math.random() < 0.55 * mayhem(s.score) * extra) group(() => pattern(any(road), x0 + 300 + Math.random() * 80))
          if (Math.random() < extraClutter(s.score) * extra) group(() => pattern(Math.random() < 0.5 ? 'single' : 'bounce', x0 + 260 + Math.random() * 120))
          if (Math.random() < 0.5 * mayhem(s.score) * extra) group(() => pattern(Math.random() < 0.5 ? 'roll' : 'drop', x0 + 420 + Math.random() * 120))
        }
        // the next spawn: the curve's gap (longer during a breather), and never so soon that the
        // next pattern would crowd the last hazard already on its way
        s.next += gapAt(Dp, s.speed, Math.random()) * (1 + TUNE.breather.gap * ease)
        s.next = Math.max(s.next, s.lastHit + minGap() - (x0 - PX) / s.speed - s.clock)
      }

      // move, draw and check every thing
      const pl = PX + 14
      const pr = PX + 34
      const pb = s.y + 4
      const pt = s.y + PLAYER_H * 0.78
      s.things.forEach((t, i) => {
        if (!t.on) return
        t.x -= s.speed * (t.kind === 'plane' ? 1.3 : t.mode === 'roll' ? 1.45 : 1) * dt
        if (t.mode === 'bounce') t.y = Math.abs(Math.sin(t.phase * 0.55)) * 58
        else if (t.mode === 'zigzag') t.y = t.base + Math.sin(t.phase * 0.4) * 52
        t.phase += dt * 4
        // a falling sticker drops to the road, then it's ordinary clutter
        if (t.kind === 'drop' && t.y > 0) {
          t.vy -= GRAVITY * 0.8 * dt
          t.y = Math.max(0, t.y + t.vy * dt)
        }
        // star magnet: stars within reach drift into Mitsumi's arms (reach grows along the curve)
        if (t.kind === 'star' && s.pw.sun > 0 && t.x < PX + 300 + 400 * D && t.x > PX - 40) {
          t.x += (PX + 14 - t.x) * Math.min(1, dt * 6)
          t.y += (s.y + 30 - t.y) * Math.min(1, dt * 6)
        }
        const wobble = t.kind === 'plane' ? Math.sin(t.phase) * 8 : t.kind !== 'ground' ? Math.sin(t.phase) * 5 : 0
        const el = thingEls.current[i]
        if (t.x < -80) {
          t.on = false
          if (el) el.style.opacity = '0'
          return
        }
        const by = t.y + wobble
        if (el) {
          el.style.opacity = '1'
          el.style.width = el.style.height = `${t.size}px`
          const spin =
            t.mode === 'roll'
              ? -t.x * 1.6
              : t.kind === 'ground' || t.kind === 'drop'
                ? -t.x * 0.5
                : t.kind === 'plane'
                  ? t.mode === 'zigzag'
                    ? Math.cos(t.phase * 0.4) * -25
                    : -8
                  : 0
          el.style.transform = `translate(${t.x}px, ${-by}px) rotate(${spin}deg)`
        }
        const hazard = t.kind === 'ground' || t.kind === 'drop' || t.kind === 'plane'
        const l = t.x + t.size * (hazard ? 0.25 : 0.02)
        const r = t.x + t.size * (hazard ? 0.75 : 0.98)
        const b = by + t.size * (hazard ? 0.15 : 0)
        const top = by + t.size * (hazard ? 0.72 : 1)
        if (l > pr || r < pl || b > pt || top < pb) return
        if (t.kind === 'star') {
          t.on = false
          if (el) el.style.opacity = '0'
          // stars grow along the curve, up to 22 each
          s.score += (10 + 12 * boostOf(s.score)) * mult
          sfx.blip(1.5)
        } else if (isPower(t.kind)) {
          t.on = false
          if (el) el.style.opacity = '0'
          const k = t.kind
          if (k === 'sparkle') {
            // an arc of stars right ahead, all within a hop; longer as boosts grow
            const n = 6 + Math.round(2 * boostOf(s.score))
            for (let j = 0; j < n; j++) spawn('star', w + 20 + j * 38, 20 + Math.sin((j / (n - 1)) * Math.PI) * 70)
          } else {
            // the clover stays short and single-use; the rest last a little longer as the curve climbs
            s.pw[k] = k === 'clover' ? POWERS[k].secs : POWERS[k].secs * (1 + 0.48 * boostOf(s.score))
            // from tier 3 the clover holds off two hits
            if (k === 'clover') s.shieldHits = 1
          }
          say(POWERS[k].label)
          sfx.chime(1.4, 0.7)
        } else if (t.kind === 'heart') {
          t.on = false
          if (el) el.style.opacity = '0'
          s.lives = Math.min(LIVES, s.lives + 1)
          setLives(s.lives)
          music.setDanger(s.lives === 1)
          sfx.chime(1.3, 0.6)
        } else if (s.hurt <= 0 && s.pw.clover > 0) {
          // the lucky clover takes the hit instead
          s.shieldHits--
          if (s.shieldHits <= 0) s.pw.clover = 0
          s.hurt = 0.5
          sfx.boing()
          say(s.shieldHits > 0 ? 'the clover held! one more block left' : 'phew, the clover saved you!')
        } else if (s.hurt <= 0 && s.pw.goldheart > 0) {
          // the golden heart breaks first
          s.pw.goldheart = 0
          s.hurt = 1.6
          sfx.thud()
          say('the golden heart took that one')
          const f = field.current
          f?.classList.remove('is-hit')
          void f?.offsetWidth
          f?.classList.add('is-hit')
        } else if (s.hurt <= 0) {
          s.lives--
          s.hurt = 1.6
          setLives(s.lives)
          music.setDanger(s.lives === 1)
          sfx.thud()
          const f = field.current
          f?.classList.remove('is-hit')
          void f?.offsetWidth
          f?.classList.add('is-hit')
        }
      })

      const pts = Math.floor(s.score)
      if (scoreEl.current) scoreEl.current.textContent = String(pts)
      if (s.lives <= 0) {
        end(pts)
        return
      }
      s.raf = requestAnimationFrame(frame)
    }
    s.raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(g.current.raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // closing the game mid-run stops the band
  useEffect(() => () => music.stop(), [])

  // Space / ↑ to hop while the game is open (but not while typing a name)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'ArrowUp') return
      if ((e.target as Element | null)?.closest?.('button, input, textarea')) return
      e.preventDefault()
      hop()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const tint = won ? WON_TINT : TINTS[Math.min(team.length, TINTS.length - 1)]

  return (
    <div className="skipgame">
      <div className="sg-hud">
        <span className="sg-lives" aria-label={`${lives} hearts left`}>
          {Array.from({ length: LIVES }, (_, i) => (
            <Icon key={i} name="heart" color={i < lives ? C.red : '#e3ddd2'} size={22} />
          ))}
          {powers.goldheart > 0 && <Icon name="heart" color={POWERS.goldheart.color} size={22} className="sg-goldheart" />}
        </span>
        <span className="sg-gang" aria-label={`${team.length} of ${JOIN_AT.length} friends`}>
          {FRIENDS.map((f, i) => (
            <i key={f.id} className={i < team.length ? 'is-in' : ''} style={{ '--c': (team[i] ?? f).color } as CSSProperties} />
          ))}
          {won && <b className="sg-made">made it!</b>}
        </span>
        <span className="sg-powers" aria-live="polite">
          {rest > 0 && <span className="sg-power sg-rest">break {rest}s</span>}
          {TIMED.filter((k) => powers[k] > 0).map((k) => (
            <span key={k} className="sg-power" style={{ '--c': POWERS[k].color } as CSSProperties} title={POWERS[k].label}>
              <Icon name={POWERS[k].icon} color={POWERS[k].color} size={16} />
              {Math.ceil(powers[k])}s
            </span>
          ))}
        </span>
        <span>
          score <b ref={scoreEl}>{score}</b>
        </span>
        <span>
          best <b>{best}</b>
        </span>
      </div>

      <div
        className={`sg-field is-${phase}${won ? ' is-won' : ''}${rest > 0 ? ' is-break' : ''}${flipping ? ' is-flip' : ''}${twists.map((t) => ' tw-' + t).join('')}`}
        ref={field}
        onPointerDown={(e) => {
          e.preventDefault()
          hop()
        }}
        style={
          {
            height: view.h,
            '--tint': page.n > 0 ? page.paper : tint,
            '--page-lines': page.lines || 'none',
            '--page-size': page.lineSize,
            '--page-margin': page.margin,
            '--page-floor': page.floor,
            '--tilt': `${tiltDir * 7}deg`,
            // Where Mitsumi is on screen. Tilt and zoom pivot on her; the mirror flips around the
            // middle (so the road ahead stays on screen) and the spotlight follows her across.
            ...(() => {
              const mx = (PX + 22) * view.scale
              const my = view.h - (FLOOR + 44) * view.scale
              const fieldW = view.w * view.scale
              const mirror = twists.includes('mirror')
              return {
                '--ox': mirror ? '50%' : `${mx}px`,
                '--oy': mirror ? '50%' : `${my}px`,
                '--sx': `${mirror ? fieldW - mx : mx}px`,
                '--sy': `${my}px`,
              }
            })(),
          } as CSSProperties
        }
      >
        <div className="sg-cam">
        <div
          className="sg-world"
          ref={world}
          style={{ width: view.w, height: view.h / view.scale, transform: `scale(${view.scale})`, '--floor': `${FLOOR}px` } as CSSProperties}
        >
          <div className="sg-doodles" aria-hidden="true">
            {page.doodles.map((n, i) => (
              <div
                key={i}
                className="sg-doodle"
                ref={(el) => {
                  if (el) doodleEls.current[i] = el
                }}
              >
                <Icon name={n} color={page.doodleColor} size={i % 2 ? 30 : 44} />
              </div>
            ))}
          </div>
          <div className="sg-floor" ref={ground} aria-hidden="true" />

          {(page.leader === 'mitsumi' ? team : CHARACTERS.filter((c) => c.id !== page.leader)).map((f, k) => (
            <div
              key={f.id}
              className="sg-friend"
              ref={(el) => {
                if (el) friendEls.current[k] = el
              }}
              style={{ left: PX - FRIEND_GAP * (k + 1), height: FRIEND_H, zIndex: 3 - k } as CSSProperties}
            >
              <img src={f.src} alt={f.name} draggable={false} />
            </div>
          ))}
          <div className="sg-player" ref={player} style={{ left: PX, height: PLAYER_H }}>
            {(() => {
              const lead = CHARACTERS.find((c) => c.id === page.leader) ?? CHARACTERS[0]
              return <img key={lead.id} src={lead.src} alt={lead.name} draggable={false} />
            })()}
          </div>

          {Array.from({ length: POOL }, (_, i) => {
            const L = looks[i]
            const icon =
              L.kind === 'ground' || L.kind === 'drop'
                ? page.ground[L.look % page.ground.length]
                : L.kind === 'plane'
                  ? page.air
                  : L.kind === 'star'
                    ? { name: 'star' as IconName, color: C.yellow }
                    : isPower(L.kind)
                      ? { name: POWERS[L.kind].icon, color: POWERS[L.kind].color }
                      : { name: 'heart' as IconName, color: C.red }
            return (
              <div
                key={i}
                className={`sg-thing is-${L.kind}${isPower(L.kind) ? ' is-power' : ''}`}
                ref={(el) => {
                  if (el) thingEls.current[i] = el
                }}
              >
                <Icon name={icon.name} color={icon.color} size="100%" />
              </div>
            )
          })}
        </div>
        </div>

        {shout && phase === 'run' && <div className="sg-shout">{shout}</div>}

        {phase !== 'run' && (
          <div className="sg-overlay">
            {phase === 'over' ? (
              <>
                <b>{won ? 'everyone made it!' : 'late for class!'}</b>
                <span>
                  {score} points{team.length ? ` · ran with ${team.map((f) => f.name).join(', ')}` : ''}
                  {score >= best && score > 0 ? ' · new best!' : ''}
                </span>
                {score > 0 && board.state !== 'offline' && (
                  <form
                    className="sg-save"
                    onPointerDown={(e) => e.stopPropagation()}
                    onSubmit={(e) => {
                      e.preventDefault()
                      submit()
                    }}
                  >
                    {save.state === 'saved' ? (
                      <span className="sg-saved">saved{save.rank ? ` · you're #${save.rank}` : ''}</span>
                    ) : (
                      <>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          maxLength={16}
                          placeholder="your name"
                          aria-label="Your name for the leaderboard"
                          autoComplete="nickname"
                          enterKeyHint="done"
                        />
                        <button className="sx-btn is-strong" disabled={!name.trim() || save.state === 'saving'}>
                          {save.state === 'saving' ? 'saving…' : 'save score'}
                        </button>
                      </>
                    )}
                    {save.state === 'error' && <span className="sg-err">{save.msg}</span>}
                  </form>
                )}
                <span className="sg-how">tap the road to try again</span>
              </>
            ) : (
              <>
                <b>skip to school!</b>
                <span className="sg-how">tap or press space to hop · again mid-air to skip</span>
                <span className="sg-how">hop the clutter, mind the paper planes, grab stars, hearts and power-ups</span>
                <span className="sg-how">pick up all six friends on the way to win</span>
              </>
            )}
          </div>
        )}
      </div>

      <section className="sg-board" aria-label="Leaderboard">
        <h3>leaderboard</h3>
        {board.state === 'loading' && <p className="sx-note">loading…</p>}
        {board.state === 'offline' && <p className="sx-note">the leaderboard is offline right now. your best still saves on this device.</p>}
        {board.state === 'ok' && board.entries.length === 0 && <p className="sx-note">no scores yet. be the first!</p>}
        {board.state === 'ok' && board.entries.length > 0 && (
          <ol>
            {board.entries.map((e, i) => (
              <li key={e.name + i} className={e.name.toLowerCase() === name.trim().toLowerCase() ? 'is-you' : ''}>
                <span className="sg-rank">{i + 1}</span>
                <span className="sg-name">{e.name}</span>
                {e.won && <Icon name="star" color={C.yellow} size={14} />}
                <b>{e.score}</b>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
