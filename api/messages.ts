/**
 * Letters for the Message tab: fans write a short note, and anyone can open one at random.
 *
 * Runs on the server only (a Vercel-style function, and through the dev server locally), so the
 * Redis password in REDIS_URL never reaches the browser.
 *
 *   GET  /api/messages?me=<client>&not=<id,id>   → { letter | null, total }   open one at random
 *   GET  /api/messages?mine=<id,id>               → { opens: {id: n}, total }  how often yours were opened
 *   POST /api/messages {action:'send', text, from, color, me}   → { id, total }
 *   POST /api/messages {action:'report', id, me}                → { ok }
 *
 * `me` is a random id the browser makes for itself (not personal): it marks which letters are your
 * own (they're in the mix too, but don't count as reads) and lets one reader report a letter only once. Letters are checked with the same
 * rules the page shows (src/letterRules.ts); a letter that three readers report is taken down.
 */
import { createClient } from 'redis'
import { cleanSigner, cleanText, problem, safeColor } from '../src/letterRules.js'

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

interface Letter {
  id: string
  text: string
  from: string | null
  color: string
  at: number
  by: string
}

const KEY = {
  data: 'msg:data', // hash: id → letter JSON
  live: 'msg:live', // set: ids that can still be opened
  opens: 'msg:opens', // hash: id → times opened
  reports: (id: string) => `msg:reports:${id}`, // set: readers who reported it
  rate: (kind: string, ip: string) => `msg:rate:${kind}:${ip}`,
}
const SENDS_PER_10_MIN = 5
const OPENS_PER_MINUTE = 30
const REPORTS_TO_REMOVE = 3

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
  ;(c as unknown as { on(ev: 'error', cb: () => void): void }).on('error', () => {})
  connecting = c.connect().then(() => {
    client = c
    connecting = null
    return c
  })
  connecting.catch(() => (connecting = null))
  return connecting
}

const ID = /^[a-z0-9]{6,40}$/i
const ids = (raw: string | null, max: number) =>
  (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => ID.test(s))
    .slice(0, max)

async function readBody(req: Req): Promise<unknown> {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
  const chunks: Uint8Array[] = []
  let size = 0
  await new Promise<void>((done, fail) => {
    req.on('data', (c) => {
      size += c.length
      if (size > 8192) fail(new Error('body too large'))
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

function ipOf(req: Req) {
  const fwd = req.headers['x-forwarded-for']
  return (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
}

/** true when this address is over its allowance for `kind` in the current window */
async function limited(r: Client, kind: string, ip: string, max: number, seconds: number) {
  const k = KEY.rate(kind, ip)
  const hits = await r.incr(k)
  if (hits === 1) await r.expire(k, seconds)
  return hits > max
}

// cleaned again on the way out, so nothing odd that ever got stored can reach a page
const publicView = (l: Letter) => ({
  id: String(l.id),
  text: cleanText(l.text),
  from: cleanSigner(l.from),
  color: safeColor(l.color),
  at: Number(l.at) || 0,
})

/** Fisher–Yates. Redis hands a small set back in the same order every time, so it's mixed here. */
function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * `read` is this reader's history, oldest first. Letters they haven't read come first, in random
 * order; once they've read them all, the one they read longest ago comes back round, so a small
 * mailbox cycles through every letter instead of repeating one.
 */
function nextFor(letters: Letter[], read: string[]): Letter | undefined {
  const when = (l: Letter) => read.indexOf(l.id) // -1 = never read
  return shuffle(letters).sort((a, b) => when(a) - when(b))[0]
}

async function openOne(r: Client, me: string, not: string[]) {
  const picks: string[] = await r.sRandMemberCount(KEY.live, 40)
  if (!picks.length) return null
  const rows = (await r.hmGet(KEY.data, picks)) as (string | null)[]
  const letters = rows.flatMap((s) => {
    try {
      return s ? [JSON.parse(s) as Letter] : []
    } catch {
      return []
    }
  })
  // everyone's letters are in the mix, your own included
  const pick = nextFor(letters, not)
  if (!pick) return null
  const mine = pick.by === me
  if (!mine) await r.hIncrBy(KEY.opens, pick.id, 1)
  return { ...publicView(pick), mine }
}

export default async function handler(req: Req, res: Res) {
  try {
    const r = await db()
    const ip = ipOf(req)

    if (req.method === 'GET') {
      const q = new URL(req.url ?? '/', 'http://x').searchParams
      const total = await r.sCard(KEY.live)
      if (q.has('mine')) {
        const mine = ids(q.get('mine'), 60)
        const counts = mine.length ? ((await r.hmGet(KEY.opens, mine)) as (string | null)[]) : []
        return send(res, 200, { total, opens: Object.fromEntries(mine.map((id, i) => [id, Number(counts[i] ?? 0)])) })
      }
      if (await limited(r, 'open', ip, OPENS_PER_MINUTE, 60)) return send(res, 429, { error: 'too many tries, wait a minute' })
      const me = ids(q.get('me'), 1)[0] ?? ''
      const letter = await openOne(r, me, ids(q.get('not'), 80))
      return send(res, 200, { letter, total })
    }

    if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })
    const body = (await readBody(req)) as Record<string, unknown>
    const me = typeof body.me === 'string' && ID.test(body.me) ? body.me : ''
    if (!me) return send(res, 400, { error: 'refresh the page and try again' })

    if (body.action === 'report') {
      const id = typeof body.id === 'string' && ID.test(body.id) ? body.id : ''
      if (!id) return send(res, 400, { error: 'which letter?' })
      await r.sAdd(KEY.reports(id), me)
      if ((await r.sCard(KEY.reports(id))) >= REPORTS_TO_REMOVE) await r.sRem(KEY.live, id)
      return send(res, 200, { ok: true })
    }

    if (body.action !== 'send') return send(res, 400, { error: 'unknown action' })
    const text = cleanText(body.text)
    const from = cleanSigner(body.from)
    const why = problem(text, from)
    if (why) return send(res, 400, { error: why })
    if (await limited(r, 'send', ip, SENDS_PER_10_MIN, 600)) return send(res, 429, { error: 'you’ve sent a lot, try again in a few minutes' })

    const color = safeColor(body.color)
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    const letter: Letter = { id, text, from, color, at: Date.now(), by: me }
    await r.hSet(KEY.data, id, JSON.stringify(letter))
    await r.sAdd(KEY.live, id)
    return send(res, 200, { id, total: await r.sCard(KEY.live) })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error'
    return send(res, msg === 'REDIS_URL is not set' ? 503 : 500, { error: 'couldn’t reach the mailbox, try again later' })
  }
}
