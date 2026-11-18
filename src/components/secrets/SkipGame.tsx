import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { C, CHARACTERS } from '../../data'
import { Icon, type IconName } from '../../icons'
import { sfx } from '../../sfx'
import { secrets } from '../../secrets'
import { music } from '../../music'
import { FIRST_PAGE, type Page } from './pages'
import {
  BUFFER, DOODLES, FLOOR, FRIEND_GAP, FRIEND_H, FRIENDS, isPower, JUMP, LIVES, MIN_WORLD_W, PLAYER_H, POOL, POWERS, PX, SKIP,
  START_SPEED, TINTS, WON_TINT, WORLD_H, type Kind, type Mode, type Timed, type Twist,
} from './skipRules'
import { newGame, runSkipLoop } from './skipLoop'
import { API, Leaderboard, NAME_KEY, useLeaderboard } from './SkipBoard'
import { SkipHud } from './SkipHud'

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

  const g = useRef(newGame())

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
    return runSkipLoop(g.current, {
      ...{ field, player, ground, scoreEl, thingEls, friendEls, doodleEls, worldW, hop, end, say },
      ...{ setLooks, setPowers, setRest, setTwists, setTiltDir, setPage, setFlipping, setTeam, setWon, setLives },
    })
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
      <SkipHud lives={lives} powers={powers} rest={rest} team={team} won={won} score={score} best={best} scoreEl={scoreEl} />

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

      <Leaderboard board={board} name={name} />
    </div>
  )
}
