import { useEffect, useRef, useState } from 'react'
import { liveTicket, newCode, quest, siteAltered } from '../../quest'
import { sfx } from '../../sfx'

/**
 * A Ueno Park ticket with a silver scratch strip, tucked at the bottom of an old update.
 * Scratching it far enough reveals a code; the code is drawn fresh each time it's scratched
 * and only works for a while (TICKET_LIFE), so nobody can pass theirs around.
 */
export function Ticket() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const used = quest.get().part1 !== 'none'
  const [live, setLive] = useState(() => liveTicket())
  // the code under the silver: the live one if there is one, else a new one waiting to be scratched
  const [code] = useState(() => live?.code ?? newCode())
  const shown = live?.code ?? code
  const revealed = !!live || used

  useEffect(() => {
    if (revealed) return
    const c = canvas.current!
    const box = c.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    c.width = box.width * dpr
    c.height = box.height * dpr
    const g = c.getContext('2d')!
    g.scale(dpr, dpr)
    // the silver layer: flat foil with a scatter of specks
    g.fillStyle = '#d4d1da'
    g.fillRect(0, 0, box.width, box.height)
    g.fillStyle = 'rgb(255 255 255 / 0.55)'
    for (let i = 0; i < 60; i++) g.fillRect(Math.random() * box.width, Math.random() * box.height, 1.5, 1.5)
    g.fillStyle = 'rgb(29 27 44 / 0.42)'
    g.font = "800 12px Allo, system-ui, sans-serif"
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('scratch here', box.width / 2, box.height / 2)
    g.globalCompositeOperation = 'destination-out'
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.lineWidth = 22

    let down = false
    let last: { x: number; y: number } | null = null
    let strokes = 0
    let done = false
    const at = (e: PointerEvent) => {
      const r = c.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const cleared = () => {
      const { data } = g.getImageData(0, 0, c.width, c.height)
      let clear = 0
      // every 16th pixel is plenty
      for (let i = 3; i < data.length; i += 64) if (data[i] === 0) clear++
      return clear / (data.length / 64)
    }
    const scratch = (e: PointerEvent) => {
      if (!down || done) return
      const p = at(e)
      g.beginPath()
      g.moveTo(last?.x ?? p.x, last?.y ?? p.y)
      g.lineTo(p.x, p.y)
      g.stroke()
      last = p
      if (++strokes % 6 === 0) {
        sfx.tick(1.6 + Math.random() * 0.4, 0.5)
        if (cleared() > 0.55) reveal()
      }
    }
    const reveal = () => {
      if (done) return
      done = true
      quest.update((s) => ({ ...s, ticket: { code, at: Date.now() } }))
      setLive(liveTicket())
      sfx.chime(1.3, 0.8)
    }
    // from the keyboard: Enter or Space scratches the whole strip at once
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      reveal()
    }
    const press = (e: PointerEvent) => {
      down = true
      last = null
      c.setPointerCapture(e.pointerId)
      scratch(e)
    }
    const lift = () => {
      down = false
      last = null
    }
    c.addEventListener('pointerdown', press)
    c.addEventListener('pointermove', scratch)
    c.addEventListener('pointerup', lift)
    c.addEventListener('pointercancel', lift)
    c.addEventListener('keydown', key)
    return () => {
      c.removeEventListener('keydown', key)
      c.removeEventListener('pointerdown', press)
      c.removeEventListener('pointermove', scratch)
      c.removeEventListener('pointerup', lift)
      c.removeEventListener('pointercancel', lift)
    }
  }, [revealed, code])

  return (
    <div className={`qt${used ? ' is-used' : ''}`} lang="en">
      <div className="qt-stub" aria-hidden="true">
        <span lang="ja">入園券</span>
        <b>No. 1225</b>
      </div>
      <div className="qt-main">
        <div className="qt-head">
          <span className="qt-jp" lang="ja">
            上野恩賜公園
          </span>
          <span className="qt-en">Ueno Park · admit one</span>
        </div>
        <div className="qt-scratch">
          <span className="qt-code" aria-live="polite">
            {shown}
          </span>
          {!revealed && (
            <canvas
              ref={canvas}
              className="qt-foil"
              role="button"
              tabIndex={0}
              aria-label="Scratch the silver strip"
            />
          )}
        </div>
        <span className={`qt-fine${used && siteAltered() ? ' is-altered' : ''}`}>{used && siteAltered() ? 'Do you remember it right?' : used && quest.get().keys.includes('silver') ? 'See you in part 3.' : used ? 'Used. Thank you for visiting!' : revealed ? 'Valid for one hour. Redeem at the gate where it all began.' : 'Secret Santa · not for resale'}</span>
      </div>
      {used && <i className="qt-stamp">used</i>}
    </div>
  )
}
