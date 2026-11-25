/**
 * Skip to School: side chatter. The friends running along (and whoever leads the page) chime in
 * on what's happening: a hit, a heal, a twist, a break, a dare. The lines themselves live in
 * each language's games dictionary (src/i18n/games), our own, not quotes from the series.
 */

import { currentLang } from '../../i18n'
import { TALK, type TalkEvent } from '../../i18n/talk'

export type { TalkEvent }

/** a line for this character and moment: their own lines win half the time */
export function lineFor(id: string, ev: TalkEvent) {
  const { anyone, own: mine } = TALK[currentLang()]
  const own = mine[id]?.[ev] ?? []
  const pool = own.length && (Math.random() < 0.55 || !anyone[ev].length) ? own : anyone[ev]
  return pool[Math.floor(Math.random() * pool.length)]
}

/** seconds between chatter lines, unless something big just happened */
export const TALK_GAP = 4.5
/** seconds of quiet before someone fills the silence */
export const IDLE_TALK: [number, number] = [14, 24]
