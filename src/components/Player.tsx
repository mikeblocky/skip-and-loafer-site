import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import { gsap } from '../gsap'
import { Icon } from '../icons'
import { sfx } from '../sfx'
import type { Cue } from '../lyrics'
import { reducedMotion, settings, useSettings, type Settings } from '../settings'
import { LANGS, langName, useT } from '../i18n'
import { lyricLangs, lyricsIn, type Song } from '../i18n/lyrics'

const fmt = (t: number) => {
  if (!isFinite(t)) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// only one clip plays at a time
const PLAY_EVENT = 'sl-video-play'
const SPEEDS = [0.75, 1, 1.25]

/** an on/off row in the player's menu */
function Switch({ label, on, onChange, disabled }: { label: string; on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="pl-switch" role="switch" aria-checked={on} disabled={disabled} onClick={onChange}>
      <span>{label}</span>
      <i aria-hidden="true" />
    </button>
  )
}

export interface PlayerProps {
  src: string
  poster: string
  kind: string
  title: string
  titleJp: string
  artist: string
  artistJp: string
  color: string
  /** timed lyrics, shown Japanese over a translation */
  subs?: Cue[]
  /** which song the lyrics are, to find their translations (src/i18n/lyrics.ts) */
  song?: Song
  /**
   * A hidden extra: while this word is being sung, the karaoke ball turns gold and the line
   * can be tapped, which calls onGolden.
   */
  goldenWord?: string
  onGolden?: () => void
}

/**
 * Lyrics and furigana are on/off settings shared with the Settings panel: flipping them here
 * is the same as flipping them there, and it's remembered on this device.
 */
function usePref(key: 'lyrics' | 'furigana') {
  const on = useSettings()[key]
  const toggle = () => {
    sfx.click(!on ? 1.1 : 0.9)
    settings.set({ [key]: !on } as Partial<Settings>)
  }
  return [on, toggle] as const
}

/**
 * A plain <video> with our own controls: play/pause, stop, time, scrub, volume, a settings menu
 * (lyrics, furigana, the translation line's language, speed) and fullscreen.
 */
export function Player({
  src,
  poster,
  kind,
  title,
  titleJp,
  artist,
  artistJp,
  color,
  subs: rawSubs,
  song,
  goldenWord,
  onGolden,
}: PlayerProps) {
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
  const { t: tr, lang, locale } = useT()
  const [subsOn, toggleSubs] = usePref('lyrics')
  const [furiOn, toggleFuri] = usePref('furigana')
  // the karaoke volume (times the master volume) and the translation line, from settings
  const { master, karaoke, lyricsLang } = useSettings()
  useEffect(() => {
    if (video.current) video.current.volume = Math.max(0, Math.min(1, master * karaoke))
  }, [master, karaoke])
  // kept steady between renders: the karaoke effect below watches the cues
  const subs = useMemo(() => (rawSubs && song ? lyricsIn(rawSubs, song, lyricsLang, lang) : rawSubs), [rawSubs, song, lyricsLang, lang])
  const [rate, setRate] = useState(1)
  useEffect(() => {
    if (video.current) video.current.playbackRate = rate
  }, [rate])
  const [full, setFull] = useState(false)
  useEffect(() => {
    const on = () => setFull(!!frame.current && document.fullscreenElement === frame.current)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  // the settings menu: closes on a tap elsewhere or Escape
  const [menu, setMenu] = useState(false)
  // the menu's two pages: the main list, and the translation languages
  const [page, setPage] = useState<'main' | 'tl'>('main')
  useEffect(() => setPage('main'), [menu])
  const menuEl = useRef<HTMLDivElement>(null)
  const gear = useRef<HTMLButtonElement>(null)
  /** the menu shrinks back toward the gear before it goes */
  const closeMenu = () => {
    const el = menuEl.current
    if (!el || reducedMotion()) return setMenu(false)
    gsap.to(el, { autoAlpha: 0, scale: 0.94, y: 8, duration: 0.18, ease: 'power2.in', overwrite: true, onComplete: () => setMenu(false) })
  }
  /** turns to another page of the menu: it slides in from the side you're heading, and the height eases */
  const goPage = (to: 'main' | 'tl', dir: 1 | -1) => {
    const el = menuEl.current
    if (!el) return setPage(to)
    const from = el.offsetHeight
    flushSync(() => setPage(to))
    if (reducedMotion()) return
    gsap.fromTo(el, { height: from }, { height: el.scrollHeight, duration: 0.32, ease: 'power2.inOut', clearProps: 'height' })
    gsap.fromTo(
      el.firstElementChild,
      { x: 26 * dir, autoAlpha: 0 },
      { x: 0, autoAlpha: 1, duration: 0.32, ease: 'power2.out', clearProps: 'all' },
    )
  }
  useEffect(() => {
    if (!menu) return
    const away = (e: PointerEvent) => {
      const el = e.target as Node
      if (!menuEl.current?.contains(el) && !gear.current?.contains(el)) closeMenu()
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      closeMenu()
      gear.current?.focus()
    }
    window.addEventListener('pointerdown', away)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', away)
      window.removeEventListener('keydown', esc)
    }
  }, [menu])
  const tlOptions = [
    { v: 'auto', label: tr('pl.tlAuto', { name: langName(lang) }) },
    ...lyricLangs(LANGS.map((l) => l.code)).map((c) => ({
      v: c as string,
      label: langName(c),
    })),
    { v: 'off', label: tr('pl.tlOff') },
  ]
  const hasFuri = !!subs?.some((c) => c.ruby?.length)
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

  /** back to the start, poster and big play button included */
  const stop = () => {
    const v = video.current
    if (!v) return
    v.pause()
    v.currentTime = 0
    v.load()
    setT(0)
    setCue(-1)
    setSung(0)
    lastCue.current = -1
    setStarted(false)
    setMenu(false)
    sfx.click(0.9)
  }

  const level = muted ? 0 : karaoke
  const setVolume = (x: number) => {
    const v = video.current
    if (v && x > 0 && v.muted) {
      v.muted = false
      setMuted(false)
    }
    settings.set({ karaoke: x })
  }
  const toggleMute = () => {
    const v = video.current
    if (!v) return
    // muting at zero volume brings a usable volume back instead
    if (!v.muted && karaoke === 0) return setVolume(0.6)
    v.muted = !v.muted
    setMuted(v.muted)
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
        className={`pl-frame${awake || menu ? ' is-awake' : ''}`}
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
          <div className={`pl-subs${hasFuri && !furiOn ? ' no-furi' : ''}`} aria-live="off">
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
                      for (let j = 0; j < chars.length;) {
                        const r = furiOn ? c.ruby?.find(([at]) => at === j) : undefined
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
                  {c.en && <span className="pl-en">{c.en}</span>}
                </p>
              )
            })}
          </div>
        )}
        {!started && (
          <button
            className="pl-big"
            onClick={toggle}
            aria-label={tr('pl.playKind', {
              kind: lang === 'en' ? kind.toLowerCase() : kind,
            })}
          >
            <Icon name="play" color="#fff" size={40} />
          </button>
        )}
        {menu && (
          <div className="pl-menu" ref={menuEl} role="dialog" aria-label={tr('pl.settings')}>
            {page === 'tl' ? (
              <div className="pl-page pl-menu-group" role="radiogroup" aria-label={tr('pl.translation')}>
                <button type="button" className="pl-opt pl-back" onClick={() => goPage('main', -1)} autoFocus>
                  <Icon name="chev" color="currentColor" size={16} />
                  <span>{tr('pl.translation')}</span>
                </button>
                {tlOptions.map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    role="radio"
                    aria-checked={lyricsLang === o.v}
                    className={`pl-opt${lyricsLang === o.v ? ' is-on' : ''}`}
                    onClick={() => {
                      sfx.click(1.05)
                      settings.set({ lyricsLang: o.v })
                      goPage('main', -1)
                    }}
                  >
                    <span>{o.label}</span>
                    {lyricsLang === o.v && <Icon name="check" color="currentColor" size={16} />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="pl-page">
                {subs && (
                  <>
                    <Switch label={tr('kar.lyrics')} on={subsOn} onChange={toggleSubs} />
                    {hasFuri && <Switch label={tr('kar.furigana')} on={furiOn} onChange={toggleFuri} disabled={!subsOn} />}
                    <button type="button" className="pl-opt pl-more" disabled={!subsOn} onClick={() => goPage('tl', 1)}>
                      <span>{tr('pl.translation')}</span>
                      {/* just the language here; the page itself spells out "site language (…)" */}
                      <small>{lyricsLang === 'auto' ? langName(lang) : (tlOptions.find((o) => o.v === lyricsLang)?.label ?? '')}</small>
                      <Icon name="chev" color="currentColor" size={16} />
                    </button>
                  </>
                )}
                <div className="pl-menu-group" role="radiogroup" aria-label={tr('pl.speed')}>
                  <span className="pl-menu-title">{tr('pl.speed')}</span>
                  <div className="pl-speeds">
                    {SPEEDS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={rate === r}
                        className={`pl-speed${rate === r ? ' is-on' : ''}`}
                        onClick={() => {
                          sfx.click(1.05)
                          setRate(r)
                        }}
                      >
                        {r === 1 ? tr('pl.normal') : `${r.toLocaleString(locale)}×`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="pl-bar">
          <button className="pl-btn" onClick={toggle} aria-label={tr(playing ? 'pl.pause' : 'pl.play')}>
            <Icon name={playing ? 'pause' : 'play'} color="#fff" size={20} />
          </button>
          {started && (
            <button className="pl-btn" onClick={stop} aria-label={tr('pl.stop')} title={tr('pl.stop')}>
              <Icon name="stop" color="#fff" size={17} />
            </button>
          )}
          <span className="pl-time">
            {fmt(t)} <i>/</i> {fmt(dur)}
          </span>
          <div
            className="pl-track"
            ref={track}
            role="slider"
            aria-label={tr('pl.seek')}
            aria-valuemin={0}
            aria-valuemax={Math.round(dur)}
            aria-valuenow={Math.round(t)}
            aria-valuetext={`${fmt(t)} / ${fmt(dur)}`}
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
          <div className="pl-vol">
            <button className="pl-btn" onClick={toggleMute} aria-label={tr(muted || karaoke === 0 ? 'pl.unmute' : 'pl.mute')}>
              <Icon name={level === 0 ? 'mute' : level < 0.5 ? 'soundLow' : 'sound'} color="#fff" size={20} />
            </button>
            <input
              type="range"
              className="pl-vol-range"
              min={0}
              max={1}
              step={0.05}
              value={level}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label={tr('pl.volume')}
              aria-valuetext={`${Math.round(level * 100)}%`}
              style={{ '--v': `${level * 100}%` } as CSSProperties}
            />
          </div>
          <button
            ref={gear}
            className={`pl-btn pl-gear${menu ? ' is-on' : ''}`}
            onClick={() => {
              sfx.click(menu ? 0.9 : 1.1)
              if (menu) closeMenu()
              else setMenu(true)
            }}
            aria-label={tr('pl.settings')}
            aria-expanded={menu}
            aria-haspopup="dialog"
          >
            <Icon name="gear" color="#fff" size={19} />
          </button>
          <button className="pl-btn" onClick={fullscreen} aria-label={tr(full ? 'pl.exitFull' : 'pl.full')}>
            <Icon name={full ? 'shrink' : 'expand'} color="#fff" size={18} />
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
