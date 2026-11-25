import { Fragment, type ReactNode } from 'react'
import { settings, useSettings } from '../settings'
import { en, type Dict, type Key } from './en'
import { ja } from './ja'
import { ko } from './ko'
import { zhHans } from './zh-Hans'
import { zhHant } from './zh-Hant'
import { es } from './es'
import { ptBR } from './pt-BR'
import { fr } from './fr'
import { de } from './de'
import { id } from './id'
import { vi } from './vi'
import { th } from './th'
import { LANGS, localeOf, resolveLang, type Lang } from './locale'

/**
 * The site's words in every language it speaks. `t('key')` anywhere, `useT()` in components so
 * they re-render when the language changes. Missing words fall back to English.
 */

export { LANGS, deviceLang, type Lang } from './locale'
export type { Key } from './en'

const DICTS: Record<Lang, Dict> = {
  en,
  ja,
  ko,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
  es,
  'pt-BR': ptBR,
  fr,
  de,
  id,
  vi,
  th,
}

export const currentLang = (): Lang => resolveLang(settings.get().lang)
export const currentLocale = () => localeOf(currentLang())

function fill(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>) {
  // ?? not ||: an empty string is a real translation (a word some languages leave out)
  return fill(DICTS[lang][key] ?? en[key], vars)
}

/** for code outside React (aria labels set once, sounds, etc.) */
export const t = (key: Key, vars?: Record<string, string | number>) => translate(currentLang(), key, vars)

/** `**bold**` → <b>bold</b>; everything else stays text */
export function rich(s: string): ReactNode {
  return s.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : <Fragment key={i}>{part}</Fragment>))
}

/**
 * A translated line with a piece of markup dropped in where its `{slot}` is, e.g.
 * slot(t('game.points'), 'n', <em>120</em>) → <em>120</em> points (or 120点, or 120 Punkte).
 */
export function slot(s: string, name: string, node: ReactNode): ReactNode {
  const [a, b = ''] = s.split(`{${name}}`)
  return (
    <>
      {a}
      {node}
      {b}
    </>
  )
}

/** in components: the translate function, the language, and its locale for dates and numbers */
export function useT() {
  const { lang: pref } = useSettings()
  const lang = resolveLang(pref)
  return {
    t: (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars),
    lang,
    locale: localeOf(lang),
  }
}

/** a language's name in its own language, e.g. "日本語" */
export const langName = (code: Lang) => LANGS.find((l) => l.code === code)?.name ?? code

export { monthName, dayMonth, monthYear, serverText } from './format'
