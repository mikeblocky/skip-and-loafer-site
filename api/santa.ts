/**
 * The Secret Santa gift box (see src/santa.ts for the dates). Everyone writes letters for
 * everyone; nobody can see inside until the box bursts, and then the letters fly out to all.
 * A letter can carry a picture or GIF, and can be written to a name instead of to everyone:
 * those stay out of the shared pile and turn up for whoever looks that name up.
 */
import { createClient } from 'redis'
import { del, get, list, put } from '@vercel/blob'
import { cleanSigner, cleanText, safeColor } from '../src/letterRules.js'
import { cleanTo, forgetAt, GIFTS_PER_PERSON, nameKey, PIC_MAX_BYTES, safeInside, serverSeason, sniffImage, tagProblem } from '../src/santa.js'

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
  end(body?: string | Uint8Array): unknown
}

interface Pic {
  url: string
  /** where it is in the Blob store, for deleting it */
  path?: string
  w: number
  h: number
}
interface Gift {
  id: string
  text: string
  from: string | null
  to?: string | null
  wrap: string
  inside: string
  pic?: Pic | null
  at: number
  by: string
}

const DEV = !!process.env.SL_DEV_API
/**
 * Vercel Blob is on when the project has a store connected: either the older read-write token,
 * or a store id, in which case the package signs in with Vercel's own OIDC identity (it gets
 * that on Vercel; on a dev server only after `vercel env pull`).
 */
const BLOB =
  !!process.env.BLOB_READ_WRITE_TOKEN || (!!process.env.BLOB_STORE_ID && (!DEV || !!process.env.VERCEL_OIDC_TOKEN))
const NS = DEV ? 'santa-dev' : 'santa'
const KEY = {
  data: (y: number) => `${NS}:${y}:data`, // hash: id → letter JSON
  order: (y: number) => `${NS}:${y}:order`, // sorted set: every letter, by time written
  pub: (y: number) => `${NS}:${y}:pub`, // sorted set: the ones for everyone
  to: (y: number, name: string) => `${NS}:${y}:to:${name}`, // sorted set: the ones for one name
  by: (y: number, me: string) => `${NS}:${y}:by:${me}`, // set: one person's letters
  reports: (y: number, id: string) => `${NS}:${y}:reports:${id}`, // set: who reported it
  pic: (y: number, id: string) => `${NS}:${y}:pic:${id}`, // an uploaded picture waiting for its letter
  cleaned: (y: number) => `${NS}:cleaned:${y}`, // that season's pictures are gone
  rate: (kind: string, ip: string) => `${NS}:rate:${kind}:${ip}`,
}
const SENDS_PER_10_MIN = 6
const UPLOADS_PER_10_MIN = 10
const PAGES_PER_MINUTE = 40
const REPORTS_TO_REMOVE = 3
const PAGE = 60
/** an uploaded picture has this long to be sent with a letter */
const PIC_WAIT = 2 * 60 * 60

type Client = ReturnType<typeof createClient>
let client: Client | null = null
let connecting: Promise<Client> | null = null

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
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10)

/** the raw request, up to `max` bytes (the host may already have read it into a Buffer) */
async function readRaw(req: Req, max: number): Promise<Uint8Array> {
  if (req.body instanceof Uint8Array) {
    if (req.body.length > max) throw new Error('body too large')
    return req.body
  }
  if (typeof req.body === 'string') return new TextEncoder().encode(req.body)
  const chunks: Uint8Array[] = []
  let size = 0
  await new Promise<void>((done, fail) => {
    req.on('data', (c) => {
      size += c.length
      if (size > max) fail(new Error('body too large'))
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
  return all
}

async function readBody(req: Req): Promise<unknown> {
  if (req.body !== undefined && !(req.body instanceof Uint8Array)) return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
  return JSON.parse(new TextDecoder().decode(await readRaw(req, 8192)) || '{}')
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

async function limited(r: Client, kind: string, ip: string, max: number, seconds: number) {
  const k = KEY.rate(kind, ip)
  const hits = await r.incr(k)
  if (hits === 1) await r.expire(k, seconds)
  return hits > max
}

/** the season right now; on the dev server the page may ask for either half */
function seasonFor(req: Req) {
  if (DEV) {
    const force = req.headers['x-santa-force']
    if (force === 'collect' || force === 'open') return { year: new Date().getFullYear(), canSend: force === 'collect', canOpen: force === 'open' }
  }
  return serverSeason()
}

// ── pictures: Vercel Blob in production; in memory on a dev server without a Blob token ──
const devPics = new Map<string, { type: string; bytes: Uint8Array }>()
const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' }

const YEAR = 60 * 60 * 24 * 365
const PIC_PATH = /^santa\/\d{4}\/[\w.-]+$/
/**
 * A store is public or private, and a picture has to be written the same way. Private is tried
 * first when the store came with an id (that's how Vercel sets up new stores); whichever works
 * is remembered while the function stays warm.
 */
let access: 'public' | 'private' = process.env.BLOB_STORE_ID ? 'private' : 'public'

async function storePic(y: number, bytes: Uint8Array, type: string): Promise<{ url: string; path?: string }> {
  const name = `santa/${y}/${newId()}.${EXT[type]}`
  if (BLOB) {
    const write = (a: typeof access) => put(name, Buffer.from(bytes), { access: a, contentType: type, addRandomSuffix: true, cacheControlMaxAge: YEAR })
    let b
    try {
      b = await write(access)
    } catch {
      access = access === 'private' ? 'public' : 'private'
      b = await write(access)
    }
    // a private picture has no public link: it's handed out by this function, and only after the burst
    return access === 'private' ? { url: `/api/santa?img=${encodeURIComponent(b.pathname)}`, path: b.pathname } : { url: b.url, path: b.pathname }
  }
  const id = newId()
  devPics.set(id, { type, bytes })
  return { url: `/api/santa?pic=${id}` }
}

const safePicUrl = (u: unknown) =>
  typeof u === 'string' &&
  (/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/santa\/\d{4}\/[\w.-]+$/i.test(u) ||
    /^\/api\/santa\?img=santa%2F\d{4}%2F[\w.-]+$/i.test(u) ||
    (DEV && /^\/api\/santa\?pic=[a-z0-9]+$/i.test(u)))
    ? u
    : null

async function dropPic(p?: Pic | null) {
  if (!BLOB || !p) return
  const target = p.path && PIC_PATH.test(p.path) ? p.path : p.url.startsWith('https://') ? p.url : null
  if (target) await del(target).catch(() => {})
}

/** a private picture, streamed out with a year of caching so Vercel's CDN serves it after the first look */
async function sendPic(res: Res, path: string) {
  const found = await get(path, { access: 'private' }).catch(() => null)
  if (!found || found.statusCode !== 200) return send(res, 404, { error: 'not found' })
  const bytes = new Uint8Array(await new Response(found.stream).arrayBuffer())
  const type = sniffImage(bytes)
  if (!type) return send(res, 404, { error: 'not found' })
  res.statusCode = 200
  res.setHeader('Content-Type', type)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Security-Policy', "default-src 'none'")
  res.setHeader('Cache-Control', `public, max-age=${YEAR}, s-maxage=${YEAR}, immutable`)
  return res.end(bytes)
}

/** last season's pictures, deleted the first time anything is written this season */
async function forgetLastSeason(r: Client, y: number) {
  if (!BLOB || DEV) return
  if (!(await r.set(KEY.cleaned(y - 1), '1', { NX: true, EX: 400 * 24 * 3600 }))) return
  try {
    let cursor: string | undefined
    do {
      const page = await list({ prefix: `santa/${y - 1}/`, cursor, limit: 1000 })
      if (page.blobs.length) await del(page.blobs.map((b) => b.pathname))
      cursor = page.hasMore ? page.cursor : undefined
    } while (cursor)
  } catch {
    await r.del(KEY.cleaned(y - 1)) // try again next time
  }
}

// cleaned again on the way out, so nothing odd that ever got stored can reach a page
const publicView = (g: Gift, me: string) => {
  const url = safePicUrl(g.pic?.url)
  return {
    id: String(g.id),
    text: cleanText(g.text),
    from: cleanSigner(g.from),
    to: cleanTo(g.to ?? null),
    wrap: safeColor(g.wrap),
    inside: safeInside(g.inside),
    pic: url && g.pic ? { url, w: Number(g.pic.w) || 1, h: Number(g.pic.h) || 1 } : null,
    at: Number(g.at) || 0,
    mine: !!me && g.by === me,
  }
}

async function remove(r: Client, y: number, g: Gift) {
  const m = r.multi().hDel(KEY.data(y), g.id).zRem(KEY.order(y), g.id).zRem(KEY.pub(y), g.id).sRem(KEY.by(y, g.by), g.id)
  const k = nameKey(g.to ?? null)
  if (k) m.zRem(KEY.to(y, k), g.id)
  await m.exec()
  await dropPic(g.pic)
}

async function getGift(r: Client, y: number, id: string): Promise<Gift | null> {
  const raw = await r.hGet(KEY.data(y), id)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Gift
  } catch {
    return null
  }
}

async function giftsAt(r: Client, y: number, zkey: string, from: number, to: number, me: string) {
  const slice = await r.zRange(zkey, from, to)
  const rows = slice.length ? await r.hmGet(KEY.data(y), slice) : []
  return rows.flatMap((s) => {
    try {
      return s ? [publicView(JSON.parse(s) as Gift, me)] : []
    } catch {
      return []
    }
  })
}

const dim = (v: unknown) => {
  const n = Math.round(Number(v))
  return n >= 1 && n <= 10_000 ? n : null
}

export default async function handler(req: Req, res: Res) {
  try {
    const q = new URL(req.url ?? '/', 'http://x').searchParams

    // a dev-server picture, straight from memory
    if (DEV && req.method === 'GET' && q.has('pic')) {
      const p = devPics.get(q.get('pic') ?? '')
      if (!p) return send(res, 404, { error: 'not found' })
      res.statusCode = 200
      res.setHeader('Content-Type', p.type)
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      return res.end(p.bytes)
    }

    const season = seasonFor(req)
    if (!season) return send(res, 404, { error: 'the box is closed for now' })
    const y = season.year
    const r = await db()
    const ip = ipOf(req)
    const total = () => r.zCard(KEY.order(y))

    if (req.method === 'GET') {
      if (q.has('img')) {
        // no peeking: pictures only come out once the box has burst
        if (!season.canOpen) return send(res, 403, { error: 'no peeking until it bursts' })
        const path = q.get('img') ?? ''
        if (!BLOB || !PIC_PATH.test(path) || !path.startsWith(`santa/${y}/`)) return send(res, 404, { error: 'not found' })
        return sendPic(res, path)
      }
      if (q.has('count')) return send(res, 200, { total: await total(), canSend: season.canSend, canOpen: season.canOpen, year: y, pics: BLOB || DEV })
      if (q.has('mine')) {
        const mine = ids(q.get('mine'), GIFTS_PER_PERSON * 2)
        const there = mine.length ? await r.hmGet(KEY.data(y), mine) : []
        return send(res, 200, { have: mine.filter((_, i) => there[i] != null) })
      }
      if (!q.has('page') && !q.has('for')) return send(res, 400, { error: 'unknown request' })
      if (!season.canOpen) return send(res, 403, { error: 'no peeking until it bursts' })
      if (await limited(r, 'page', ip, PAGES_PER_MINUTE, 60)) return send(res, 429, { error: 'too many tries, wait a minute' })
      const me = ids(q.get('me'), 1)[0] ?? ''
      if (q.has('for')) {
        const k = nameKey(cleanTo(q.get('for')))
        return send(res, 200, { gifts: k ? await giftsAt(r, y, KEY.to(y, k), 0, 199, me) : [] })
      }
      const page = Math.max(0, Math.min(10_000, Math.floor(Number(q.get('page')) || 0)))
      const gifts = await giftsAt(r, y, KEY.pub(y), page * PAGE, page * PAGE + PAGE - 1, me)
      const n = await r.zCard(KEY.pub(y))
      return send(res, 200, { gifts, total: n, more: (page + 1) * PAGE < n })
    }

    if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })

    // a picture comes on its own, as raw bytes, before the letter that carries it
    if (q.has('upload')) {
      const meH = req.headers['x-santa-me']
      const me = typeof meH === 'string' && ID.test(meH) ? meH : ''
      if (!me) return send(res, 400, { error: 'refresh the page and try again' })
      if (!season.canSend) return send(res, 403, { error: 'the box is closed for now' })
      if (!BLOB && !DEV) return send(res, 503, { error: 'pictures aren’t switched on yet' })
      if (await limited(r, 'upload', ip, UPLOADS_PER_10_MIN, 600)) return send(res, 429, { error: 'you’ve sent a lot, try again in a few minutes' })
      let bytes: Uint8Array
      try {
        bytes = await readRaw(req, PIC_MAX_BYTES)
      } catch {
        return send(res, 413, { error: 'that picture is too big' })
      }
      const type = sniffImage(bytes)
      if (!type) return send(res, 400, { error: 'that file isn’t a picture we can use' })
      await forgetLastSeason(r, y)
      const stored = await storePic(y, bytes, type)
      const id = newId()
      await r.set(KEY.pic(y, id), JSON.stringify({ ...stored, by: me }), { EX: PIC_WAIT })
      return send(res, 200, { pic: id })
    }

    const body = (await readBody(req)) as Record<string, unknown>
    const me = typeof body.me === 'string' && ID.test(body.me) ? body.me : ''
    if (!me) return send(res, 400, { error: 'refresh the page and try again' })
    const id = typeof body.id === 'string' && ID.test(body.id) ? body.id : ''

    if (body.action === 'back') {
      if (!season.canSend) return send(res, 403, { error: 'the box is closed for now' })
      const g = id ? await getGift(r, y, id) : null
      if (g && g.by === me) await remove(r, y, g)
      return send(res, 200, { ok: true, total: await total() })
    }

    if (body.action === 'report') {
      if (!season.canOpen) return send(res, 403, { error: 'no peeking until it bursts' })
      if (!id) return send(res, 400, { error: 'which gift?' })
      const k = KEY.reports(y, id)
      await r.sAdd(k, me)
      await r.expireAt(k, Math.floor(forgetAt(y) / 1000))
      if ((await r.sCard(k)) >= REPORTS_TO_REMOVE) {
        const g = await getGift(r, y, id)
        if (g) await remove(r, y, g)
      }
      return send(res, 200, { ok: true })
    }

    if (body.action !== 'send') return send(res, 400, { error: 'unknown action' })
    if (!season.canSend) return send(res, 403, { error: 'the box is closed for now' })
    const text = cleanText(body.text)
    const from = cleanSigner(body.from)
    const to = cleanTo(body.to)
    const why = tagProblem(text, from, to)
    if (why) return send(res, 400, { error: why })
    if ((await r.sCard(KEY.by(y, me))) >= GIFTS_PER_PERSON) return send(res, 400, { error: 'that’s plenty of gifts from you' })
    if (await limited(r, 'send', ip, SENDS_PER_10_MIN, 600)) return send(res, 429, { error: 'you’ve sent a lot, try again in a few minutes' })

    // the picture it carries must be one this person just uploaded
    let pic: Pic | null = null
    const ask = body.pic as { id?: unknown; w?: unknown; h?: unknown } | null | undefined
    if (ask && typeof ask.id === 'string' && ID.test(ask.id)) {
      const raw = await r.get(KEY.pic(y, ask.id))
      const held = raw ? (JSON.parse(raw) as { url: string; path?: string; by: string }) : null
      const w = dim(ask.w)
      const h = dim(ask.h)
      if (!held || held.by !== me || !w || !h) return send(res, 400, { error: 'that picture didn’t make it, try adding it again' })
      pic = { url: held.url, path: held.path, w, h }
      await r.del(KEY.pic(y, ask.id))
    }

    const gid = newId()
    const gift: Gift = { id: gid, text, from, to, wrap: safeColor(body.wrap), inside: safeInside(body.inside), pic, at: Date.now(), by: me }
    const expire = Math.floor(forgetAt(y) / 1000)
    const k = nameKey(to)
    const pile = k ? KEY.to(y, k) : KEY.pub(y)
    await r
      .multi()
      .hSet(KEY.data(y), gid, JSON.stringify(gift))
      .zAdd(KEY.order(y), { score: gift.at, value: gid })
      .zAdd(pile, { score: gift.at, value: gid })
      .sAdd(KEY.by(y, me), gid)
      .expireAt(KEY.data(y), expire)
      .expireAt(KEY.order(y), expire)
      .expireAt(pile, expire)
      .expireAt(KEY.by(y, me), expire)
      .exec()
    return send(res, 200, { id: gid, total: await total() })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error'
    return send(res, msg === 'REDIS_URL is not set' ? 503 : 500, { error: 'couldn’t reach the mailbox, try again later' })
  }
}
