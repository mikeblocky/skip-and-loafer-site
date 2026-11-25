import { useCallback, useEffect, useState } from 'react'

const API = '/api/messages'

export const store = {
  read<T>(k: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(k)
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  },
  write(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v))
    } catch {
      /* private mode */
    }
  },
}
export function clientId(): string {
  let id = store.read<string>('sl-msg-me', '')
  if (!/^[a-z0-9]{12,40}$/i.test(id)) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 20)
    store.write('sl-msg-me', id)
  }
  return id
}
export const remember = (k: string, id: string, max: number) => store.write(k, [...store.read<string[]>(k, []).filter((x) => x !== id), id].slice(-max))

export interface Letter {
  id: string
  text: string
  from: string | null
  color: string
  at: number
  /** you wrote this one */
  mine?: boolean
}

export async function api<T>(init?: RequestInit, query = ''): Promise<T> {
  // offline or blocked: say so in the same words the server would
  const r = await fetch(API + query, init).catch(() => {
    throw new Error('couldn’t reach the mailbox, try again later')
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((data as { error?: string }).error || 'couldn’t reach the mailbox, try again later')
  return data as T
}
export const post = <T,>(body: unknown) => api<T>({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

/** How many letters are waiting, and how often yours have been opened. Refreshes on demand. */
export function useStats() {
  const [s, set] = useState<{ total: number | null; opens: number; sent: number }>({ total: null, opens: 0, sent: 0 })
  const refresh = useCallback(() => {
    const mine = store.read<string[]>('sl-msg-sent', [])
    api<{ total: number; opens: Record<string, number> }>(undefined, `?mine=${encodeURIComponent(mine.join(','))}`)
      .then((d) => set({ total: d.total, sent: mine.length, opens: Object.values(d.opens).reduce((a, b) => a + b, 0) }))
      .catch(() => set((p) => ({ ...p, sent: mine.length })))
  }, [])
  useEffect(refresh, [refresh])
  return [s, refresh] as const
}
