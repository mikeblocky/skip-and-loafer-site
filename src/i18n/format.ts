import type { Key } from './en'

/**
 * Dates, months and server messages in the reader's language. Dates go through Intl, so each
 * language gets its own order and month names ("3 March", "3月3日", "3 de marzo").
 */

// a leap year, so 29 February works too
const on = (m: number, d = 1, y = 2000) => new Date(y, m - 1, d, 12)

export const monthName = (m: number, locale: string, month: 'long' | 'short' = 'long') =>
  on(m).toLocaleDateString(locale, { month })

export const dayMonth = (m: number, d: number, locale: string, month: 'long' | 'short' = 'long') =>
  on(m, d).toLocaleDateString(locale, { month, day: 'numeric' })

export const monthYear = (y: number, m: number, locale: string) => on(m, 1, y).toLocaleDateString(locale, { month: 'long', year: 'numeric' })

/**
 * The API answers in English (the server doesn't know the reader's language), so known
 * messages are swapped for their translation; anything else is shown as it came.
 */
const SERVER: Record<string, Key> = {
  'write a little more first': 'err.short',
  'no code or HTML, please': 'err.markup',
  'no links, please': 'err.link',
  'no emails, handles or socials': 'err.handle',
  'no phone numbers or addresses': 'err.phone',
  'please keep it friendly': 'err.hostile',
  'couldn’t reach the mailbox, try again later': 'err.mailbox',
  'too many tries, wait a minute': 'err.tooMany',
  'refresh the page and try again': 'err.refresh',
  'you’ve sent a lot, try again in a few minutes': 'err.sentLots',
  'could not save': 'err.save',
  'leaderboard unavailable': 'err.board',
  'type a name': 'err.name',
  'that score looks off': 'err.score',
  'slow down a little': 'err.slow',
  'that’s plenty of gifts from you': 'santa.err.limit',
  'the box is closed for now': 'santa.err.closed',
  'no peeking until it bursts': 'santa.err.peek',
  'that file isn’t a picture we can use': 'santa.err.notPic',
  'that picture is too big': 'santa.err.picBig',
  'that picture didn’t make it, try adding it again': 'santa.err.picLost',
  'pictures aren’t switched on yet': 'santa.err.picsOff',
}

export function serverText(msg: string, t: (k: Key, vars?: Record<string, string | number>) => string) {
  const k = SERVER[msg]
  if (k) return t(k)
  const long = /^keep it under (\d+) characters$/.exec(msg)
  if (long) return t('err.long', { n: long[1] })
  return msg
}
