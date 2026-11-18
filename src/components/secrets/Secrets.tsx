import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { C } from '../../data'
import { Icon } from '../../icons'
import { sfx } from '../../sfx'
import { SECRETS, onOpenSecret, secrets, type SecretId, type SecretInfo } from '../../secrets'
import { FlexText } from '../FlexText'
import { Gacha } from './Gacha'
import { SkipGame } from './SkipGame'
import { Poll } from './Poll'
import { Quiz } from './Quiz'

const COLORS: Record<SecretId, string> = { gacha: C.pink, skip: C.orange, poll: C.red, quiz: C.blue }

/**
 * Same family as the volume viewer: the page blurs behind paper, a round × sits in the corner,
 * and the title is one of the site's rainbow variable-weight headers.
 */
function Overlay({ info, onClose, children }: { info: SecretInfo; onClose: () => void; children: ReactNode }) {
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    close.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      before?.focus?.({ preventScroll: true })
    }
  }, [onClose])
  return (
    <div className="sx" role="dialog" aria-modal="true" aria-label={info.title} style={{ '--c': COLORS[info.id] } as CSSProperties}>
      <div className="sx-backdrop" onClick={onClose} />
      <button className="round-btn sx-close" ref={close} onClick={onClose} aria-label="Close">
        <Icon name="close" color={C.ink} size={22} />
      </button>
      <div className={`sx-panel${info.id === 'skip' ? ' is-wide' : ''}`}>
        <FlexText as="h2" className="sx-title" words={info.title.split(' ').map((t) => ({ t, w: 760 }))} />
        <div className="sx-body">{children}</div>
      </div>
    </div>
  )
}

export function Secrets() {
  const [open, setOpen] = useState<SecretId | null>(null)
  const [toast, setToast] = useState<SecretInfo | null>(null)

  useEffect(
    () =>
      onOpenSecret((id) => {
        const fresh = !secrets.get().found.includes(id)
        if (fresh) {
          secrets.update((st) => ({ ...st, found: [...st.found, id] }))
          setToast(SECRETS.find((x) => x.id === id)!)
          sfx.jingle(0.6)
        } else sfx.chime(1.2, 0.6)
        setOpen(id)
      }),
    [],
  )

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3400)
    return () => clearTimeout(t)
  }, [toast])

  const info = open ? SECRETS.find((x) => x.id === open)! : null
  const close = useCallback(() => setOpen(null), [])

  return (
    <>
      {info && (
        <Overlay info={info} onClose={close}>
          {info.id === 'gacha' && <Gacha />}
          {info.id === 'skip' && <SkipGame />}
          {info.id === 'poll' && <Poll />}
          {info.id === 'quiz' && <Quiz />}
        </Overlay>
      )}

      {toast && (
        <div className="sx-toast" role="status" style={{ '--c': COLORS[toast.id] } as CSSProperties}>
          <Icon name="sparkle" color="#fff" size={18} />
          <span>
            secret found: <b>{toast.title}</b>
          </span>
        </div>
      )}
    </>
  )
}
