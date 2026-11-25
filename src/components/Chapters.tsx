import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { gsap } from '../gsap'
import { C, releaseWindow } from '../data'
import { chapterByNumber, type Volume } from '../volumes'
import { Icon } from '../icons'
import { sfx } from '../sfx'
import { useT } from '../i18n'


function Starburst() {
  const pts = Array.from({ length: 24 }, (_, i) => {
    const r = i % 2 ? 34 : 48
    const a = (i / 24) * Math.PI * 2
    return `${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`
  }).join(' ')
  return (
    <svg viewBox="0 0 100 100" className="ch-burst" aria-hidden="true">
      <polygon points={pts} fill={C.yellow} stroke={C.yellow} strokeWidth="6" strokeLinejoin="round" />
    </svg>
  )
}

function useCountdown() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const diff = Math.max(0, releaseWindow(now).next - now)
  const p = (n: number) => String(n).padStart(2, '0')
  return { d: Math.floor(diff / 864e5), hms: `${p(Math.floor((diff % 864e5) / 36e5))}:${p(Math.floor((diff % 36e5) / 6e4))}:${p(Math.floor((diff % 6e4) / 1e3))}` }
}

function Upcoming({ n, color }: { n: number; color: string }) {
  const left = useCountdown()
  const { t } = useT()
  return (
    <article className="ch-card is-upcoming" style={{ '--c': color } as CSSProperties}>
      <span className="ch-top">
        <span className="ch-num">{n}</span>
        <span className="ch-kind">{t('ch.next')}</span>
      </span>
      <span className="ch-timer">{t('ch.timer', left)}</span>
      <span className="ch-title">{t('ch.notYet')}</span>
    </article>
  )
}

function ChapterCard({ n, color }: { n: number; color: string }) {
  const ch = chapterByNumber.get(n)
  const { t } = useT()
  if (!ch) return <Upcoming n={n} color={color} />
  return (
    <article className={`ch-card${ch.latest ? ' is-latest' : ''}`} style={{ '--c': color } as CSSProperties}>
      {ch.latest && (
        <>
          <span className="ch-sticker" aria-label={t('ch.latestLabel')}>
            <Starburst />
            <b>NEW</b>
          </span>
          <Icon name="sparkle" color="#fff" size={20} className="ch-spark ch-spark-a" />
          <Icon name="sparkle" color={C.yellow} size={13} className="ch-spark ch-spark-b" />
        </>
      )}
      <span className="ch-top">
        <span className="ch-num">{n}</span>
        {ch.latest && <span className="ch-kind">{t('ch.latest')}</span>}
      </span>
      <span className="ch-title">{ch.title}</span>
      <span className="ch-links">
        {ch.jp.map((u, k) => (
          <a key={u} className="ch-link" href={u} target="_blank" rel="noopener noreferrer">
            {ch.jp.length > 1 ? t('ch.part', { n: k + 1 }) : t('ch.read')} <span aria-hidden="true">↗</span>
          </a>
        ))}
      </span>
    </article>
  )
}

/** Everything about one volume: tags, where to buy, and a card per main chapter. */
export function ChapterPanel({ vol, color }: { vol: Volume; color: string }) {
  const ref = useRef<HTMLElement>(null)
  const { t } = useT()
  // side stories and extras (x.5 and friends) stay out of the list
  const main = vol.chapters.filter((n) => Number.isInteger(n))
  const range = main.length > 1 ? t('vol.range', { a: main[0], b: main[main.length - 1] }) : t('vol.one', { n: main[0] })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollTop = 0
    const items = el.querySelectorAll('.ch-card, .vp-head > *')
    gsap.fromTo(
      items,
      { y: 40, opacity: 0, rotation: () => gsap.utils.random(-8, 8), scale: 0.92 },
      { y: 0, opacity: 1, rotation: 0, scale: 1, duration: 0.7, ease: 'back.out(1.25)', stagger: 0.045, delay: 0.25, clearProps: 'transform' },
    )
    const ids = Array.from({ length: Math.min(items.length, 8) }, (_, i) =>
      window.setTimeout(() => sfx.pop(1 + i * 0.06, 0.5), 300 + i * 70),
    )
    return () => ids.forEach(clearTimeout)
  }, [vol.n])

  return (
    <aside className="v-panel" ref={ref} style={{ '--c': color } as CSSProperties} aria-label={t('vol.chapters', { n: vol.n })}>
      <header className="vp-head">
        <div className="vp-title">
          <span className="vp-vol">vol.</span>
          <b>{vol.n}</b>
        </div>
        <div className="vp-row">
          <div className="vp-tags">
            <span className="tag">{range}</span>
            {vol.anime && <span className="tag tag-anime">{t('vol.anime', { n: vol.anime.replace(/\D/g, '') })}</span>}
            {vol.inProgress && <span className="tag tag-live">{t('vol.inProgress')}</span>}
          </div>
          {(vol.buyEn || vol.buyJp) && (
            <div className="vp-buy">
              {vol.buyEn && (
                <a className="buy" href={vol.buyEn} target="_blank" rel="noopener noreferrer">
                  <Icon name="bag" color="currentColor" size={22} />
                  <span className="buy-text">
                    <b>
                      {t('vol.en')}
                      <span className="bt-more">{t('vol.enMore')}</span>
                    </b>
                    <small>Penguin Random House</small>
                  </span>
                </a>
              )}
              {vol.buyJp && (
                <a className="buy buy-alt" href={vol.buyJp} target="_blank" rel="noopener noreferrer">
                  <Icon name="bag" color="currentColor" size={22} />
                  <span className="buy-text">
                    <b>
                      <span className="bt-more">{t('vol.jpMore')}</span>
                      <span lang="ja">日本語版</span>
                    </b>
                    <small>Amazon Japan</small>
                  </span>
                </a>
              )}
            </div>
          )}
        </div>
      </header>
      <div className="vp-grid">
        {main.map((n) => (
          <ChapterCard key={n} n={n} color={color} />
        ))}
      </div>
    </aside>
  )
}
