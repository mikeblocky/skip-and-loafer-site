import { useEffect, useState } from 'react'
import { localPhase, seasonYear, type Inside, type Phase } from '../../santa'
import { store } from '../message/mail'

/**
 * Which half of the Secret Santa season it is on this device, or null when the tab is away.
 * Checked every minute, so the box bursts at midnight on 24 December even with the page open.
 *
 * On the dev server, `?santa=collect` or `?santa=open` previews either half on any date (and the
 * dev API plays along, see api/santa.ts).
 */
const forced = (): Phase | null => {
  if (!import.meta.env.DEV) return null
  const v = new URLSearchParams(location.search).get('santa')
  return v === 'collect' || v === 'open' ? v : null
}
export const phaseNow = (): Phase | null => forced() ?? localPhase()
export const devForce = forced

export function useSeason(): Phase | null {
  const [p, set] = useState(phaseNow)
  useEffect(() => {
    const id = window.setInterval(() => set(phaseNow()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return p
}

const API = '/api/santa'

export interface Gift {
  id: string
  text: string
  from: string | null
  wrap: string
  inside: Inside
  /** a name, or null for everyone */
  to: string | null
  pic: { url: string; w: number; h: number } | null
  at: number
  mine?: boolean
  /** turned up by looking a name up, not in the shared pile */
  forYou?: boolean
}

export async function santaApi<T>(init?: RequestInit, query = ''): Promise<T> {
  const f = forced()
  const headers = new Headers(init?.headers)
  if (f) headers.set('x-santa-force', f)
  const r = await fetch(API + query, { ...init, headers }).catch(() => {
    throw new Error('couldn’t reach the mailbox, try again later')
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((data as { error?: string }).error || 'couldn’t reach the mailbox, try again later')
  return data as T
}
export const santaPost = <T,>(body: unknown) =>
  santaApi<T>({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

/** what this device remembers about this year's season */
const year = () => seasonYear()
export interface Wrapped {
  id: string
  inside: Inside
  wrap: string
  text: string
  to?: string | null
  at: number
}
export const local = {
  sent: () => store.read<Wrapped[]>(`sl-santa-sent-${year()}`, []),
  setSent: (v: Wrapped[]) => store.write(`sl-santa-sent-${year()}`, v),
  opened: () => store.read<string[]>(`sl-santa-opened-${year()}`, []),
  open: (id: string) => store.write(`sl-santa-opened-${year()}`, [...local.opened().filter((x) => x !== id), id].slice(-2000)),
  reported: () => store.read<string[]>(`sl-santa-reported-${year()}`, []),
  report: (id: string) => store.write(`sl-santa-reported-${year()}`, [...local.reported(), id].slice(-500)),
  burst: () => store.read<boolean>(`sl-santa-burst-${year()}`, false),
  setBurst: () => store.write(`sl-santa-burst-${year()}`, true),
}
