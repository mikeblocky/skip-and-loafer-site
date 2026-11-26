/**
 * Leaderboards for the hidden games: one board per game, picked with ?game= (skip by default,
 * so Skip to School's board and its saved scores carry on as they were).
 */
import { createClient } from 'redis'

declare const process: { env: Record<string, string | undefined> }

interface Req {
  method?: string
  url?: string
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

/**
 * The games with a board, and the highest score each one accepts. Skip to School's is generous:
 * past 10k its score grows by orders of magnitude (a great run reaches millions).
 */
const GAMES = {
  skip: 1_000_000_000_000,
  gacha: 10_000_000,
  quiz: 10_000_000,
  poll: 10_000_000,
} as const
type Game = keyof typeof GAMES

/** Redis keys for one game's board; skip keeps the keys it has always had. */
const keys = (game: Game) => ({
  scores: `${game}:scores`, // sorted set: name key → best score
  names: `${game}:names`, // hash: name key → name as typed
  won: `${game}:won`, // set: name keys that finished the game (skip: reached school with everyone)
})
/** one rate limit per address, shared by every board */
const rateKey = (ip: string) => `skip:rate:${ip}`
const TOP = 10
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

function gameOf(req: Req): Game | null {
  const q = new URL(req.url ?? '/', 'http://x').searchParams.get('game') ?? 'skip'
  return Object.hasOwn(GAMES, q) ? (q as Game) : null
}

async function top(r: Client, game: Game) {
  const KEY = keys(game)
  const rows: { value: string; score: number }[] = await r.zRangeWithScores(KEY.scores, 0, TOP - 1, { REV: true })
  if (!rows.length) return []
  const ids = rows.map((x) => x.value)
  const [names, won] = await Promise.all([r.hmGet(KEY.names, ids), r.smIsMember(KEY.won, ids)])
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
    const game = gameOf(req)
    if (!game) return send(res, 400, { error: 'no such game' })
    const KEY = keys(game)
    if (req.method === 'GET') {
      const r = await db()
      return send(res, 200, { entries: await top(r, game) })
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })

    const body = (await readBody(req)) as { name?: unknown; score?: unknown; won?: unknown }
    const name = cleanName(body.name)
    const score = Math.floor(Number(body.score))
    if (!name) return send(res, 400, { error: 'type a name' })
    if (!Number.isFinite(score) || score <= 0 || score > GAMES[game]) return send(res, 400, { error: 'that score looks off' })

    const r = await db()
    const fwd = req.headers['x-forwarded-for']
    const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
    const hits = await r.incr(rateKey(ip))
    if (hits === 1) await r.expire(rateKey(ip), 60)
    if (hits > POSTS_PER_MINUTE) return send(res, 429, { error: 'slow down a little' })

    const key = name.toLowerCase()
    await r.zAdd(KEY.scores, { score, value: key }, { GT: true })
    await r.hSet(KEY.names, key, name)
    if (body.won === true) await r.sAdd(KEY.won, key)
    const [rank, best, entries] = await Promise.all([r.zRevRank(KEY.scores, key), r.zScore(KEY.scores, key), top(r, game)])
    return send(res, 200, { entries, rank: rank === null ? null : rank + 1, best })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error'
    return send(res, msg === 'REDIS_URL is not set' ? 503 : 500, { error: 'leaderboard unavailable' })
  }
}
