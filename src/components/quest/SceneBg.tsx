/**
 * Painted backdrops for the talk scenes. Flat shapes and flat colours only (like the rest of the
 * site), drawn on a 1600×900 stage that crops to fill any screen from the bottom up, so the
 * floor always meets the characters' feet.
 */
export type Backdrop = 'lockers' | 'street' | 'ueno' | 'set' | 'school'

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

function Lockers() {
  const cols = 15
  const w = 1600 / cols
  return (
    <>
      <rect width="1600" height="900" fill="#ECE6D8" />
      {/* a long window along the top, winter-white outside */}
      <rect x="0" y="70" width="1600" height="160" fill="#DDE7EE" />
      {range(9).map((i) => (
        <rect key={i} x={i * 200 - 6} y="70" width="12" height="160" fill="#C9BFAE" />
      ))}
      <rect x="0" y="146" width="1600" height="8" fill="#C9BFAE" />
      <rect x="0" y="230" width="1600" height="14" fill="#C9BFAE" />
      {/* the shoe lockers, five rows of little doors */}
      {range(cols).map((c) =>
        range(5).map((r) => {
          const x = c * w + 4
          const y = 300 + r * 92
          const open = c === 6 && r === 2
          return (
            <g key={`${c}-${r}`}>
              <rect x={x} y={y} width={w - 8} height="84" fill={open ? '#6F7C86' : '#B9C6CE'} stroke="#8E9BA4" strokeWidth="2" />
              {open ? (
                <>
                  {/* Mitsumi's, door open, the envelope inside */}
                  <rect x={x + 18} y={y + 30} width="54" height="36" fill="#FFFDF7" stroke="#8E9BA4" strokeWidth="2" />
                  <path d={`M${x + 18} ${y + 30} l27 18 l27 -18`} fill="none" stroke="#8E9BA4" strokeWidth="2" />
                  <circle cx={x + 45} cy={y + 50} r="6" fill="#9FB6D8" />
                  <rect x={x + w - 14} y={y - 4} width="18" height="92" fill="#C7D2D9" stroke="#8E9BA4" strokeWidth="2" />
                </>
              ) : (
                <>
                  <rect x={x + 10} y={y + 10} width="34" height="12" fill="#F4F1EA" />
                  <rect x={x + w - 30} y={y + 38} width="8" height="18" rx="3" fill="#8E9BA4" />
                </>
              )}
            </g>
          )
        }),
      )}
      <rect x="0" y="760" width="1600" height="140" fill="#C8B79B" />
      <rect x="0" y="760" width="1600" height="10" fill="#B3A284" />
      {range(8).map((i) => (
        <rect key={i} x={i * 210 + 40} y="800" width="120" height="6" rx="3" fill="#B3A284" />
      ))}
    </>
  )
}

function Street() {
  const poles = [250, 900, 1450]
  return (
    <>
      <rect width="1600" height="900" fill="#F2C29A" />
      <circle cx="1180" cy="430" r="96" fill="#F8DDB0" />
      {/* far town, then the houses on the way home */}
      {[
        [0, 520, 180, 260],
        [170, 470, 140, 310],
        [300, 540, 210, 240],
        [1240, 500, 160, 280],
        [1380, 450, 220, 330],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill="#C99A8C" />
      ))}
      {[
        [480, 560, 260],
        [760, 590, 230],
        [1010, 570, 250],
      ].map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={780 - y} fill="#8E7486" />
          <polygon points={`${x - 20},${y} ${x + w / 2},${y - 80} ${x + w + 20},${y}`} fill="#6E5868" />
          <rect x={x + 40} y={y + 50} width="46" height="40" fill="#F8DDB0" />
          <rect x={x + w - 90} y={y + 50} width="46" height="40" fill="#F3C98E" />
        </g>
      ))}
      {/* telephone poles and their sagging wires */}
      {poles.map((x) => (
        <g key={x}>
          <rect x={x - 7} y="180" width="14" height="600" fill="#4A3F52" />
          <rect x={x - 60} y="230" width="120" height="10" fill="#4A3F52" />
          <rect x={x - 40} y="290" width="80" height="8" fill="#4A3F52" />
        </g>
      ))}
      {[0, 1].map((k) =>
        [
          [-100, 250],
          [250, 900],
          [900, 1450],
          [1450, 1800],
        ].map(([a, b], i) => (
          <path
            key={`${k}-${i}`}
            d={`M${a} ${236 + k * 58} Q${(a + b) / 2} ${290 + k * 58} ${b} ${236 + k * 58}`}
            fill="none"
            stroke="#4A3F52"
            strokeWidth="2.5"
          />
        )),
      )}
      <rect x="0" y="780" width="1600" height="120" fill="#B39EA3" />
      <rect x="0" y="780" width="1600" height="14" fill="#CDB8B6" />
      {range(7).map((i) => (
        <rect key={i} x={i * 240 + 60} y="840" width="120" height="8" fill="#CDB8B6" />
      ))}
    </>
  )
}

function Ueno() {
  const trees = [
    [120, 300],
    [470, 260],
    [1120, 280],
    [1480, 320],
  ]
  // strings of lights looping from tree to tree
  const strands = [
    [-60, 330, 470, 300, 520],
    [470, 300, 1120, 320, 470],
    [1120, 320, 1680, 340, 520],
    [120, 420, 1480, 430, 640],
  ]
  const LIGHTS = ['#FFD36B', '#FF9FBE', '#9FDBFF', '#FFF3C4']
  return (
    <>
      <rect width="1600" height="900" fill="#1B2140" />
      <circle cx="800" cy="140" r="46" fill="#E8E4D0" />
      <circle cx="822" cy="128" r="40" fill="#1B2140" />
      {trees.map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 14} y={y + 60} width="28" height={720 - y - 60} fill="#0F1530" />
          <circle cx={x} cy={y} r="120" fill="#141B3A" />
          <circle cx={x - 90} cy={y + 60} r="80" fill="#141B3A" />
          <circle cx={x + 90} cy={y + 50} r="86" fill="#141B3A" />
          {/* lights wound through the bare branches */}
          {range(14).map((k) => (
            <circle
              key={k}
              className="sb-light"
              cx={x + Math.cos(k * 2.4) * (40 + (k % 4) * 25)}
              cy={y + Math.sin(k * 2.4) * (30 + (k % 3) * 22) + 20}
              r="5"
              fill={LIGHTS[k % LIGHTS.length]}
              style={{ animationDelay: `${(k * 0.37 + i) % 3}s` }}
            />
          ))}
        </g>
      ))}
      {strands.map(([x1, y1, x2, y2, sag], i) => {
        const pts = range(16).map((k) => {
          const t = k / 15
          const x = x1 + (x2 - x1) * t
          const y = y1 + (y2 - y1) * t + Math.sin(Math.PI * t) * (sag - Math.max(y1, y2))
          return [x, y]
        })
        return (
          <g key={i}>
            <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#2B335E" strokeWidth="2" />
            {pts.map(([x, y], k) => (
              <circle key={k} className="sb-light" cx={x} cy={y + 6} r="6" fill={LIGHTS[(k + i) % LIGHTS.length]} style={{ animationDelay: `${(k * 0.29 + i * 0.5) % 3}s` }} />
            ))}
          </g>
        )
      })}
      {/* the sign by the path */}
      <rect x="1290" y="560" width="10" height="170" fill="#3A2E2A" />
      <rect x="1210" y="540" width="170" height="64" rx="6" fill="#F4EFE6" />
      <text x="1295" y="570" textAnchor="middle" fontSize="20" fontWeight="900" fill="#1B2140" fontFamily="'M PLUS Rounded 1c', sans-serif">
        上野公園
      </text>
      <text x="1295" y="592" textAnchor="middle" fontSize="12" fontWeight="800" fill="#6B6F86" fontFamily="Allo, sans-serif" letterSpacing="2">
        WINTER LIGHTS
      </text>
      <rect x="0" y="720" width="1600" height="180" fill="#E6ECF4" />
      <path d="M560 900 Q760 760 980 720 L1080 720 Q900 790 860 900 Z" fill="#D3DCE8" />
    </>
  )
}

function FilmSet() {
  return (
    <>
      <rect width="1600" height="900" fill="#DCE6EE" />
      {/* bare winter trees in the park */}
      {[180, 420, 1300, 1500].map((x, i) => (
        <g key={i} stroke="#9A97A6" strokeWidth="10" strokeLinecap="round" fill="none">
          <path d={`M${x} 740 L${x} 330`} />
          <path d={`M${x} 470 L${x - 70} 390 M${x} 420 L${x + 80} 340 M${x} 560 L${x + 60} 500`} strokeWidth="7" />
        </g>
      ))}
      <rect x="0" y="700" width="1600" height="200" fill="#F3F6FA" />
      {/* the crew's lights on their stands */}
      {[
        [640, -1],
        [1080, 1],
      ].map(([x, d], i) => (
        <g key={i}>
          <path d={`M${x} 470 L${x - 50} 720 M${x} 470 L${x + 50} 720 M${x} 470 L${x} 720`} stroke="#3C3A48" strokeWidth="6" />
          <rect x={x - 6} y="330" width="12" height="150" fill="#3C3A48" />
          <rect x={x - 70} y="250" width="140" height="100" rx="10" fill="#3C3A48" transform={`rotate(${d * 14} ${x} 300)`} />
          <rect x={x - 56} y="262" width="112" height="76" rx="6" fill="#FFF6D8" transform={`rotate(${d * 14} ${x} 300)`} />
        </g>
      ))}
      {/* the camera, and the director's chair beside it */}
      <path d="M860 560 L810 730 M860 560 L910 730 M860 560 L860 730" stroke="#2E2C38" strokeWidth="6" />
      <rect x="800" y="480" width="130" height="80" rx="10" fill="#2E2C38" />
      <circle cx="790" cy="520" r="30" fill="#2E2C38" />
      <circle cx="790" cy="520" r="16" fill="#5C6A7E" />
      <circle cx="830" cy="470" r="24" fill="#2E2C38" />
      <circle cx="890" cy="470" r="24" fill="#2E2C38" />
      <path d="M1180 600 L1260 730 M1260 600 L1180 730" stroke="#7A5C44" strokeWidth="8" />
      <rect x="1170" y="590" width="100" height="16" fill="#3C3A48" />
      <rect x="1180" y="520" width="80" height="60" fill="#3C3A48" />
      {/* fake snow piled where the shot was */}
      <path d="M200 760 Q420 690 700 740 Q980 690 1300 760 Z" fill="#FFFFFF" />
    </>
  )
}

function School() {
  const cols = 9
  return (
    <>
      <rect width="1600" height="900" fill="#D6E6F2" />
      {/* the town behind, and the school building with its clock */}
      {[
        [0, 430, 220, 300],
        [180, 470, 160, 260],
        [1380, 440, 220, 290],
      ].map(([x, y, w, h], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} fill="#BCCCDA" />
          <rect x={x} y={y} width={w} height="10" fill="#FFFFFF" />
        </g>
      ))}
      <rect x="430" y="300" width="760" height="420" fill="#EEE6D8" />
      <rect x="420" y="288" width="780" height="18" fill="#FFFFFF" />
      {range(3).map((r) =>
        range(cols).map((c) => (
          <rect key={`${r}-${c}`} x={462 + c * 80} y={350 + r * 100} width="52" height="58" fill="#B9D3E6" stroke="#9FB2C2" strokeWidth="3" />
        )),
      )}
      <rect x="760" y="220" width="100" height="80" fill="#EEE6D8" />
      <rect x="752" y="210" width="116" height="14" fill="#FFFFFF" />
      <circle cx="810" cy="262" r="28" fill="#FFFFFF" stroke="#8C8478" strokeWidth="4" />
      <path d="M810 262 L810 244 M810 262 L824 268" stroke="#4A4A5A" strokeWidth="4" strokeLinecap="round" />
      {/* the gate and the fence along the front */}
      <rect x="0" y="640" width="1600" height="12" fill="#9C978E" />
      {range(40).map((i) => (
        <rect key={i} x={i * 42} y="600" width="8" height="52" fill="#9C978E" />
      ))}
      {[600, 1000].map((x) => (
        <g key={x}>
          <rect x={x - 22} y="520" width="44" height="200" fill="#8E8A96" />
          <rect x={x - 28} y="510" width="56" height="14" fill="#FFFFFF" />
        </g>
      ))}
      <rect x="1030" y="560" width="70" height="90" fill="#F4EFE6" stroke="#8E8A96" strokeWidth="3" />
      {/* snowy trees either side */}
      {[160, 1440].map((x, i) => (
        <g key={i}>
          <rect x={x - 12} y="520" width="24" height="200" fill="#7E6A5C" />
          <circle cx={x} cy="470" r="90" fill="#9DB5A6" />
          <path d={`M${x - 80} 440 Q${x} 370 ${x + 80} 440 Q${x} 410 ${x - 80} 440 Z`} fill="#FFFFFF" />
        </g>
      ))}
      <rect x="0" y="720" width="1600" height="180" fill="#F4F7FB" />
      <path d="M640 900 Q760 780 760 720 L860 720 Q880 800 980 900 Z" fill="#E2E8F0" />
    </>
  )
}

export function SceneBg({ kind }: { kind: Backdrop }) {
  return (
    <svg className="qd-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {kind === 'lockers' && <Lockers />}
      {kind === 'street' && <Street />}
      {kind === 'ueno' && <Ueno />}
      {kind === 'set' && <FilmSet />}
      {kind === 'school' && <School />}
    </svg>
  )
}
