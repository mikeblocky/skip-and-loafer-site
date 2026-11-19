/**
 * Leaderboard for the hidden "skip to school" game.
 *
 * Runs on the server only (a Vercel-style function, and through the dev server locally), so the
 * Redis password in REDIS_URL never reaches the browser.
 *
 *   GET  /api/leaderboard            → { entries }
 *   POST /api/leaderboard {name, score, won}  → { entries, rank, best }
 *
 * Each name keeps its best score only. Names are typed by players, so they're cleaned up and
 * capped; posts are rate-limited per address. Scores come from the browser, so this is a
 * friendly board, not a cheat-proof one.
 */
import { createClient } from 'redis'

declare const process: { env: Record<string, string | undefined> }

interface Req {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
  socket?: { remoteAddress?: string }
  on(ev: 'data', cb: (chunk: Uint8Array) => void): unknown
  on(ev: 'end', cb: () => void): unknown
  on(ev: 'error', cb: (e: unknown) => void): unknown
}
interface Res {
  statusCode: number
  setHeader(k: string, v: string): unknown
  end(body?: string): unknown
}

const KEY = {
  scores: 'skip:scores', // sorted set: name key → best score
  names: 'skip:names', // hash: name key → name as typed
  won: 'skip:won', // set: name keys that reached school with everyone
  rate: (ip: string) => `skip:rate:${ip}`,
}
const TOP = 10
/** generous: past 10k the score grows by orders of magnitude (a great run reaches millions) */
const MAX_SCORE = 1_000_000_000_000
const POSTS_PER_MINUTE = 8

type Client = ReturnType<typeof createClient>
let client: Client | null = null
let connecting: Promise<Client> | null = null

/** One connection, reused across requests while the function stays warm. */
async function db(): Promise<Client> {
  if (client?.isOpen) return client
  if (connecting) return connecting
  const url = process.env.REDIS_URL
  if (!url) throw new Error('REDIS_URL is not set')
  const c = createClient({ url, socket: { connectTimeout: 5000, reconnectStrategy: (n: number) => (n > 3 ? false : 200) } })
  // errors are surfaced per request instead of crashing the function
  ;(c as unknown as { on(ev: 'error', cb: () => void): void }).on('error', () => {})
  connecting = c.connect().then(() => {
    client = c
    connecting = null
    return c
  })
  connecting.catch(() => (connecting = null))
  return connecting
}

/** Letters, numbers, spaces and normal punctuation; no control or direction-flipping characters. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, '') // control, invisible/format and line-separator characters
    .replace(/\s+/g, ' ')
    .trim()
  const capped = Array.from(s).slice(0, 16).join('').trim()
  return capped.length ? capped : null
}

async function top(r: Client) {
  const rows: { value: string; score: number }[] = await r.zRangeWithScores(KEY.scores, 0, TOP - 1, { REV: true })
  if (!rows.length) return []
  const keys = rows.map((x) => x.value)
  const [names, won] = await Promise.all([r.hmGet(KEY.names, keys), r.smIsMember(KEY.won, keys)])
  return rows.map((x, i: number) => ({ name: names[i] ?? x.value, score: x.score, won: Boolean(won[i]) }))
}

async function readBody(req: Req): Promise<unknown> {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
  const chunks: Uint8Array[] = []
  let size = 0
  await new Promise<void>((done, fail) => {
    req.on('data', (c) => {
      size += c.length
      if (size > 4096) fail(new Error('body too large'))
      else chunks.push(c)
    })
    req.on('end', () => done())
    req.on('error', fail)
  })
  const all = new Uint8Array(size)
  let at = 0
  for (const c of chunks) {
    all.set(c, at)
    at += c.length
  }
  return JSON.parse(new TextDecoder().decode(all) || '{}')
}

function send(res: Res, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

export default async function handler(req: Req, res: Res) {
  try {
    if (req.method === 'GET') {
      const r = await db()
      return send(res, 200, { entries: await top(r) })
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })

    const body = (await readBody(req)) as { name?: unknown; score?: unknown; won?: unknown }
    const name = cleanName(body.name)
    const score = Math.floor(Number(body.score))
    if (!name) return send(res, 400, { error: 'type a name' })
    if (!Number.isFinite(score) || score <= 0 || score > MAX_SCORE) return send(res, 400, { error: 'that score looks off' })

    const r = await db()
    const fwd = req.headers['x-forwarded-for']
    const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
    const hits = await r.incr(KEY.rate(ip))
    if (hits === 1) await r.expire(KEY.rate(ip), 60)
    if (hits > POSTS_PER_MINUTE) return send(res, 429, { error: 'slow down a little' })

    const key = name.toLowerCase()
    await r.zAdd(KEY.scores, { score, value: key }, { GT: true })
    await r.hSet(KEY.names, key, name)
    if (body.won === true) await r.sAdd(KEY.won, key)
    const [rank, best, entries] = await Promise.all([r.zRevRank(KEY.scores, key), r.zScore(KEY.scores, key), top(r)])
    return send(res, 200, { entries, rank: rank === null ? null : rank + 1, best })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error'
    return send(res, msg === 'REDIS_URL is not set' ? 503 : 500, { error: 'leaderboard unavailable' })
  }
}
