import type { Dispatch, RefObject, SetStateAction } from 'react'
import { CHARACTERS } from '../../data'
import { sfx } from '../../sfx'
import { music } from '../../music'
import { makePage, type Page } from './pages'
import { TUNE, at, difficulty, gapAt, lerp, minGapAt, speedAt, stage } from './difficulty'
import {
  airTime, boostOf, BREAK_EVERY, BREAK_LEN, COMBOS, comboWeights, cooldowns, extraClutter, FRIEND_GAP, FRIENDS, goldOdds, GRAVITY,
  GROUND, isPower, JOIN_AT, JUMP, LIVES, MAYHEM_AT, mayhem, MOON, PAGE_EVERY, PLAYER_H, POWERS, PX, rushOf, stackOdds, START_SPEED,
  tierOf, TIMED, TWIST_AT, twistTiming, TWISTS, type ComboName, type Kind, type Mode, type Power, type Thing, type Timed, type Twist,
} from './skipRules'

/** Everything the frame loop carries between frames. It lives in a ref, so frames never re-render. */
export const newGame = () => ({
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
export type GameState = ReturnType<typeof newGame>

type Set<T> = Dispatch<SetStateAction<T>>
/** The elements the loop draws into and the React state it reports back to. */
export interface LoopIO {
  field: RefObject<HTMLDivElement | null>
  player: RefObject<HTMLDivElement | null>
  ground: RefObject<HTMLDivElement | null>
  scoreEl: RefObject<HTMLElement | null>
  thingEls: RefObject<HTMLDivElement[]>
  /** one landing marker per thing, shown while a sticker is falling */
  warnEls: RefObject<HTMLDivElement[]>
  friendEls: RefObject<HTMLDivElement[]>
  doodleEls: RefObject<HTMLDivElement[]>
  worldW: RefObject<number>
  hop: () => void
  end: (final: number) => void
  say: (text: string, ms?: number) => void
  setLooks: Set<{ kind: Kind; look: number }[]>
  setPowers: Set<Record<Timed, number>>
  setRest: Set<number>
  setTwists: Set<Twist[]>
  setTiltDir: Set<number>
  setPage: Set<Page>
  setFlipping: Set<boolean>
  setTeam: Set<typeof FRIENDS>
  setWon: Set<boolean>
  setLives: Set<number>
}

/** Runs one game from `s` frame by frame until the hearts run out; returns a stop function. */
export function runSkipLoop(s: GameState, io: LoopIO) {
  const { field, player, ground, scoreEl, thingEls, warnEls, friendEls, doodleEls, worldW, hop, end, say } = io
  const { setLooks, setPowers, setRest, setTwists, setTiltDir, setPage, setFlipping, setTeam, setWon, setLives } = io
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
   * Spawns one group of hazards. If it would reach Mitsumi sooner than minGap after the last
   * group, the whole group is pushed back, so every gap can be cleared with a plain hop.
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
    // speed comes off the curve; rush hour and breaks only nudge the target, and the road eases
    // toward it so nothing ever lurches
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
      if (!t.on) {
        const w = warnEls.current[i]
        if (w && w.style.opacity !== '0') w.style.opacity = '0'
        return
      }
      t.x -= s.speed * (t.kind === 'plane' ? 1.3 : t.mode === 'roll' ? 1.45 : 1) * dt
      if (t.mode === 'bounce') t.y = Math.abs(Math.sin(t.phase * 0.55)) * 58
      else if (t.mode === 'zigzag') t.y = t.base + Math.sin(t.phase * 0.4) * 52
      t.phase += dt * 4
      // a falling sticker drops to the road, then it's ordinary clutter
      if (t.kind === 'drop' && t.y > 0) {
        t.vy -= GRAVITY * 0.8 * dt
        t.y = Math.max(0, t.y + t.vy * dt)
      }
      // while it falls, mark the spot on the road where it will land: the shadow grows as it nears
      const warn = warnEls.current[i]
      if (warn) {
        if (t.kind === 'drop' && t.y > 0) {
          const g = GRAVITY * 0.8
          const left = (t.vy + Math.sqrt(t.vy * t.vy + 2 * g * t.y)) / g
          // a spot still off the right edge is pinned to it, so the warning shows the moment it starts falling
          const land = Math.min(t.x - s.speed * pace(t) * left + t.size / 2, worldW.current - 22)
          warn.style.opacity = '1'
          warn.style.transform = `translateX(${land}px)`
          warn.style.setProperty('--near', (1 - Math.min(1, t.y / 240)).toFixed(3))
        } else if (warn.style.opacity !== '0') warn.style.opacity = '0'
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
        if (warn) warn.style.opacity = '0'
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
  return () => cancelAnimationFrame(s.raf)
}
