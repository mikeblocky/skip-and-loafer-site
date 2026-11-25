/**
 * The languages the site speaks, and how a choice ("auto" or a code) turns into one of them.
 * Kept free of any other imports so the settings store can use it too.
 */

const ALL_LANGS = [
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh-Hans', name: '简体中文' },
  { code: 'zh-Hant', name: '繁體中文' },
  { code: 'es', name: 'Español' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'th', name: 'ไทย' },
] as const

export type Lang = (typeof ALL_LANGS)[number]['code']

/**
 * Languages switched off for now: their dictionaries stay (and keep type-checking), but they
 * aren't offered in Settings and Auto never picks them. Empty this to bring them back.
 */
const HIDDEN = new Set<Lang>(['ja', 'ko', 'zh-Hans', 'zh-Hant', 'id', 'vi', 'th'])

/** the languages on offer */
export const LANGS = ALL_LANGS.filter((l) => !HIDDEN.has(l.code))
export type LangPref = 'auto' | Lang

const CODES = new Set<string>(ALL_LANGS.map((l) => l.code))
export const isLangPref = (v: unknown): v is LangPref => v === 'auto' || (typeof v === 'string' && CODES.has(v))

/** The best match for one browser language tag, or null. */
function match(tag: string): Lang | null {
  const t = tag.toLowerCase()
  const m = matchAny(t)
  return m && !HIDDEN.has(m) ? m : null
}

function matchAny(t: string): Lang | null {
  if (t.startsWith('zh')) {
    // Traditional for Taiwan, Hong Kong and Macau, or when it says so; Simplified otherwise
    return /hant|-tw|-hk|-mo/.test(t) ? 'zh-Hant' : 'zh-Hans'
  }
  if (t.startsWith('pt')) return 'pt-BR'
  const base = t.split('-')[0]
  if (base === 'in') return 'id' // old code for Indonesian some systems still send
  return CODES.has(base) ? (base as Lang) : null
}

/** What the device asks for, walking its list of preferred languages. */
export function deviceLang(): Lang {
  const list = typeof navigator !== 'undefined' ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : []
  for (const tag of list) {
    const m = tag && match(tag)
    if (m) return m
  }
  return 'en'
}

/** a saved choice of a hidden language is kept, but follows the device until it's back */
export const resolveLang = (pref: LangPref): Lang => (pref === 'auto' || HIDDEN.has(pref) ? deviceLang() : pref)

/**
 * The locale for dates and numbers. English follows the device's own English (so en-GB gets
 * day-month order); the others use the usual locale for that language.
 */
export function localeOf(lang: Lang): string {
  if (lang === 'en') {
    const dev = typeof navigator !== 'undefined' ? navigator.language : ''
    return dev?.toLowerCase().startsWith('en') ? dev : 'en-US'
  }
  const map: Record<Exclude<Lang, 'en'>, string> = {
    ja: 'ja-JP',
    ko: 'ko-KR',
    'zh-Hans': 'zh-CN',
    'zh-Hant': 'zh-TW',
    es: 'es',
    'pt-BR': 'pt-BR',
    fr: 'fr-FR',
    de: 'de-DE',
    id: 'id-ID',
    vi: 'vi-VN',
    th: 'th-TH',
  }
  return map[lang]
}
