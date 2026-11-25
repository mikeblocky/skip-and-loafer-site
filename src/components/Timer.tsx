import { useEffect, useState } from 'react'
import { C, releaseWindow } from '../data'
import { Icon } from '../icons'
import { useT } from '../i18n'

const pad = (n: number) => String(n).padStart(2, '0')

/** Minimal live countdown to the next chapter, pinned top-right on desktop. */
export function Timer({ onOpen, hidden }: { onOpen: () => void; hidden: boolean }) {
  const { t } = useT()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    let id = 0
    const tick = () => {
      setNow(Date.now())
      id = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
    }
    tick()
    return () => clearTimeout(id)
  }, [])

  const diff = Math.max(0, releaseWindow(now).next - now)
  const d = Math.floor(diff / 864e5)
  const h = Math.floor((diff % 864e5) / 36e5)
  const m = Math.floor((diff % 36e5) / 6e4)
  const s = Math.floor((diff % 6e4) / 1e3)

  return (
    <button
      className={`timer${hidden ? ' is-hidden' : ''}`}
      onClick={onOpen}
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : 0}
      aria-label={t('timer.label', { d, h, m })}
    >
      <Icon name="clock" color={C.pink} size={18} />
      <span className="tm-text">
        <b>{d}</b>
        <i>{t('timer.day')}</i> {pad(h)}
        <i>:</i>
        {pad(m)}
        <i>:</i>
        {pad(s)}
      </span>
    </button>
  )
}
