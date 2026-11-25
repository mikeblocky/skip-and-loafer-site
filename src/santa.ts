/**
 * The Secret Santa tab: a limited-time gift exchange, once a year. Shared by the page and by
 * api/santa.ts, so both agree on the dates and on what a gift may hold.
 *
 *   25 Nov – 23 Dec   write a letter (a note, a little something tucked in, maybe a picture), to
 *                     everyone or to one name, and drop it in the big box
 *   24 Dec – 31 Dec   the box bursts, the letters fly out across the page and everyone can read them
 *   the rest of the year the tab isn't there at all
 *
 * The page goes by the reader's own calendar. The server is generous at the edges so that
 * nobody is turned away on their own date: the box takes gifts until 23 December has ended
 * everywhere on Earth, and opens once 24 December has begun anywhere (UTC+14 to UTC−12).
 */
import { cleanSigner, cleanText, problem, STATIONERY } from './letterRules.js'

export const COLLECT_FROM = { month: 11, day: 25 }
export const BURST_ON = { month: 12, day: 24 }
export const LAST_DAY = { month: 12, day: 31 }

export type Phase = 'collect' | 'open'

/** what the tab shows today, on this device's calendar; null = out of season, no tab */
export function localPhase(d = new Date()): Phase | null {
  const m = d.getMonth() + 1
  const day = d.getDate()
  if (m === COLLECT_FROM.month && day >= COLLECT_FROM.day) return 'collect'
  if (m === BURST_ON.month) return day >= BURST_ON.day ? 'open' : 'collect'
  return null
}

/** the season a date belongs to (Nov and Dec are in the same year) */
export const seasonYear = (d = new Date()) => d.getFullYear()

/** whole days from `d` until the box bursts, on this device's calendar */
export function daysToBurst(d = new Date()) {
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const b = Date.UTC(d.getFullYear(), BURST_ON.month - 1, BURST_ON.day)
  return Math.max(0, Math.round((b - a) / 86_400_000))
}

const H = 3_600_000
/** The server's view, in real time: which season (if any), and can gifts go in / come out. */
export function serverSeason(now = Date.now()): { year: number; canSend: boolean; canOpen: boolean } | null {
  const y0 = new Date(now).getUTCFullYear()
  for (const y of [y0, y0 - 1]) {
    // earliest time zone is UTC+14, latest is UTC−12
    const from = Date.UTC(y, COLLECT_FROM.month - 1, COLLECT_FROM.day) - 14 * H
    const sendUntil = Date.UTC(y, BURST_ON.month - 1, BURST_ON.day) + 12 * H
    const openFrom = Date.UTC(y, BURST_ON.month - 1, BURST_ON.day) - 14 * H
    const until = Date.UTC(y + 1, 0, 1) + 12 * H
    if (now >= from && now < until) return { year: y, canSend: now < sendUntil, canOpen: now >= openFrom }
  }
  return null
}

/** when a season's gifts are wiped from the server: a couple of weeks after it ends */
export const forgetAt = (year: number) => Date.UTC(year + 1, 0, 15)

/** what can go inside a gift */
export const INSIDE = ['coffee', 'cake', 'onigiri', 'sakura', 'star', 'note', 'heart', 'snow'] as const
export type Inside = (typeof INSIDE)[number]
export const safeInside = (v: unknown): Inside => (INSIDE.includes(v as Inside) ? (v as Inside) : INSIDE[0])

/** wrapping paper is one of the six letter papers; each gets a ribbon that stands out on it */
export const WRAPS = STATIONERY
export const RIBBON: Record<string, string> = {
  '#F53D84': '#FBBA14',
  '#246BE8': '#FBBA14',
  '#FBBA14': '#F53D84',
  '#12B266': '#F0344F',
  '#F86E1A': '#FFFFFF',
  '#7A45E0': '#FBBA14',
}

/** a tag is shorter than a letter */
export const TAG_MAX = 280
/** gifts one person can have in the box at once */
export const GIFTS_PER_PERSON = 12

/**
 * Who a letter is for: null for everyone, or a name. A named letter stays out of the shared pile;
 * it turns up for whoever types that name (no accounts here, so it's a nice surprise, not a lock).
 */
export const cleanTo = cleanSigner
/** the same name however it's typed: case, width and spaces don't matter */
export const nameKey = (name: string | null) => (name ? name.normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/g, '') : '')

/** Why this note can't go (same words as the letter rules), or null if it's fine. */
export function tagProblem(text: string, signer: string | null, to: string | null = null) {
  if (Array.from(cleanText(text)).length > TAG_MAX) return `keep it under ${TAG_MAX} characters`
  return problem(text, [signer, to].filter(Boolean).join(' ') || null)
}

/** Pictures: squeezed in the browser, stored in Vercel Blob. GIFs are kept as they are so they still move. */
export const PIC_MAX_BYTES = 3 * 1024 * 1024
export const PIC_MAX_EDGE = 1600
export const PIC_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/gif'] as const

/** what a file really is, from its first bytes (never trust the name or the browser's guess) */
export function sniffImage(b: Uint8Array): (typeof PIC_TYPES)[number] | null {
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x)
  if (at(0, 0xff, 0xd8, 0xff)) return 'image/jpeg'
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png'
  if (at(0, 0x47, 0x49, 0x46, 0x38) && (at(4, 0x37, 0x61) || at(4, 0x39, 0x61))) return 'image/gif'
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'image/webp'
  return null
}
