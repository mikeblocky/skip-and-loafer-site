/**
 * Painted backdrops for the talk scenes. Flat shapes and flat colours only (like the rest of the
 * site), but layered for depth: a sky or wall in bands, far shapes pale and soft, near ones darker
 * and sharper, and light and shade as flat shapes of their own (a sunbeam, a pool of lamplight,
 * the shadow side of a roof). Drawn on a 1600×900 stage that crops to fill any screen from the
 * bottom up, so the floor always meets the characters' feet (the floor starts around y = 720).
 *
 *   lockers   the shoe lockers at school, a winter morning, snow at the windows
 *   street    the walk home at sunset, snow piled along the road
 *   ueno      Ueno Park's winter lights at night, a big tree, falling snow
 *   set       nine years ago: the giant snow-globe set, crew lights, the cue light, the camera
 *   school    the school gate on a snowy morning
 */
import type { ReactNode } from 'react'

export type Backdrop = 'lockers' | 'street' | 'ueno' | 'set' | 'school'

const range = (n: number) => Array.from({ length: n }, (_, i) => i)
/** the same "random" numbers every time, so a backdrop never reshuffles */
const rand = (seed: number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** a sky (or wall) in flat horizontal bands, top to bottom */
function Bands({ colors, y = 0, h = 900 }: { colors: string[]; y?: number; h?: number }) {
  const step = h / colors.length
  return (
    <>
      {colors.map((c, i) => (
        <rect key={i} x="0" y={y + i * step} width="1600" height={step + 1} fill={c} />
      ))}
    </>
  )
}

/** snowflakes drifting down (they fall with the scene's own snow animation) */
function Flakes({ n, seed, top = 0, bottom = 720, color = '#fff', max = 5 }: { n: number; seed: number; top?: number; bottom?: number; color?: string; max?: number }) {
  const r = rand(seed)
  return (
    <g className="sb-flakes">
      {range(n).map((i) => (
        <circle key={i} cx={r() * 1600} cy={top + r() * (bottom - top)} r={1.5 + r() * max} fill={color} opacity={0.5 + r() * 0.5} style={{ animationDelay: `${-r() * 8}s` }} />
      ))}
    </g>
  )
}

/** a little paper snowflake: six arms with a tick on each */
function PaperFlake({ x, y, s = 1, color = '#fff' }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={color} strokeWidth="4" strokeLinecap="round">
      {range(6).map((k) => (
        <g key={k} transform={`rotate(${k * 60})`}>
          <path d="M0 0 L0 -22 M0 -13 L-7 -19 M0 -13 L7 -19" />
        </g>
      ))}
    </g>
  )
}

/** a pine, flat, in three tiers, with snow on each tier */
function Pine({ x, y, s = 1, dark = '#2F5D4E', light = '#3E7461', snow = true }: { x: number; y: number; s?: number; dark?: string; light?: string; snow?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-8" y="-10" width="16" height="30" fill="#5B4636" />
      {[0, 1, 2].map((k) => {
        const w = 90 - k * 22
        const top = -60 - k * 52
        return (
          <g key={k}>
            <polygon points={`${-w},${top + 70} 0,${top} ${w},${top + 70}`} fill={light} />
            <polygon points={`0,${top} ${w},${top + 70} 0,${top + 70}`} fill={dark} />
            {snow && <path d={`M${-w * 0.55} ${top + 38} Q0 ${top + 14} ${w * 0.55} ${top + 38} L${w * 0.3} ${top + 30} L0 ${top + 6} L${-w * 0.3} ${top + 30} Z`} fill="#FFFFFF" />}
          </g>
        )
      })}
    </g>
  )
}

/** a bare winter tree: trunk and a few branches, snow along their tops */
function BareTree({ x, y, s = 1, color = '#7C6A62' }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={color} strokeLinecap="round" fill="none">
      <path d="M0 0 L0 -260" strokeWidth="16" />
      <path d="M0 -120 L-70 -200 M0 -170 L80 -250 M0 -220 L-40 -300 M-40 -170 L-90 -190 M45 -205 L95 -220 M0 -255 L30 -320" strokeWidth="8" />
      <path d="M-70 -200 L-100 -230 M80 -250 L110 -290 M-40 -300 L-60 -330" strokeWidth="5" />
      <path d="M-62 -205 L-96 -232 M6 -128 L-58 -198 M8 -176 L74 -248" stroke="#FFFFFF" strokeWidth="4" />
    </g>
  )
}

// ── the shoe lockers, a winter morning ──────────────────────────────────

function Lockers() {
  const cols = 14
  const left = 40
  const w = (1600 - left * 2) / cols
  const r = rand(11)
  return (
    <>
      {/* the wall, warm cream, with a darker band of wood along the bottom */}
      <rect width="1600" height="900" fill="#F1E8D8" />
      {/* the long windows: a snowy schoolyard outside */}
      <defs>
        <clipPath id="sb-lk-win">
          <rect x="0" y="40" width="1600" height="190" />
        </clipPath>
      </defs>
      <g clipPath="url(#sb-lk-win)">
        <Bands colors={['#C9DFF0', '#D6E7F4', '#E2EEF8']} y={40} h={130} />
        <path d="M0 180 Q200 140 420 168 T860 160 T1300 170 T1600 150 V230 H0 Z" fill="#EEF4FA" />
        {[90, 260, 520, 700, 980, 1180, 1420].map((x, i) => (
          <Pine key={i} x={x} y={205} s={0.35 + (i % 3) * 0.06} dark="#9FB6C6" light="#B4C7D5" />
        ))}
        <rect x="0" y="200" width="1600" height="30" fill="#F7FAFD" />
        <Flakes n={60} seed={4} top={40} bottom={230} max={3} />
      </g>
      {/* window frames and the sill */}
      {range(9).map((i) => (
        <rect key={i} x={i * 200 - 8} y="34" width="16" height="200" fill="#8C6A4E" />
      ))}
      <rect x="0" y="30" width="1600" height="14" fill="#8C6A4E" />
      <rect x="0" y="130" width="1600" height="8" fill="#8C6A4E" />
      <rect x="0" y="228" width="1600" height="18" fill="#A47E5C" />
      <rect x="0" y="244" width="1600" height="6" fill="#7C5B40" />
      {/* paper snowflakes taped to the glass, the class's winter decorations */}
      {[150, 470, 830, 1190, 1490].map((x, i) => (
        <g key={i}>
          <path d={`M${x} 44 L${x} ${70 + (i % 2) * 22}`} stroke="#C9B8A2" strokeWidth="2" />
          <PaperFlake x={x} y={92 + (i % 2) * 22} s={0.9} />
        </g>
      ))}
      {/* sunbeams falling in across the lockers */}
      {[0, 1, 2, 3].map((i) => (
        <polygon key={i} points={`${160 + i * 380},246 ${300 + i * 380},246 ${520 + i * 380},760 ${330 + i * 380},760`} fill="#FFF4D6" opacity="0.32" />
      ))}

      {/* the lockers: one long wooden cabinet, five rows of little doors */}
      <rect x={left - 14} y="262" width={1600 - left * 2 + 28} height="20" fill="#8F643E" />
      <rect x={left} y="282" width={1600 - left * 2} height="440" fill="#A87A4C" />
      {range(cols).map((c) =>
        range(5).map((row) => {
          const x = left + c * w + 5
          const y = 290 + row * 86
          const open = c === 6 && row === 2
          const dw = w - 10
          return (
            <g key={`${c}-${row}`}>
              {open ? (
                <>
                  {/* Mitsumi's: the door swung open, the envelope inside with its snowflake sticker */}
                  <rect x={x} y={y} width={dw} height="78" fill="#4E3726" />
                  <rect x={x + 8} y={y + 52} width={dw - 16} height="20" rx="6" fill="#F4F1EA" />
                  <rect x={x + 8} y={y + 52} width={dw - 16} height="7" fill="#D9535E" />
                  <g transform={`rotate(-8 ${x + dw / 2} ${y + 34})`}>
                    <rect x={x + 14} y={y + 16} width={dw - 28} height="36" fill="#FFFDF7" stroke="#C9B8A2" strokeWidth="2" />
                    <path d={`M${x + 14} ${y + 16} L${x + dw / 2} ${y + 36} L${x + dw - 14} ${y + 16}`} fill="none" stroke="#C9B8A2" strokeWidth="2" />
                    <PaperFlake x={x + dw / 2} y={y + 38} s={0.32} color="#5E8FD6" />
                  </g>
                  <polygon points={`${x + dw},${y - 4} ${x + dw + 30},${y + 6} ${x + dw + 30},${y + 72} ${x + dw},${y + 82}`} fill="#E2BE8E" stroke="#8F643E" strokeWidth="2" />
                </>
              ) : (
                <>
                  <rect x={x} y={y} width={dw} height="78" fill="#D8AF7C" />
                  <rect x={x} y={y + 70} width={dw} height="8" fill="#C49763" />
                  {/* the little name card, and a few with a doodle or a slip of paper */}
                  <rect x={x + 10} y={y + 10} width={Math.min(46, dw - 20)} height="14" fill="#FBF8F1" />
                  <rect x={x + 14} y={y + 15} width={(r() * 0.6 + 0.3) * Math.min(38, dw - 28)} height="4" fill="#B9AC98" />
                  <rect x={x + dw - 20} y={y + 36} width="8" height="18" rx="4" fill="#8F643E" />
                </>
              )}
            </g>
          )
        }),
      )}
      <rect x={left} y="722" width={1600 - left * 2} height="22" fill="#7E5634" />

      {/* the duckboards in front: slats, closer ones wider */}
      <rect x="0" y="744" width="1600" height="156" fill="#7A5A3C" />
      {[0, 1, 2, 3, 4].map((k) => {
        const y = 750 + k * 22 + k * k * 3
        return <rect key={k} x="0" y={y} width="1600" height={14 + k * 4} fill={k % 2 ? '#C9A577' : '#C19D6E'} />
      })}
      {/* an umbrella stand by the door, and someone's loafers (kept in from the edges: narrower
          screens crop the sides) */}
      <g transform="translate(210 0)">
        <path d="M70 610 Q66 520 110 470" stroke="#2E5E9E" strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d="M100 610 Q98 500 150 450 Q170 440 172 460" stroke="#D9535E" strokeWidth="10" fill="none" strokeLinecap="round" />
        <rect x="46" y="600" width="90" height="140" rx="10" fill="#5F6B78" />
        <rect x="46" y="600" width="90" height="16" fill="#4A5561" />
      </g>
      <g transform="translate(1120 860)">
        <path d="M0 0 Q0 -26 40 -26 L80 -24 Q96 -22 96 -8 L96 4 L0 4 Z" fill="#5A3A28" />
        <path d="M110 4 Q110 -22 150 -22 L190 -20 Q206 -18 206 -6 L206 6 L110 6 Z" fill="#5A3A28" />
        <rect x="20" y="-22" width="30" height="6" rx="3" fill="#7A5038" />
        <rect x="130" y="-18" width="30" height="6" rx="3" fill="#7A5038" />
      </g>
    </>
  )
}

// ── the walk home, a winter sunset ──────────────────────────────────────

function Street() {
  const r = rand(23)
  const poles = [220, 880, 1460]
  return (
    <>
      <Bands colors={['#8E86C2', '#A98FC3', '#C99BBE', '#E3A8B0', '#F1B9A2', '#F7CBA0']} h={640} />
      <rect y="640" width="1600" height="260" fill="#F7CBA0" />
      {/* the sun going down, with its halo */}
      <circle cx="1160" cy="560" r="170" fill="#FBD9AE" opacity="0.45" />
      <circle cx="1160" cy="560" r="115" fill="#FCE3BC" opacity="0.6" />
      <circle cx="1160" cy="560" r="72" fill="#FFF0CF" />
      {/* the city far off */}
      {[
        [0, 520, 120],
        [110, 470, 90],
        [190, 540, 140],
        [320, 500, 80],
        [1260, 480, 110],
        [1360, 430, 70],
        [1420, 500, 180],
      ].map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={700 - y} fill="#B98FAA" />
          {range(6).map((k) => (r() < 0.45 ? <rect key={k} x={x + 12 + (k % 3) * (w / 3.4)} y={y + 20 + Math.floor(k / 3) * 34} width="10" height="12" fill="#F7D9A8" /> : null))}
        </g>
      ))}

      {/* the houses on the way home: snow on the roofs, warm windows */}
      {[
        [420, 560, 270, '#E6CFC0', '#6E5868'],
        [720, 590, 240, '#D8C3BA', '#5E4A5E'],
        [990, 570, 250, '#EAD6C2', '#6E5868'],
      ].map(([x, y, w, wall, roof], i) => {
        const X = x as number
        const Y = y as number
        const W = w as number
        return (
          <g key={i}>
            <rect x={X} y={Y} width={W} height={760 - Y} fill={wall as string} />
            <rect x={X + W - 40} y={Y} width="40" height={760 - Y} fill="#000" opacity="0.08" />
            <polygon points={`${X - 24},${Y} ${X + W / 2},${Y - 86} ${X + W + 24},${Y}`} fill={roof as string} />
            <polygon points={`${X + W / 2},${Y - 86} ${X + W + 24},${Y} ${X + W / 2},${Y}`} fill="#000" opacity="0.12" />
            <path d={`M${X - 24} ${Y} L${X + W / 2} ${Y - 86} L${X + W + 24} ${Y} L${X + W + 10} ${Y + 8} L${X + W / 2} ${Y - 70} L${X - 10} ${Y + 8} Z`} fill="#FFFFFF" />
            <rect x={X + 36} y={Y + 46} width="52" height="44" fill="#FFD58A" />
            <rect x={X + 60} y={Y + 46} width="4" height="44" fill={wall as string} />
            <rect x={X + W - 96} y={Y + 46} width="52" height="44" fill={i === 1 ? '#7E6A78' : '#FFC876'} />
            <rect x={X + W / 2 - 22} y={760 - 70} width="44" height="70" fill="#7A5A4A" />
          </g>
        )
      })}
      {/* a vending machine glowing by the road */}
      <g transform="translate(90 0)">
        <ellipse cx="300" cy="770" rx="110" ry="18" fill="#FFF4D2" opacity="0.5" />
        <rect x="244" y="580" width="112" height="190" rx="6" fill="#E9EEF5" />
        <rect x="254" y="592" width="92" height="96" fill="#BFD6EA" />
        {range(3).map((row) =>
          range(4).map((c) => <rect key={`${row}-${c}`} x={260 + c * 21} y={600 + row * 30} width="14" height="22" rx="3" fill={['#D9535E', '#F2A93B', '#3F8FD2', '#5BB07A'][(row + c) % 4]} />),
        )}
        <rect x="254" y="700" width="92" height="10" fill="#C7CFD9" />
        <rect x="300" y="722" width="40" height="24" fill="#5F6B78" />
      </g>
      {/* telephone poles, their wires, a couple of birds */}
      {poles.map((x) => (
        <g key={x}>
          <rect x={x - 8} y="150" width="16" height="620" fill="#4A3F52" />
          <rect x={x - 64} y="210" width="128" height="10" fill="#4A3F52" />
          <rect x={x - 44} y="270" width="88" height="8" fill="#4A3F52" />
        </g>
      ))}
      {[0, 1].map((k) =>
        [
          [-100, 220],
          [220, 880],
          [880, 1460],
          [1460, 1800],
        ].map(([a, b], i) => (
          <path key={`${k}-${i}`} d={`M${a} ${216 + k * 58} Q${(a + b) / 2} ${280 + k * 58} ${b} ${216 + k * 58}`} fill="none" stroke="#4A3F52" strokeWidth="2.5" />
        )),
      )}
      {[
        [520, 262],
        [560, 266],
        [1150, 262],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} q8 -12 16 -4 q6 -8 12 0 l-6 6 q-10 6 -22 -2 z`} fill="#3A3142" />
      ))}
      {/* the orange curve mirror at the corner */}
      <g transform="translate(-120 0)">
        <rect x="1338" y="520" width="10" height="250" fill="#F07A3A" />
        <circle cx="1343" cy="500" r="44" fill="#F07A3A" />
        <circle cx="1343" cy="500" r="34" fill="#CFE0EE" />
        <path d="M1322 486 Q1343 470 1362 486" stroke="#FFFFFF" strokeWidth="5" fill="none" strokeLinecap="round" />
      </g>
      {/* the road, its white line, and snow banked along the curb */}
      <rect x="0" y="770" width="1600" height="130" fill="#8F8296" />
      <rect x="0" y="770" width="1600" height="10" fill="#A796A8" />
      {range(8).map((i) => (
        <rect key={i} x={i * 220 + 40} y="850" width="120" height="8" fill="#E9E1EA" />
      ))}
      <path d="M0 790 Q80 760 170 784 Q260 758 360 786 Q450 764 520 790 L520 800 L0 800 Z" fill="#FFFFFF" />
      <path d="M1080 792 Q1170 762 1270 786 Q1380 760 1480 788 Q1560 770 1600 786 L1600 800 L1080 800 Z" fill="#FFFFFF" />
      <Flakes n={26} seed={8} top={0} bottom={760} max={3} />
    </>
  )
}

// ── Ueno Park's winter lights, at night ─────────────────────────────────

function Ueno() {
  const r = rand(31)
  const LIGHTS = ['#FFD36B', '#FF9FBE', '#9FDBFF', '#FFF3C4']
  const trees = [
    [110, 330],
    [420, 290],
    [1330, 300],
    [1540, 350],
  ]
  // strings of lights looping from tree to tree
  const strands = [
    [-60, 360, 420, 320, 540],
    [420, 330, 1000, 300, 470],
    [1000, 300, 1330, 330, 450],
    [1330, 330, 1680, 360, 520],
  ]
  const twinkle = (i: number) => ({ animationDelay: `${(i * 0.37) % 3}s` })
  return (
    <>
      <Bands colors={['#10142E', '#141A38', '#192044', '#1F2750', '#262F5C', '#2E3866']} h={720} />
      {/* stars and the moon */}
      {range(70).map((i) => (
        <circle key={i} cx={r() * 1600} cy={r() * 380} r={r() < 0.85 ? 1.4 : 2.6} fill="#FFFFFF" opacity={0.3 + r() * 0.6} />
      ))}
      <circle cx="760" cy="120" r="44" fill="#F3EED8" />
      <circle cx="782" cy="108" r="40" fill="#141A38" />
      {/* the city beyond the park, a tower, its windows still lit */}
      <rect x="1080" y="300" width="14" height="300" fill="#2B3462" />
      <polygon points="1060,600 1087,250 1114,600" fill="#2B3462" />
      <circle cx="1087" cy="240" r="5" fill="#FF6B6B" />
      {[
        [0, 520, 160],
        [150, 480, 120],
        [260, 540, 200],
        [560, 500, 140],
        [690, 540, 160],
        [860, 470, 120],
        [1170, 510, 180],
        [1340, 480, 130],
        [1460, 530, 140],
      ].map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={720 - y} fill="#252D5A" />
          {range(8).map((k) => (r() < 0.4 ? <rect key={k} x={x + 10 + (k % 4) * (w / 4.4)} y={y + 16 + Math.floor(k / 4) * 28} width="8" height="10" fill="#F7D9A8" opacity="0.8" /> : null))}
        </g>
      ))}
      {/* the park's trees, dark, with lights wound through them */}
      {trees.map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 16} y={y + 60} width="32" height={720 - y - 60} fill="#0E1330" />
          <circle cx={x} cy={y} r="130" fill="#141A3C" />
          <circle cx={x - 100} cy={y + 64} r="86" fill="#141A3C" />
          <circle cx={x + 100} cy={y + 54} r="92" fill="#141A3C" />
          {range(22).map((k) => (
            <circle
              key={k}
              className="sb-light"
              cx={x + Math.cos(k * 2.4) * (40 + (k % 5) * 28)}
              cy={y + Math.sin(k * 2.4) * (30 + (k % 4) * 24) + 24}
              r="5"
              fill={LIGHTS[k % LIGHTS.length]}
              style={twinkle(k + i)}
            />
          ))}
        </g>
      ))}
      {/* the big tree in the middle of the path: four tiers down to the snow, a star on top */}
      <g>
        <circle cx="960" cy="200" r="80" fill="#FFD36B" opacity="0.12" />
        <rect x="944" y="640" width="32" height="90" fill="#4A3426" />
        {[0, 1, 2, 3].map((k) => {
          const w = 210 - k * 44
          const bottom = 660 - k * 110
          const top = bottom - 190
          return (
            <g key={k}>
              <polygon points={`${960 - w},${bottom} 960,${top} ${960 + w},${bottom}`} fill="#235E4C" />
              <polygon points={`960,${top} ${960 + w},${bottom} 960,${bottom}`} fill="#1A4A3C" />
              <path d={`M${960 - w} ${bottom} Q960 ${bottom - 26} ${960 + w} ${bottom} L${960 + w - 14} ${bottom + 6} Q960 ${bottom - 14} ${960 - w + 14} ${bottom + 6} Z`} fill="#FFFFFF" opacity="0.85" />
            </g>
          )
        })}
        {range(52).map((k) => {
          const t = k / 52
          const y = 210 + t * 430
          const w = 24 + t * 186
          const x = 960 + Math.sin(k * 1.9) * w * 0.8
          return <circle key={k} className="sb-light" cx={x} cy={y} r="5.5" fill={LIGHTS[k % LIGHTS.length]} style={twinkle(k)} />
        })}
        <polygon points="960,118 972,154 1010,154 980,176 992,212 960,190 928,212 940,176 910,154 948,154" fill="#FFD36B" />
      </g>
      {strands.map(([x1, y1, x2, y2, sag], i) => {
        const pts = range(18).map((k) => {
          const t = k / 17
          return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + Math.sin(Math.PI * t) * (sag - Math.max(y1, y2))]
        })
        return (
          <g key={i}>
            <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#2B335E" strokeWidth="2" />
            {pts.map(([x, y], k) => (
              <circle key={k} className="sb-light" cx={x} cy={y + 6} r="6" fill={LIGHTS[(k + i) % LIGHTS.length]} style={twinkle(k * 0.8 + i)} />
            ))}
          </g>
        )
      })}
      {/* the snowy ground, the path, pools of lamplight, a bench */}
      <rect x="0" y="720" width="1600" height="180" fill="#DCE4F0" />
      <path d="M520 900 Q700 780 930 722 L1080 722 Q940 800 900 900 Z" fill="#C7D2E3" />
      {[300, 1390].map((x, i) => (
        <g key={i}>
          <ellipse cx={x} cy="760" rx="150" ry="30" fill="#FFE7A8" opacity="0.35" />
          <rect x={x - 5} y="520" width="10" height="240" fill="#2A2F4A" />
          <rect x={x - 18} y="496" width="36" height="34" rx="6" fill="#2A2F4A" />
          <rect x={x - 12} y="502" width="24" height="22" rx="4" fill="#FFE3A0" />
          <circle cx={x} cy="512" r="34" fill="#FFE3A0" opacity="0.18" />
        </g>
      ))}
      <g>
        <rect x="560" y="690" width="170" height="14" rx="4" fill="#5A4636" />
        <rect x="560" y="664" width="170" height="12" rx="4" fill="#5A4636" />
        <rect x="574" y="700" width="10" height="44" fill="#3A2E2A" />
        <rect x="706" y="700" width="10" height="44" fill="#3A2E2A" />
        <rect x="560" y="686" width="170" height="6" fill="#FFFFFF" />
      </g>
      {range(9).map((i) => (
        <ellipse key={i} cx={780 + i * 28 + (i % 2) * 10} cy={880 - i * 18} rx="7" ry="4" fill="#B4C1D6" />
      ))}
      {/* the sign by the path */}
      <rect x="1225" y="590" width="10" height="150" fill="#3A2E2A" />
      <rect x="1145" y="560" width="170" height="64" rx="6" fill="#F4EFE6" />
      <rect x="1145" y="556" width="170" height="10" rx="5" fill="#FFFFFF" />
      <text x="1230" y="592" textAnchor="middle" fontSize="20" fontWeight="900" fill="#1B2140" fontFamily="'M PLUS Rounded 1c', sans-serif">
        上野公園
      </text>
      <text x="1230" y="614" textAnchor="middle" fontSize="12" fontWeight="800" fill="#6B6F86" fontFamily="Allo, sans-serif" letterSpacing="2">
        WINTER LIGHTS
      </text>
      <Flakes n={70} seed={5} top={0} bottom={880} />
    </>
  )
}

// ── nine years ago: the giant snow-globe set ────────────────────────────

function FilmSet() {
  const r = rand(47)
  return (
    <>
      <Bands colors={['#232C4C', '#2A3557', '#334066', '#3C4A72', '#46557C']} h={720} />
      {/* the park behind, dark, and paper lanterns strung along it */}
      {[60, 300, 1260, 1520].map((x, i) => (
        <BareTree key={i} x={x} y={720} s={1.1 + (i % 2) * 0.2} color="#2A3350" />
      ))}
      {range(14).map((i) => (
        <g key={i}>
          <rect x={i * 118 + 20} y={250 + Math.sin(i) * 12} width="26" height="34" rx="10" fill="#FFB86B" opacity="0.85" />
          <rect x={i * 118 + 26} y={246 + Math.sin(i) * 12} width="14" height="6" fill="#3A2E2A" />
        </g>
      ))}
      <path d="M0 252 Q400 290 800 256 T1600 258" fill="none" stroke="#1C2440" strokeWidth="2" />

      {/* light from the crew's lamps falling on the globe */}
      <polygon points="300,250 340,240 720,700 520,720" fill="#FFF3C8" opacity="0.16" />
      <polygon points="1300,250 1260,240 880,700 1080,720" fill="#FFF3C8" opacity="0.16" />

      {/* the giant snow globe: glass, a tiny snowy park inside, a wooden base */}
      <defs>
        <clipPath id="sb-globe">
          <circle cx="800" cy="440" r="250" />
        </clipPath>
      </defs>
      <circle cx="800" cy="440" r="250" fill="#BBD7EE" opacity="0.4" />
      <g clipPath="url(#sb-globe)">
        <path d="M540 600 Q700 520 820 560 Q940 510 1070 590 L1070 700 L540 700 Z" fill="#FFFFFF" />
        <Pine x={680} y={575} s={0.55} />
        <Pine x={900} y={560} s={0.7} />
        <g>
          <rect x="760" y="500" width="70" height="56" fill="#E9CFB0" />
          <polygon points="748,502 795,462 842,502" fill="#C2525C" />
          <path d="M748 502 L795 462 L842 502 L832 506 L795 474 L758 506 Z" fill="#FFFFFF" />
          <rect x="784" y="522" width="22" height="34" fill="#7A5A4A" />
          <rect x="810" y="514" width="14" height="14" fill="#FFD58A" />
        </g>
        {range(60).map((i) => (
          <circle key={i} className="sb-drift" cx={560 + r() * 480} cy={210 + r() * 380} r={2 + r() * 4} fill="#FFFFFF" opacity={0.6 + r() * 0.4} style={{ animationDelay: `${-r() * 6}s` }} />
        ))}
      </g>
      <circle cx="800" cy="440" r="250" fill="none" stroke="#E8F3FC" strokeWidth="8" />
      <path d="M640 300 Q700 230 790 214" fill="none" stroke="#FFFFFF" strokeWidth="14" strokeLinecap="round" opacity="0.7" />
      <path d="M612 360 Q618 340 628 326" fill="none" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" opacity="0.6" />
      <polygon points="560,640 1040,640 1080,720 520,720" fill="#7A5236" />
      <rect x="520" y="700" width="560" height="22" fill="#5E3F29" />
      <rect x="560" y="652" width="480" height="10" fill="#D9A94A" />
      <rect x="740" y="672" width="120" height="22" rx="4" fill="#F2E3C0" />

      {/* the crew's lights on their stands */}
      {[
        [320, 1],
        [1280, -1],
      ].map(([x, d], i) => (
        <g key={i}>
          <path d={`M${x} 470 L${x - 60} 720 M${x} 470 L${x + 60} 720 M${x} 470 L${x} 720`} stroke="#1E2034" strokeWidth="6" />
          <rect x={x - 6} y="300" width="12" height="180" fill="#1E2034" />
          <g transform={`rotate(${d * 24} ${x} 260)`}>
            <rect x={x - 70} y="210" width="140" height="100" rx="10" fill="#1E2034" />
            <rect x={x - 56} y="222" width="112" height="76" rx="6" fill="#FFF6D8" />
            <path d={`M${x - 70} 210 L${x - 96} 186 M${x + 70} 210 L${x + 96} 186`} stroke="#1E2034" strokeWidth="6" />
          </g>
        </g>
      ))}
      {/* the cue light on its own little pole: the one she blinked at him */}
      <g>
        <rect x="455" y="470" width="8" height="250" fill="#1E2034" />
        <rect x="438" y="440" width="42" height="40" rx="6" fill="#1E2034" />
        <circle cx="459" cy="460" r="13" fill="#FFB43D" />
        <circle cx="459" cy="460" r="30" fill="#FFB43D" opacity="0.22" />
      </g>
      {/* the camera on its tripod, and the director's chair */}
      <g transform="translate(-40 0)">
        <path d="M1150 600 L1095 760 M1150 600 L1205 760 M1150 600 L1150 760" stroke="#1E2034" strokeWidth="7" />
        <rect x="1088" y="520" width="140" height="84" rx="10" fill="#1E2034" />
        <circle cx="1078" cy="562" r="34" fill="#1E2034" />
        <circle cx="1078" cy="562" r="18" fill="#56667E" />
        <circle cx="1120" cy="508" r="26" fill="#1E2034" />
        <circle cx="1184" cy="508" r="26" fill="#1E2034" />
        <circle cx="1210" cy="540" r="6" fill="#FF5A5A" />
      </g>
      <g transform="translate(-150 0)">
        <path d="M1380 640 L1460 770 M1460 640 L1380 770" stroke="#8A6448" strokeWidth="9" />
        <rect x="1366" y="628" width="108" height="16" fill="#1E2034" />
        <rect x="1374" y="560" width="92" height="58" fill="#1E2034" />
        <text x="1420" y="596" textAnchor="middle" fontSize="18" fontWeight="900" fill="#F2E3C0" fontFamily="Allo, sans-serif" letterSpacing="3">
          DIR.
        </text>
      </g>
      {/* the fake snow on the ground, cables snaking across it, a taped mark */}
      <rect x="0" y="720" width="1600" height="180" fill="#EEF2F8" />
      <path d="M0 740 Q300 712 620 736 Q900 712 1200 738 Q1420 716 1600 736 V720 H0 Z" fill="#FFFFFF" />
      <path d="M120 900 Q260 790 459 724" fill="none" stroke="#1E2034" strokeWidth="6" strokeLinecap="round" />
      <path d="M1600 820 Q1400 800 1300 760 Q1220 730 1150 760" fill="none" stroke="#1E2034" strokeWidth="6" strokeLinecap="round" />
      <path d="M770 820 L830 860 M830 820 L770 860" stroke="#F2B33D" strokeWidth="8" strokeLinecap="round" />
      <Flakes n={40} seed={9} top={0} bottom={720} max={3} />
    </>
  )
}

// ── the school gate, a snowy morning ────────────────────────────────────

function School() {
  const cols = 10
  return (
    <>
      <Bands colors={['#BFD8EE', '#C9DEF1', '#D3E4F3', '#DDEAF5', '#E6EFF7']} h={720} />
      {/* mountains far off, snow on their peaks */}
      <polygon points="0,520 180,380 360,500 560,340 760,520 980,360 1200,500 1400,370 1600,480 1600,620 0,620" fill="#C3D3E2" />
      <polygon points="180,380 220,412 196,420 162,414 140,412" fill="#FFFFFF" />
      <polygon points="560,340 610,382 580,392 548,386 512,384" fill="#FFFFFF" />
      <polygon points="980,360 1026,398 996,404 966,398 936,396" fill="#FFFFFF" />
      <polygon points="1400,370 1442,402 1414,410 1384,404 1356,402" fill="#FFFFFF" />
      {/* the school: three floors, a clock, snow along the roof */}
      <rect x="380" y="290" width="840" height="430" fill="#EFE7D8" />
      <rect x="1180" y="290" width="40" height="430" fill="#000" opacity="0.06" />
      <rect x="368" y="276" width="864" height="20" fill="#D6CCBA" />
      <path d="M362 280 Q600 262 800 276 Q1000 260 1238 280 L1238 290 L362 290 Z" fill="#FFFFFF" />
      {range(3).map((row) => (
        <g key={row}>
          <rect x="380" y={430 + row * 96} width="840" height="8" fill="#DDD3C2" />
          {range(cols).map((c) => {
            const x = 408 + c * 80
            const y = 330 + row * 96
            return (
              <g key={c}>
                <rect x={x} y={y} width="58" height="70" fill="#9FC1DC" />
                <polygon points={`${x},${y + 50} ${x + 30},${y} ${x + 46},${y} ${x},${y + 70}`} fill="#C8DDEE" />
                <rect x={x + 27} y={y} width="4" height="70" fill="#EFE7D8" />
                <rect x={x - 3} y={y + 68} width="64" height="6" fill="#FFFFFF" />
              </g>
            )
          })}
        </g>
      ))}
      <rect x="740" y="190" width="120" height="100" fill="#EFE7D8" />
      <polygon points="728,192 800,140 872,192" fill="#8C7E70" />
      <path d="M728 192 L800 140 L872 192 L860 196 L800 154 L740 196 Z" fill="#FFFFFF" />
      <circle cx="800" cy="240" r="32" fill="#FFFFFF" stroke="#8C8478" strokeWidth="5" />
      <path d="M800 240 L800 220 M800 240 L816 248" stroke="#4A4A5A" strokeWidth="4" strokeLinecap="round" />
      <rect x="760" y="640" width="80" height="80" fill="#8C9AAA" />
      <rect x="798" y="640" width="4" height="80" fill="#6E7C8C" />

      {/* bare cherry trees with snow on their branches, and evergreen hedges */}
      <BareTree x={300} y={720} s={1.15} />
      <BareTree x={1310} y={720} s={1.05} />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <ellipse cx={420 + i * 190} cy="712" rx="80" ry="30" fill="#5E8A6E" />
          <ellipse cx={420 + i * 190} cy="696" rx="62" ry="14" fill="#FFFFFF" />
        </g>
      ))}
      {/* the gate: stone pillars with their name plates, a fence along the front */}
      <rect x="0" y="640" width="1600" height="10" fill="#9C978E" />
      {range(40).map((i) => (
        <rect key={i} x={i * 42} y="600" width="8" height="50" fill="#9C978E" />
      ))}
      {[560, 1040].map((x) => (
        <g key={x}>
          <rect x={x - 34} y="500" width="68" height="230" fill="#B7B0A6" />
          <rect x={x - 34} y="500" width="16" height="230" fill="#A39C92" />
          <rect x={x - 42} y="486" width="84" height="20" fill="#C9C2B8" />
          <path d={`M${x - 44} 490 Q${x} 474 ${x + 44} 490 L${x + 42} 496 L${x - 42} 496 Z`} fill="#FFFFFF" />
          <rect x={x - 20} y="540" width="40" height="120" fill="#F4EFE6" />
          {range(5).map((k) => (
            <rect key={k} x={x - 8} y={552 + k * 20} width="16" height="10" fill="#6B6F86" />
          ))}
        </g>
      ))}
      {/* the snowy ground, footprints up to the gate, and a snowman by the pillar */}
      <rect x="0" y="720" width="1600" height="180" fill="#F4F7FB" />
      <path d="M640 900 Q740 780 760 722 L840 722 Q880 800 960 900 Z" fill="#E2E8F0" />
      {range(10).map((i) => (
        <ellipse key={i} cx={790 + (i % 2) * 26 - i * 4} cy={890 - i * 17} rx="8" ry="4" fill="#C7D2E3" />
      ))}
      <g>
        <circle cx="1140" cy="740" r="46" fill="#FFFFFF" />
        <circle cx="1140" cy="672" r="32" fill="#FFFFFF" />
        <path d="M1112 694 Q1140 706 1168 694 L1168 704 Q1140 716 1112 704 Z" fill="#D9535E" />
        <rect x="1160" y="700" width="12" height="30" fill="#D9535E" />
        <circle cx="1130" cy="666" r="3.5" fill="#2E2C38" />
        <circle cx="1150" cy="666" r="3.5" fill="#2E2C38" />
        <polygon points="1140,674 1162,680 1140,684" fill="#F07A3A" />
        <rect x="1118" y="626" width="44" height="16" fill="#2E2C38" />
        <rect x="1124" y="600" width="32" height="30" fill="#2E2C38" />
      </g>
      <Flakes n={50} seed={13} top={0} bottom={720} max={4} />
    </>
  )
}

const SCENES: Record<Backdrop, () => ReactNode> = { lockers: Lockers, street: Street, ueno: Ueno, set: FilmSet, school: School }

export function SceneBg({ kind }: { kind: Backdrop }) {
  const Scene = SCENES[kind]
  return (
    <svg className="qd-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <Scene />
    </svg>
  )
}
