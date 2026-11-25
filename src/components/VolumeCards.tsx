import { useEffect, useRef, type CSSProperties } from 'react'
import { gsap, Draggable, GRAB, velocityTracker } from '../gsap'
import { VOLUMES } from '../data'
import { LATEST_VOLUME } from '../volumes'
import { Icon } from '../icons'
import { useCoverColors } from '../coverColors'
import { sfx } from '../sfx'
import { openSecret } from '../secrets'
import { useT } from '../i18n'

const TILTS = [-4, 3, -2, 5, -3, 2, -5, 4, -2, 3, -4, 2, -3, 5]

export function VolumeCards({ hidden, onOpen }: { hidden: number | null; onOpen: (index: number) => void }) {
  const wrap = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const colors = useCoverColors()
  const { t: tr } = useT()
  const openRef = useRef(onOpen)
  openRef.current = onOpen

  useEffect(() => {
    const t = track.current!
    const lean = { v: 0 }
    const setLean = () => t.style.setProperty('--lean', `${lean.v.toFixed(2)}deg`)
    const vt = velocityTracker()
    // a ratchet tick each time a card's width slides past
    let notch = 0
    const onMove = function (this: Draggable) {
      const step = (t.querySelector<HTMLElement>('.vcard')?.offsetWidth ?? 200) + 18
      const n = Math.round(this.x / step)
      if (n !== notch) {
        notch = n
        sfx.tick(1 + (n % 3) * 0.08)
      }
      const { vx } = vt.sample(this.x, 0)
      gsap.to(lean, { v: gsap.utils.clamp(-16, 16, -vx / 80), duration: 0.35, ease: 'power3.out', overwrite: true, onUpdate: setLean })
    }
    const settle = () =>
      gsap.to(lean, { v: 0, duration: 1.6, ease: 'elastic.out(1, 0.75)', overwrite: true, onUpdate: setLean })

    // hidden extra: drag the shelf past the very last volume (into the edge resistance) and let go
    let overPulled = false
    const end = t.querySelector<HTMLElement>('.vcard-end')
    const checkPull = function (this: Draggable) {
      const past = this.x < this.minX - 28
      if (past !== overPulled) {
        overPulled = past
        end?.classList.toggle('is-near', past)
        if (past) sfx.tick(1.5)
      }
    }

    const [d] = Draggable.create(t, {
      type: 'x',
      bounds: wrap.current,
      inertia: true,
      edgeResistance: 0.8,
      minimumMovement: 6,
      ...GRAB,
      onPress(this: Draggable) {
        vt.reset(this.x, 0)
        notch = Math.round(this.x / ((t.querySelector<HTMLElement>('.vcard')?.offsetWidth ?? 200) + 18))
      },
      onDrag(this: Draggable) {
        onMove.call(this)
        checkPull.call(this)
      },
      onThrowUpdate: onMove,
      onRelease(this: Draggable) {
        if (!this.isThrowing) settle()
        if (overPulled) {
          overPulled = false
          end?.classList.remove('is-near')
          window.setTimeout(() => openSecret('quiz'), 250)
        }
      },
      onThrowComplete: () => (settle(), sfx.boing()),
      onClick(e: PointerEvent) {
        const b = (e.target as HTMLElement).closest<HTMLElement>('[data-vol]')
        if (b) openRef.current(Number(b.dataset.vol))
      },
    })

    const fit = () => {
      d.update(true)
      if (d.minX >= d.maxX) {
        gsap.set(t, { x: 0 })
        d.disable()
      } else d.enable()
    }
    fit()
    gsap.fromTo(t, { x: d.maxX - 220 }, { x: d.maxX, duration: 1.5, ease: 'expo.out', onUpdate: () => d.update() })
    gsap.fromTo(
      t.querySelectorAll('.vcard'),
      { y: 320, rotation: () => gsap.utils.random(-30, 30), opacity: 0 },
      {
        y: 0,
        rotation: 0,
        opacity: 1,
        duration: 1,
        ease: 'back.out(1.25)',
        stagger: 0.05,
        delay: 0.15,
        clearProps: 'transform,opacity',
      },
    )
    window.addEventListener('resize', fit)
    const refit = window.setTimeout(fit, 1300)
    return () => {
      clearTimeout(refit)
      window.removeEventListener('resize', fit)
      d.kill()
    }
  }, [])

  return (
    <div className="cards" data-intro="ui" data-safe>
      <div className="cards-wrap" ref={wrap}>
        <div className="cards-track" ref={track}>
          {VOLUMES.map((v, i) => (
            <div
              key={v.n}
              className={`vcard${hidden === i ? ' is-out' : ''}`}
              data-vol={i}
              role="button"
              tabIndex={0}
              aria-label={tr('vol.label', { n: v.n })}
              style={{ '--c': colors[i], '--t': `${TILTS[i % TILTS.length]}deg` } as CSSProperties}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onOpen(i)
                }
              }}
            >
              <div className="vcard-lean">
                <div className="vcard-face">
                  <Icon name={v.icon} color="currentColor" size="46%" className="vcard-mark" />
                  {i === LATEST_VOLUME && <span className="vcard-new">NEW</span>}
                  {v.inProgress && i !== LATEST_VOLUME && <span className="vcard-flag">{tr('vol.inProgress')}</span>}
                  {!v.src && <span className="vcard-soon" />}
                  <span className="vcard-vol">vol.</span>
                  <span className="vcard-num">{v.n}</span>
                  <span className="vcard-jp" lang="ja">
                    スキップとローファー
                  </span>
                </div>
              </div>
            </div>
          ))}
          {/* a faint hint at the very end of the shelf */}
          <div className="vcard-end" aria-hidden="true">
            <span>?</span>
          </div>
        </div>
      </div>
    </div>
  )
}

