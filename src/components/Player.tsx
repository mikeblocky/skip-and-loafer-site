import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Icon } from '../icons'
import { sfx } from '../sfx'
import type { Cue } from '../lyrics'

const fmt = (t: number) => {
  if (!isFinite(t)) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// only one clip plays at a time
const PLAY_EVENT = 'sl-video-play'

export interface PlayerProps {
  src: string
  poster: string
  kind: string
  title: string
  titleJp: string
  artist: string
  artistJp: string
  color: string
  /** timed lyrics, shown Japanese over English */
  subs?: Cue[]
  /**
   * A hidden extra: while this word is being sung, the karaoke ball turns gold and the line
   * can be tapped, which calls onGolden.
   */
  goldenWord?: string
  onGolden?: () => void
}

const SUBS_KEY = 'sl-subs'

/** A plain <video> with our own controls: play, scrub, time, subtitles, mute, fullscreen. */
export function Player({ src, poster, kind, title, titleJp, artist, artistJp, color, subs, goldenWord, onGolden }: PlayerProps) {
  const frame = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(0)
  const [buf, setBuf] = useState(0)
  const [muted, setMuted] = useState(false)
  const scrubbing = useRef(false)
  const [cue, setCue] = useState(-1)
  // how many characters of the current line have been sung (drives the karaoke highlight)
  const [sung, setSung] = useState(0)
  const lastCue = useRef(-1)
  const [subsOn, setSubsOn] = useState(() => {
    try {
      return localStorage.getItem(SUBS_KEY) !== 'off'
    } catch {
      return true
    }
  })
  // controls show while you're touching the video and slip away after a moment of stillness
  const [awake, setAwake] = useState(false)
  const idleTimer = useRef(0)
  /** touch gets longer: there's no hovering finger to keep the controls up */
  const wake = (e?: { pointerType?: string }) => {
    setAwake(true)
    clearTimeout(idleTimer.current)
    const touch = e?.pointerType === 'touch' || e?.pointerType === 'pen'
    idleTimer.current = window.setTimeout(() => setAwake(false), touch ? 4500 : 2200)
  }
  useEffect(() => () => clearTimeout(idleTimer.current), [])

  // timeupdate only fires ~4×/s; follow the frame clock while playing so lines land on the beat
  useEffect(() => {
    if (!subs) return
    const v = video.current
    if (!v) return
    let raf = 0
    const step = () => {
      const now = v.currentTime
      let i = subs.findIndex((c) => now >= c.start && now < c.end)
      if (i < 0) {
        // a short breath between lines: keep the finished line up instead of blinking off
        let prev = -1
        subs.forEach((c, j) => c.end <= now && (prev = j))
        const next = subs[prev + 1]
        if (prev >= 0 && next && next.start - subs[prev].end < 1 && now < next.start) i = prev
      }
      setCue(i)
      if (i >= 0) {
        lastCue.current = i
        const c = subs[i]
        const n = Array.from(c.jp).length
        if (now >= c.end) setSung(n)
        else if (c.k) {
          // real syllable timing
          let sungNow = 0
          for (const [at, count] of c.k) if (now >= at) sungNow = count
          setSung(sungNow)
        } else {
          // no timing given: spread evenly, leaving a short hold on the last note
          const from = c.start + 0.1
          const to = c.end - Math.min(0.7, (c.end - c.start) * 0.22)
          const p = Math.min(1, Math.max(0, (now - from) / (to - from)))
          setSung(Math.min(n, Math.floor(p * n) + (p > 0 ? 1 : 0)))
        }
      }
    }
    const loop = () => {
      step()
      raf = requestAnimationFrame(loop)
    }
    if (playing) loop()
    else step()
    return () => cancelAnimationFrame(raf)
  }, [playing, subs, t])

  /** characters of line i already sung: finished lines stay lit while they fade out */
  const sungIn = (i: number, n: number) => (i === cue ? sung : i <= lastCue.current && i < (cue < 0 ? lastCue.current + 1 : cue) ? n : 0)

  /** golden from the moment the secret word starts being sung until its line ends */
  const isGolden = (i: number) => {
    if (!subs || !goldenWord || i !== cue || !subsOn) return false
    const c = subs[i]
    if (!c.jp.includes(goldenWord)) return false
    const at = Array.from(c.jp.slice(0, c.jp.indexOf(goldenWord))).length
    return sungIn(i, Array.from(c.jp).length) > at
  }
  const catchGolden = () => {
    video.current?.pause()
    // the surprise opens over the page, so leave fullscreen first
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    onGolden?.()
  }

  const toggleSubs = () => {
    const next = !subsOn
    setSubsOn(next)
    sfx.click(next ? 1.1 : 0.9)
    try {
      localStorage.setItem(SUBS_KEY, next ? 'on' : 'off')
    } catch {
      /* private mode */
    }
  }

  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent).detail !== src) video.current?.pause()
    }
    window.addEventListener(PLAY_EVENT, onOther)
    return () => window.removeEventListener(PLAY_EVENT, onOther)
  }, [src])

  const toggle = () => {
    const v = video.current
    if (!v) return
    if (v.paused) {
      window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: src }))
      setStarted(true)
      v.play().catch(() => {})
    } else {
      v.pause()
    }
  }

  const seekTo = (clientX: number) => {
    const v = video.current
    const el = track.current
    if (!v || !el || !dur) return
    const r = el.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    v.currentTime = ratio * dur
    setT(v.currentTime)
  }

  const onTrackDown = (e: React.PointerEvent) => {
    scrubbing.current = true
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    seekTo(e.clientX)
    sfx.tick(1.1)
  }

  const fullscreen = () => {
    const el = frame.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen?.().catch(() => {})
  }

  const pct = dur ? (t / dur) * 100 : 0

  return (
    <figure className={`player${playing ? ' is-playing' : ''}`} style={{ '--c': color } as CSSProperties}>
      <div
        className={`pl-frame${awake ? ' is-awake' : ''}`}
        ref={frame}
        onPointerMove={(e) => e.pointerType === 'mouse' && wake(e)}
        onPointerDown={(e) => wake(e)}
        onKeyDown={() => wake()}
        onPointerLeave={(e) => {
          // a finger lifting off also counts as "leaving"; only a mouse moving away hides them early
          if (e.pointerType !== 'mouse') return
          clearTimeout(idleTimer.current)
          setAwake(false)
        }}
      >
        <video
          ref={video}
          src={src}
          poster={poster}
          preload="metadata"
          playsInline
          // tapping the picture only brings the controls up; pausing is the pause button's job
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
          onTimeUpdate={(e) => !scrubbing.current && setT(e.currentTarget.currentTime)}
          onProgress={(e) => {
            const v = e.currentTarget
            if (v.buffered.length && v.duration) setBuf((v.buffered.end(v.buffered.length - 1) / v.duration) * 100)
          }}
        />
        {subs && subsOn && started && (
          <div className="pl-subs" aria-live="off">
            {subs.map((c, i) => {
              const chars = Array.from(c.jp)
              const k = sungIn(i, chars.length)
              const golden = isGolden(i)
              return (
                <p
                  key={i}
                  className={`pl-line${i === cue ? ' is-on' : ''}${golden ? ' is-golden' : ''}`}
                  aria-hidden={i !== cue}
                  onPointerDown={
                    golden
                      ? (e) => {
                          e.stopPropagation()
                          catchGolden()
                        }
                      : undefined
                  }
                >
                  <span className="pl-jp" lang="ja" aria-label={c.jp}>
                    {(() => {
                      const char = (j: number) => (
                        <span
                          key={j}
                          aria-hidden="true"
                          style={{ '--i': j } as CSSProperties}
                          className={`pl-k${chars[j] === ' ' ? ' is-gap' : ''}${j < k ? ' is-sung' : ''}${i === cue && j === k - 1 && k < chars.length + 1 ? ' is-now' : ''}`}
                        >
                          {chars[j]}
                        </span>
                      )
                      // kanji words sit in a <ruby> with their reading on top; each character
                      // inside still lights up on its own, so the sweep doesn't change
                      const out = []
                      for (let j = 0; j < chars.length; ) {
                        const r = c.ruby?.find(([at]) => at === j)
                        if (!r) {
                          out.push(char(j++))
                          continue
                        }
                        const [at, len, reading] = r
                        const base = []
                        for (let x = at; x < at + len; x++) base.push(char(x))
                        out.push(
                          <ruby key={`r${at}`} className="pl-rb" aria-hidden="true">
                            {base}
                            <rt>
                              <span
                                className={`pl-reading${at < k ? ' is-sung' : ''}${i === cue && k > at && k <= at + len ? ' is-now' : ''}`}
                              >
                                {reading}
                              </span>
                            </rt>
                          </ruby>,
                        )
                        j = at + len
                      }
                      return out
                    })()}
                  </span>
                  <span className="pl-en">{c.en}</span>
                </p>
              )
            })}
          </div>
        )}
        {!started && (
          <button className="pl-big" onClick={toggle} aria-label={`Play ${kind.toLowerCase()}`}>
            <Icon name="play" color="#fff" size={40} />
          </button>
        )}
        <div className="pl-bar">
          <button className="pl-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
            <Icon name={playing ? 'pause' : 'play'} color="#fff" size={20} />
          </button>
          <span className="pl-time">
            {fmt(t)} <i>/</i> {fmt(dur)}
          </span>
          <div
            className="pl-track"
            ref={track}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(dur)}
            aria-valuenow={Math.round(t)}
            tabIndex={0}
            onPointerDown={onTrackDown}
            onPointerMove={(e) => scrubbing.current && seekTo(e.clientX)}
            onPointerUp={() => (scrubbing.current = false)}
            onPointerCancel={() => (scrubbing.current = false)}
            onKeyDown={(e) => {
              const v = video.current
              if (!v) return
              if (e.key === 'ArrowRight') v.currentTime = Math.min(dur, v.currentTime + 5)
              if (e.key === 'ArrowLeft') v.currentTime = Math.max(0, v.currentTime - 5)
            }}
          >
            <span className="pl-buf" style={{ width: `${buf}%` }} />
            <span className="pl-fill" style={{ width: `${pct}%` }} />
            <span className="pl-knob" style={{ left: `${pct}%` }} />
          </div>
          {subs && (
            <button
              className={`pl-btn pl-cc${subsOn ? ' is-on' : ''}`}
              onClick={toggleSubs}
              aria-pressed={subsOn}
              aria-label={subsOn ? 'Hide lyrics' : 'Show lyrics'}
              title={subsOn ? 'Hide lyrics' : 'Show lyrics'}
            >
              CC
            </button>
          )}
          <button
            className="pl-btn"
            onClick={() => {
              const v = video.current
              if (!v) return
              v.muted = !v.muted
              setMuted(v.muted)
            }}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            <Icon name={muted ? 'mute' : 'sound'} color="#fff" size={20} />
          </button>
          <button className="pl-btn" onClick={fullscreen} aria-label="Fullscreen">
            <Icon name="expand" color="#fff" size={18} />
          </button>
        </div>
      </div>
      <figcaption className="pl-cap">
        <span className="pl-kind">{kind}</span>
        <span className="pl-song">
          <b lang="ja">{titleJp}</b>
          <span>{title}</span>
        </span>
        <span className="pl-artist">
          <span lang="ja">{artistJp}</span> · {artist}
        </span>
      </figcaption>
    </figure>
  )
}
