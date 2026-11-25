import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { gsap } from '../gsap'
import { C } from '../data'
import { FlexText } from './FlexText'
import { Icon } from '../icons'
import { sfx } from '../sfx'
import { useStats } from './message/mail'
import { useGeo } from './message/geometry'
import { Guide } from './message/Guide'
import { Reader } from './message/Reader'
import { Writer } from './message/Writer'
import { useT } from '../i18n'
import '../message.css'

/** A little post office: write a letter that folds, seals and flies off, or open a random one. */

export function Message() {
  const [tab, setTab] = useState<'write' | 'open'>('write')
  const [stats, refresh] = useStats()
  const g = useGeo()
  const body = useRef<HTMLDivElement>(null)
  const { t: tr } = useT()

  const go = (t: 'write' | 'open') => {
    if (t === tab) return
    sfx.rustle()
    gsap.to(body.current, {
      autoAlpha: 0,
      y: 16,
      duration: 0.18,
      ease: 'power2.in',
      onComplete: () => {
        flushSync(() => setTab(t))
        refresh()
        gsap.fromTo(body.current, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'back.out(1.5)' })
      },
    })
  }

  return (
    <section className="view view-message">
      <FlexText as="h2" className="msg-title" words={[{ t: tr('nav.message'), w: 760, c: C.red }]} data-intro="ui" data-safe="" />

      <div className="msg-tabs" role="tablist" data-intro="ui">
        <button role="tab" aria-selected={tab === 'write'} className={tab === 'write' ? 'is-on' : ''} onClick={() => go('write')}>
          <Icon name="pencil" color={tab === 'write' ? '#fff' : C.orange} size={20} />
          {tr('msg.write')}
        </button>
        <button role="tab" aria-selected={tab === 'open'} className={tab === 'open' ? 'is-on' : ''} onClick={() => go('open')}>
          <Icon name="envelope" color={tab === 'open' ? '#fff' : C.red} size={20} />
          {tr('msg.open')}
          {!!stats.total && <span className="msg-badge">{stats.total > 99 ? '99+' : stats.total}</span>}
        </button>
      </div>

      <div className="msg-layout" data-intro="ui">
        <Guide />
        <div className="msg-desk" ref={body}>
          {tab === 'write' ? (
            <Writer g={g} stats={stats} onSent={refresh} onOpen={() => go('open')} />
          ) : (
            <Reader g={g} total={stats.total} onChange={refresh} onWrite={() => go('write')} />
          )}
        </div>
      </div>
    </section>
  )
}
