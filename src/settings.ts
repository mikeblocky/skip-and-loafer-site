import { useSyncExternalStore } from 'react'
import { isLangPref, localeOf, resolveLang, type LangPref } from './i18n/locale'
import { quest, shimaCursorUnlocked } from './quest'

/**
 * Everyone's own settings for the site, kept on this device. One small store: read it anywhere
 * with `settings.get()`, follow it in React with `useSettings()`, change it with `settings.set()`.
 * Things that are pure CSS (text size, contrast, font, spacing, motion, cursors…) are mirrored
 * onto <html> as data attributes so the stylesheets can follow them; see styles/settings.css.
 * Colour filters go on <html> as a CSS filter.
 * Mute stays where it always was, in sfx (its own `sl-sound` key).
 */

export type Motion = 'system' | 'reduce' | 'full'
export type TextSize = 'normal' | 'large' | 'larger'
export type Font = 'site' | 'plain' | 'readable'
/** 'auto' uses the language's usual clock (12-hour in English, 24-hour in Japanese, German…) */
export type Clock = 'auto' | '12h' | '24h'
export type Zone = 'both' | 'jst' | 'local'
/**
 * Colour vision types, grouped the way eye doctors group them: the "-anomaly" kinds have a cone
 * that's weak, the "-anopia" kinds are missing one, and the monochromacies see little or no colour.
 */
export type ColorFilter =
  | 'none'
  | 'deuteranomaly'
  | 'deutan'
  | 'protanomaly'
  | 'protan'
  | 'tritanomaly'
  | 'tritan'
  | 'achroma'
  | 'bluecone'

export const COLOR_FILTERS: { group: string; options: { v: ColorFilter; label: string }[] }[] = [
  {
    group: 'Red–green',
    options: [
      { v: 'deuteranomaly', label: 'Deuteranomaly (green-weak, most common)' },
      { v: 'deutan', label: 'Deuteranopia (no green)' },
      { v: 'protanomaly', label: 'Protanomaly (red-weak)' },
      { v: 'protan', label: 'Protanopia (no red)' },
    ],
  },
  {
    group: 'Blue–yellow',
    options: [
      { v: 'tritanomaly', label: 'Tritanomaly (blue-weak)' },
      { v: 'tritan', label: 'Tritanopia (no blue)' },
    ],
  },
  {
    group: 'Little or no colour',
    options: [
      { v: 'achroma', label: 'Achromatopsia (no colour)' },
      { v: 'bluecone', label: 'Blue cone monochromacy' },
    ],
  },
]
const FILTER_IDS = new Set<string>(['none', ...COLOR_FILTERS.flatMap((g) => g.options.map((o) => o.v))])
export type Saturation = 'normal' | 'soft' | 'muted'
export type Spacing = 'normal' | 'wide' | 'wider'
export type Leading = 'normal' | 'relaxed' | 'loose'

export interface Settings {
  /** 0..1, multiplies everything below */
  master: number
  sfx: number
  music: number
  /** the OP/ED videos on the Anime page */
  karaoke: number
  /** the little blips on hover and ticks while scrolling */
  ticks: boolean
  /** the clack each time a countdown digit flips */
  clacks: boolean
  motion: Motion
  skipIntro: boolean
  /** the coloured pop wherever you click */
  bursts: boolean
  textSize: TextSize
  contrast: boolean
  font: Font
  /** the site's drawn cursors, or the system's own */
  cursors: boolean
  /** which drawn set: the site's icons, or the Shima prototype */
  cursorStyle: 'drawn' | 'shima'
  furigana: boolean
  lyrics: boolean
  /** the line under the Japanese lyrics: 'auto' (the site's language), 'off', or a language code */
  lyricsLang: string
  clock: Clock
  zone: Zone
  /** colour-blind help: shifts colours people can't tell apart into ones they can */
  colorFilter: ColorFilter
  /** tones the bright colours down */
  saturation: Saturation
  underline: boolean
  bigCursor: boolean
  letterSpacing: Spacing
  lineSpacing: Leading
  /** a band that follows the pointer (or keyboard focus) and dims the rest of the page */
  ruler: boolean
  /** hides the floating characters and doodles behind the pages */
  calm: boolean
  /** what's new waits for its button instead of opening by itself */
  quietNews: boolean
  /**
   * "Snow on the Site", the Secret Santa theme, as the site's music: the reward for finishing
   * part 1 (it only plays once the Key of Ueno is found; this lets people turn it off again)
   */
  santaTheme: boolean
  /** the other Secret Santa reward: snow falling over the site, every visit after part 1 */
  santaSnow: boolean
  /** part 2's reward: snow lying along the bottom of every page */
  santaScene: boolean
  /**
   * Which Skipmas 2026 song is the site's music (once part 2 is done): "Straight Again", the
   * jolly version from the end of part 2, or part 1's "Snow on the Site"
   */
  santaSong: 'straight' | 'snow'
  /** characters (by id) and doodle kinds (by icon name) left off the page */
  hiddenChars: string[]
  hiddenIcons: string[]
  /** the rainbow rings behind everything */
  rings: boolean
  /** 'auto' follows the device */
  lang: LangPref
}

export const KEY = 'sl-settings'

/** read an old on/off key from before this store existed, so nobody loses a choice they made */
const legacy = (k: string) => {
  try {
    return localStorage.getItem(k) !== 'off'
  } catch {
    return true
  }
}

export const DEFAULTS: Settings = {
  master: 1,
  sfx: 1,
  music: 1,
  karaoke: 1,
  ticks: true,
  clacks: true,
  motion: 'system',
  skipIntro: false,
  bursts: true,
  textSize: 'normal',
  contrast: false,
  font: 'site',
  cursors: true,
  cursorStyle: 'drawn',
  furigana: true,
  lyrics: true,
  clock: 'auto',
  zone: 'both',
  colorFilter: 'none',
  saturation: 'normal',
  underline: false,
  bigCursor: false,
  letterSpacing: 'normal',
  lineSpacing: 'normal',
  ruler: false,
  calm: false,
  quietNews: false,
  santaTheme: true,
  santaSnow: true,
  santaScene: true,
  santaSong: 'straight',
  hiddenChars: [],
  hiddenIcons: [],
  rings: true,
  lang: 'auto',
  lyricsLang: 'auto',
}

function load(): Settings {
  const base = { ...DEFAULTS, furigana: legacy('sl-furigana'), lyrics: legacy('sl-subs') }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const saved = JSON.parse(raw) as Partial<Settings>
    const out = { ...base }
    // only take values that still look like the right type
    for (const k of Object.keys(DEFAULTS) as (keyof Settings)[]) {
      if (k in saved && typeof saved[k] === typeof DEFAULTS[k]) (out as Record<string, unknown>)[k] = saved[k]
    }
    // lists must really be lists of names
    for (const k of ['hiddenChars', 'hiddenIcons'] as const) {
      const v = out[k] as unknown
      out[k] = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
    }
    if (!isLangPref(out.lang)) out.lang = 'auto'
    if (out.lyricsLang !== 'off' && !isLangPref(out.lyricsLang)) out.lyricsLang = 'auto'
    // the old single "Greyscale" choice is now Achromatopsia; anything unknown goes back to off
    if ((out.colorFilter as string) === 'grey') out.colorFilter = 'achroma'
    if (!FILTER_IDS.has(out.colorFilter)) out.colorFilter = 'none'
    if (out.cursorStyle !== 'shima') out.cursorStyle = 'drawn'
    return out
  } catch {
    return base
  }
}

let state = load()
const listeners = new Set<() => void>()

const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null

/** Less motion: on if asked for here, or left to the system and the system asks for it. */
export const reducedMotion = () => (state.motion === 'system' ? !!mq?.matches : state.motion === 'reduce')

/**
 * The Plain and Easy-read fonts ship with the site (Fontsource) but only download when someone
 * picks one, so nobody else pays for them.
 */
const FONTS: Record<Exclude<Font, 'site'>, () => Promise<unknown>> = {
  plain: () => import('@fontsource-variable/inter'),
  readable: () => import('@fontsource-variable/atkinson-hyperlegible-next'),
}

/**
 * Colour-blind correction ("daltonizing"): simulate what's lost for each kind of colour
 * blindness (Machado et al. 2009: full strength for the -anopias, severity 0.6 for the
 * -anomalies) and shift that difference into channels that are still seen. Precomputed as one
 * colour matrix each: I + E(I - S).
 */
const DALTON: Record<'protan' | 'protanomaly' | 'deutan' | 'deuteranomaly' | 'tritan' | 'tritanomaly', string> = {
  protan: '1 0 0 0 0  0.4789 0.4769 0.0442 0 0  0.5973 -0.6887 1.0914 0 0  0 0 0 1 0',
  protanomaly: '1 0 0 0 0  0.3297 0.6319 0.0384 0 0  0.4376 -0.5161 1.0785 0 0  0 0 0 1 0',
  deutan: '1 0 0 0 0  0.1628 0.725 0.1122 0 0  0.4547 -0.6454 1.1907 0 0  0 0 0 1 0',
  deuteranomaly: '1 0 0 0 0  0.1351 0.7928 0.0721 0 0  0.3272 -0.4527 1.1255 0 0  0 0 0 1 0',
  tritan: '0.7412 -0.4072 0.666 0 0  0.0751 0.5852 0.3397 0 0  0 0 1 0 0  0 0 0 1 0',
  tritanomaly: '0.8941 -0.1759 0.2818 0 0  0.0312 0.8058 0.163 0 0  0 0 1 0 0  0 0 0 1 0',
}
/**
 * There's no colour to shift for the monochromacies, so these help the way that's left: clear
 * light-dark contrast. Achromatopsia also comes with strong light sensitivity, so it's dimmed a
 * little; blue cone monochromacy usually means blurrier sight, so it gets more contrast instead.
 */
const MONO: Record<'achroma' | 'bluecone', string> = {
  achroma: 'grayscale(1) contrast(1.2) brightness(0.9)',
  bluecone: 'grayscale(1) contrast(1.35)',
}

/** the filters live in a hidden <svg> in the page; made once, the first time they're needed */
function ensureFilters() {
  if (document.getElementById('sl-filters')) return
  const NS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(NS, 'svg')
  svg.id = 'sl-filters'
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden')
  for (const [k, m] of Object.entries(DALTON)) {
    const f = document.createElementNS(NS, 'filter')
    f.id = `sl-${k}`
    const cm = document.createElementNS(NS, 'feColorMatrix')
    cm.setAttribute('type', 'matrix')
    cm.setAttribute('values', m)
    f.appendChild(cm)
    svg.appendChild(f)
  }
  document.body.appendChild(svg)
}

/** One CSS filter for the whole page. On <html> it doesn't upset anything fixed-position. */
export function pageFilter(st: Pick<Settings, 'colorFilter' | 'saturation'> = state) {
  const parts: string[] = []
  const f = st.colorFilter
  if (f === 'achroma' || f === 'bluecone') parts.push(MONO[f])
  else if (f !== 'none') parts.push(`url(#sl-${f})`)
  if (st.saturation === 'soft') parts.push('saturate(0.65)')
  if (st.saturation === 'muted') parts.push('saturate(0.35)')
  return parts.join(' ')
}

/**
 * The drawn cursors, half as big again: same pictures, bigger box, hotspot moved to match.
 * Shima's cursors are pictures, not SVGs, so their bigger size lives in styles/settings.css.
 */
const CURSORS = ['--cur', '--cur-pointer', '--cur-grab', '--cur-grabbing']
let cursorSrc: Record<string, string> | null = null
function bigCursors(on: boolean, shima: boolean) {
  const r = document.documentElement
  CURSORS.forEach((v) => r.style.removeProperty(v))
  // Shima's set grows in styles/settings.css instead
  if (!on || shima) return
  if (!cursorSrc) {
    // read the plain drawn set, whichever set is showing right now
    const was = r.dataset.cursor
    r.dataset.cursor = 'site'
    const cs = getComputedStyle(r)
    cursorSrc = Object.fromEntries(CURSORS.map((v) => [v, cs.getPropertyValue(v).trim()]))
    r.dataset.cursor = was
  }
  for (const v of CURSORS) {
    const big = cursorSrc[v]
      .replace('width="32" height="32"', 'width="48" height="48"')
      .replace(/\) (\d+) (\d+),/, (_m, x, y) => `) ${Math.round(x * 1.5)} ${Math.round(y * 1.5)},`)
    r.style.setProperty(v, big)
  }
}

/** Shima's cursors only once they've been earned (a saved choice of them waits until then) */
const shimaCursor = () => state.cursorStyle === 'shima' && shimaCursorUnlocked()

function apply() {
  if (state.font !== 'site') FONTS[state.font]().catch(() => {})
  const r = document.documentElement
  r.dataset.motion = reducedMotion() ? 'reduce' : 'full'
  r.dataset.text = state.textSize
  r.dataset.contrast = state.contrast ? 'more' : 'normal'
  r.dataset.font = state.font
  r.dataset.cursor = !state.cursors ? 'system' : shimaCursor() ? 'shima' : 'site'
  r.dataset.bigCursor = state.cursors && state.bigCursor ? 'on' : 'off'
  r.dataset.spacing = state.letterSpacing
  r.dataset.leading = state.lineSpacing
  r.dataset.links = state.underline ? 'underline' : 'normal'
  r.dataset.calm = state.calm ? 'on' : 'off'
  r.dataset.rings = state.rings ? 'on' : 'off'
  // screen readers, fonts and hyphenation all follow this
  r.lang = resolveLang(state.lang)
  if (state.colorFilter in DALTON) ensureFilters()
  r.style.filter = pageFilter()
  bigCursors(state.cursors && state.bigCursor, shimaCursor())
}
// the moment Shima's cursors are earned, a saved choice of them takes effect
quest.subscribe(() => apply())

export const settings = {
  get: () => state,
  set(patch: Partial<Settings>) {
    state = { ...state, ...patch }
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* private mode: it lasts until the tab closes */
    }
    apply()
    listeners.forEach((l) => l())
  },
  reset() {
    try {
      localStorage.removeItem(KEY)
      localStorage.removeItem('sl-furigana')
      localStorage.removeItem('sl-subs')
    } catch {
      /* ignored */
    }
    settings.set({ ...DEFAULTS })
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => void listeners.delete(l)
  },
}

if (typeof document !== 'undefined') {
  apply()
  // "follow the system" follows it live
  mq?.addEventListener?.('change', () => {
    apply()
    listeners.forEach((l) => l())
  })
}

export function useSettings() {
  return useSyncExternalStore(settings.subscribe, settings.get)
}

/** Formats a release time the way this person asked for (12/24h), in a given zone. */
export function formatTime(t: number, tz?: string) {
  return new Intl.DateTimeFormat(localeOf(resolveLang(state.lang)), {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    // Japanese write midnight on a 12-hour clock as 午前0時, not 午前12時
    hourCycle: state.clock === 'auto' ? undefined : state.clock === '24h' ? 'h23' : resolveLang(state.lang) === 'ja' ? 'h11' : 'h12',
  }).format(t)
}
