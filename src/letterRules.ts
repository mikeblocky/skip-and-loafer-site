/**
 * What a letter in the Message tab may contain. Shared by the page (instant feedback while you
 * write) and by api/messages.ts (the real check), so both always agree.
 */

export const LETTER_MAX = 500
export const LETTER_MIN = 8
export const NAME_MAX = 16

export const STATIONERY = ['#F53D84', '#246BE8', '#FBBA14', '#12B266', '#F86E1A', '#7A45E0'] as const

/** The papers' colours before the palette was retuned; letters stored back then still carry them. */
const LEGACY: Record<string, string> = {
  '#FF2E93': STATIONERY[0],
  '#1F6BFF': STATIONERY[1],
  '#FFC400': STATIONERY[2],
  '#00C46A': STATIONERY[3],
  '#FF6B00': STATIONERY[4],
  '#7B2FFF': STATIONERY[5],
}

/** Only ever one of the six papers: a colour from storage or the network never reaches CSS as-is. */
export const safeColor = (c: unknown): string =>
  STATIONERY.includes(c as (typeof STATIONERY)[number])
    ? (c as string)
    : (typeof c === 'string' && LEGACY[c.toUpperCase()]) || STATIONERY[0]

const INVISIBLE = /[\p{Cf}\p{Zl}\p{Zp}]|[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/gu

/** Normalises a letter body: keeps single line breaks, drops invisible and control characters. */
export function cleanText(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(INVISIBLE, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** A signature: one short line, or null to sign anonymously. */
export function cleanSigner(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.normalize('NFKC').replace(INVISIBLE, '').replace(/\s+/g, ' ').trim()
  const capped = Array.from(s).slice(0, NAME_MAX).join('').trim()
  return capped.length ? capped : null
}

const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(com|net|org|io|gg|me|ly|co|xyz|app|dev|tv|jp|link|site|info|biz|us|uk|ru|cn)\b|discord\.gg|t\.me\/)/i
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/
const HANDLE = /(^|\s)@[\p{L}\p{N}_.]{2,}/u
const SOCIAL = /\b(insta(gram)?|snap(chat)?|tiktok|discord|telegram|whatsapp|line id|kik|twitter|onlyfans)\b/i
const ADDRESS = /\b\d{1,5}\s+\p{L}+\s+(street|st|road|rd|avenue|ave|lane|ln|drive|dr|blvd)\b/iu
// small on purpose: catches the obvious, readers report the rest
// anything that looks like an HTML tag, entity-encoded tag, or script URL
const MARKUP = /<\s*\/?\s*[a-z!?]|&(lt|gt|#0*60|#x0*3c);|javascript:|data:text\/html/i
const HOSTILE = /\b(fuck\w*|shit\w*|bitch\w*|cunt\w*|nigg\w*|fag\w*|retard\w*|whore\w*|slut\w*|porn\w*|nudes?|kys|kill (yo)?urself|hentai|rape\w*)\b/i

function hasPhone(s: string) {
  const runs = s.match(/\+?\d[\d\s().-]{6,}\d/g) ?? []
  return runs.some((r) => r.replace(/\D/g, '').length >= 8)
}

/** Why this text can't be sent, in words for the writer, or null if it's fine. `max` lets other notes run longer. */
export function problem(text: string, signer: string | null = null, max = LETTER_MAX): string | null {
  const all = `${text}\n${signer ?? ''}`
  const len = Array.from(text).length
  if (len < LETTER_MIN) return 'write a little more first'
  if (len > max) return `keep it under ${max} characters`
  if (MARKUP.test(all)) return 'no code or HTML, please'
  if (LINK.test(all)) return 'no links, please'
  if (EMAIL.test(all) || HANDLE.test(all) || SOCIAL.test(all)) return 'no emails, handles or socials'
  if (hasPhone(all) || ADDRESS.test(all)) return 'no phone numbers or addresses'
  if (HOSTILE.test(all)) return 'please keep it friendly'
  return null
}
