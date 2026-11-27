import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { gsap } from '../gsap'
import { C } from '../data'
import { Icon, type IconName } from '../icons'
import { useT, type Key } from '../i18n'
import { useSeason } from './santa/season'
import { caesar, quest } from '../quest'

export type NavId = 'countdown' | 'volumes' | 'birthdays' | 'anime' | 'message' | 'santa' | 'replay'

const ITEMS: { id: NavId; label: string; color: string; icon: IconName; ink?: boolean; tilt: number }[] = [
  { id: 'countdown', label: 'Countdown', color: C.pink, icon: 'clock', tilt: -4 },
  { id: 'volumes', label: 'Volumes', color: C.blue, icon: 'book', tilt: 3 },
  { id: 'birthdays', label: 'Birthdays', color: C.green, icon: 'bow', tilt: 2 },
  { id: 'anime', label: 'Anime', color: C.orange, icon: 'film', tilt: -3 },
  { id: 'message', label: 'Message', color: C.red, icon: 'envelope', tilt: 3 },
  // only there while the Secret Santa season is on (see src/santa.ts)
  { id: 'santa', label: 'Secret Santa', color: C.teal, icon: 'tree', tilt: -3 },
  { id: 'replay', label: 'Replay', color: C.violet, icon: 'replay', tilt: -2 },
]

const isDesktop = () => window.matchMedia('(width > 760px)').matches
const REST = -58
const LIFT = -34

function Mark({
  item,
  active,
  onSelect,
}: {
  item: (typeof ITEMS)[number]
  active: boolean
  onSelect: (id: NavId) => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const { t } = useT()
  // Secret Santa part 2: while the cipher is unsolved, every tab's name is shifted along the alphabet
  const shift = useSyncExternalStore(quest.subscribe, () => {
    const q = quest.get()
    return q.part2 === 'cipher' && q.p2?.shifted !== false ? (q.p2?.shift ?? 0) : 0
  })
  const [hover, setHover] = useState(false)
  const first = useRef(true)

  useEffect(() => {
    const y = active ? 0 : hover ? LIFT : REST
    const rotation = active || hover ? 0 : item.tilt
    if (first.current || !isDesktop()) {
      first.current = false
      gsap.set(ref.current, { y, rotation, transformOrigin: '50% 0%' })
      return
    }
    gsap.to(ref.current, { y, rotation, duration: active ? 0.9 : 0.7, ease: 'elastic.out(1, 0.75)', overwrite: 'auto' })
  }, [active, hover])

  const press = () => {
    const el = ref.current
    if (isDesktop() && item.id === 'replay') {
      gsap.fromTo(el, { y: 6 }, { y: hover ? LIFT : REST, duration: 0.9, ease: 'elastic.out(1, 0.75)' })
      gsap.fromTo(el!.querySelector('svg'), { rotation: 0 }, { rotation: -360, duration: 0.8, ease: 'back.out(1.25)' })
    } else if (isDesktop() && !active) {
      gsap.fromTo(el, { y: LIFT }, { y: 14, duration: 0.18, ease: 'power2.out' })
    }
    onSelect(item.id)
  }

  return (
    <button
      ref={ref}
      className={`mark mark--${item.id}${active ? ' is-active' : ''}${item.ink ? ' is-ink' : ''}`}
      style={{ '--c': item.color, color: item.ink ? C.ink : '#fff' } as CSSProperties}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onClick={press}
      aria-current={active ? 'page' : undefined}
    >
      <span className="mark-ribbon">
        <Icon name={item.icon} color={item.ink ? C.ink : '#fff'} size={22} />
        <span className="mark-label" aria-label={shift ? t(`nav.${item.id}` as Key) : undefined}>
          {shift ? caesar(t(`nav.${item.id}` as Key), shift) : t(`nav.${item.id}` as Key)}
        </span>
      </span>
    </button>
  )
}

export function Bookmarks({ view, onSelect }: { view: NavId; onSelect: (id: NavId) => void }) {
  const { t } = useT()
  const season = useSeason()
  const items = ITEMS.filter((it) => it.id !== 'santa' || season)
  return (
    <nav className="bookmarks" aria-label={t('nav.sections')} style={{ '--n': items.length } as CSSProperties}>
      {items.map((it) => (
        <Mark key={it.id} item={it} active={view === it.id} onSelect={onSelect} />
      ))}
    </nav>
  )
}
