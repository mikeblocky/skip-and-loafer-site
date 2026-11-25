import type { Lang } from './locale'
import { talkEn, type Talk } from './games/en'
import { talkJa } from './games/ja'
import { talkKo } from './games/ko'
import { talkZhHans } from './games/zh-Hans'
import { talkZhHant } from './games/zh-Hant'
import { talkEs } from './games/es'
import { talkPtBR } from './games/pt-BR'
import { talkFr } from './games/fr'
import { talkDe } from './games/de'
import { talkId } from './games/id'
import { talkVi } from './games/vi'
import { talkTh } from './games/th'

export type { Talk, TalkEvent } from './games/en'

/** Skip to School's chatter in every language */
export const TALK: Record<Lang, Talk> = {
  en: talkEn,
  ja: talkJa,
  ko: talkKo,
  'zh-Hans': talkZhHans,
  'zh-Hant': talkZhHant,
  es: talkEs,
  'pt-BR': talkPtBR,
  fr: talkFr,
  de: talkDe,
  id: talkId,
  vi: talkVi,
  th: talkTh,
}
