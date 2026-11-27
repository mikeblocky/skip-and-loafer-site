import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import { gsap } from '../../gsap'
import { C } from '../../data'
import { Icon } from '../../icons'
import { sfx } from '../../sfx'
import { cleanSigner, cleanText, LETTER_MIN, NAME_MAX, safeColor } from '../../letterRules'
import { cleanTo, GIFTS_PER_PERSON, INSIDE, safeInside, TAG_MAX, tagProblem, WRAPS, type Inside } from '../../santa'
import { serverText, useT, type Key } from '../../i18n'
import { clientId, store } from '../message/mail'
import { PAPER, reduced } from '../message/geometry'
import { centre, confetti } from '../message/confetti'
import { local, santaApi, santaPost, type Wrapped } from './season'
import { Present } from './Present'
import { Ideas } from './Ideas'
import { questLetter } from '../../quest'
import { Flip, inkOn, LetterBack } from './Letter'
import { preparePicture, uploadPicture, type Picture } from './picture'

type Step = 'compose' | 'sending' | 'sent'

const finished = (tl: gsap.core.Timeline) => new Promise<void>((done) => tl.eventCallback('onComplete', () => done()))
const rewound = (tl: gsap.core.Timeline) =>
  new Promise<void>((done) => {
    if (tl.time() < 0.02) {
      tl.progress(0).pause()
      return done()
    }
    tl.eventCallback('onReverseComplete', () => done())
    tl.timeScale(2.4).reverse()
  })
const PICS = 'image/jpeg,image/png,image/webp,image/gif'

/** The writing half: a letter on the bench, which turns over and flies into the big box. */
export function Workshop({ burstDate, start, end }: { burstDate: string; start: string; end: string }) {
  const { t } = useT()
  const small = typeof window !== 'undefined' && window.innerWidth < 760
  const BIG = small ? 150 : 210

  const [inside, setInside] = useState<Inside>(() => safeInside(store.read('sl-santa-inside', INSIDE[0])))
  const [wrap, setWrap] = useState(() => safeColor(store.read('sl-santa-wrap', WRAPS[0])))
  const [text, setText] = useState(() => store.read<string>('sl-santa-draft', ''))
  const [from, setFrom] = useState(() => store.read<string>('sl-msg-from', ''))
  const [to, setTo] = useState(() => store.read<string>('sl-santa-to', ''))
  const [pic, setPic] = useState<Picture | null>(null)
  const [squeezing, setSqueezing] = useState(false)
  const [picsOn, setPicsOn] = useState(false)
  const [step, setStep] = useState<Step>('compose')
  const [err, setErr] = useState<string | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [mine, setMine] = useState<Wrapped[]>(local.sent)
  const [round, setRound] = useState(0)
  const letter = useRef<HTMLDivElement>(null)
  const writing = useRef<HTMLTextAreaElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const anims = useRef<gsap.core.Animation[]>([])

  useEffect(() => store.write('sl-santa-inside', inside), [inside])
  useEffect(() => store.write('sl-santa-wrap', wrap), [wrap])
  useEffect(() => store.write('sl-santa-draft', text), [text])
  useEffect(() => store.write('sl-msg-from', from), [from])
  useEffect(() => store.write('sl-santa-to', to), [to])
  useEffect(() => () => anims.current.forEach((a) => a.kill()), [])
  useEffect(() => () => void (pic && URL.revokeObjectURL(pic.url)), [pic])

  // how full the box is, whether pictures are on, and which of yours are still in it
  useEffect(() => {
    santaApi<{ total: number; pics?: boolean }>(undefined, '?count')
      .then((d) => {
        setTotal(d.total)
        setPicsOn(!!d.pics)
      })
      .catch(() => {})
    const ids = local.sent().map((g) => g.id)
    if (!ids.length) return
    santaApi<{ have: string[] }>(undefined, `?mine=${ids.join(',')}`)
      .then((d) => {
        const keep = local.sent().filter((g) => d.have.includes(g.id))
        local.setSent(keep)
        setMine(keep)
      })
      .catch(() => {})
  }, [])

  // a fresh letter lies face up
  useLayoutEffect(() => {
    const el = letter.current
    if (!el || step !== 'compose') return
    gsap.set(el, { clearProps: 'transform,opacity,visibility' })
    gsap.set(el.querySelector('.sv-in'), { rotationY: 0 })
  }, [step, round])

  const pickInside = (k: Inside) => {
    setInside(k)
    const stamp = letter.current?.querySelector('.sv-edit .sv-stamp')
    if (stamp) gsap.fromTo(stamp, { scale: 0.5, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2.2)' })
    sfx.pop(1 + INSIDE.indexOf(k) * 0.04)
  }

  const attach = async (file: File | undefined) => {
    if (!file) return
    setErr(null)
    setSqueezing(true)
    try {
      setPic(await preparePicture(file))
      sfx.pop(1.2)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'that file isn’t a picture we can use')
    } finally {
      setSqueezing(false)
    }
  }

  const body = cleanText(text)
  const signer = cleanSigner(from)
  const toName = cleanTo(to)
  const len = Array.from(body).length
  const full = mine.length >= GIFTS_PER_PERSON
  const why = full ? 'that’s plenty of gifts from you' : squeezing ? 'busy' : tagProblem(body, signer, toName)
  const said = err ?? (full || len >= LETTER_MIN || len > TAG_MAX ? why : null)
  const shown = said && said !== 'busy' ? serverText(said, t) : null

  const send = async () => {
    if (why || step !== 'compose') return
    setErr(null)
    flushSync(() => setStep('sending'))
    const el = letter.current!
    const inner = el.querySelector('.sv-in')!
    const holding = pic
    const request = (holding ? uploadPicture(holding) : Promise.resolve(null)).then((picId) =>
      santaPost<{ id: string; total: number }>({
        action: 'send',
        text: body,
        from: signer,
        to: toName,
        wrap,
        inside,
        pic: picId && holding ? { id: picId, w: holding.w, h: holding.h } : null,
        me: clientId(),
      }),
    )

    // it turns over: the envelope side, stamp and all
    const seal = gsap.timeline()
    anims.current.push(seal)
    seal.call(() => sfx.fold(0), [], 0)
    seal.to(el, { scale: 0.9, duration: 0.2, ease: 'power2.out' }, 0)
    seal.to(inner, { rotationY: 180, duration: 0.7, ease: 'power2.inOut' }, 0.05)
    seal.to(el, { scale: 1, duration: 0.3, ease: 'back.out(2)' }, 0.6)
    seal.call(() => sfx.stamp(), [], 0.8)
    seal.call(
      () => {
        if (seal.reversed()) return
        const s = el.querySelector('.sv-back .sv-stamp')
        if (!s) return
        const p = centre(s)
        confetti(p.x, p.y, { n: 12, spread: 200, reach: 60, colors: [wrap, C.yellow, C.teal] })
      },
      [],
      0.82,
    )
    if (reduced()) seal.timeScale(3)

    let d: { id: string; total: number }
    try {
      ;[d] = await Promise.all([request, finished(seal)])
    } catch (e) {
      // the box said no: turn it face up again and hand the pen back
      await rewound(seal)
      setErr(e instanceof Error ? e.message : 'couldn’t reach the mailbox, try again later')
      setStep('compose')
      return
    }

    // a hop, then a long spinning arc into the big box, whose lid pops up to catch it
    const a = centre(el)
    const target = box.current ? centre(box.current) : { x: a.x, y: -200, r: { height: 0 } as DOMRect }
    const dx = target.x - a.x
    const dy = target.y - a.y - target.r.height * 0.25
    const peak = Math.min(0, dy) - 160
    const big = box.current ? gsap.utils.selector(box.current) : null
    const fly = gsap.timeline()
    anims.current.push(fly)
    fly.to(el, { y: 12, duration: 0.14, ease: 'power2.out' })
    fly.call(() => sfx.whoosh(0.7, true, 0.22))
    fly.to(el, { x: dx, rotation: 400, scale: 0.12, duration: 0.95, ease: 'power1.inOut' }, '>')
    fly.to(el, { y: peak, duration: 0.47, ease: 'power2.out' }, '<')
    fly.to(el, { y: dy, duration: 0.48, ease: 'power2.in' }, '>')
    if (big) fly.to(big('.pr-lid'), { y: -BIG * 0.32, rotation: -12, duration: 0.3, ease: 'back.out(2)' }, '<-0.2')
    fly.set(el, { autoAlpha: 0 })
    if (big) {
      fly.call(() => sfx.thud())
      fly.to(big('.pr-lid'), { y: 0, rotation: 0, duration: 0.35, ease: 'bounce.out' })
      fly.to(box.current, { scaleY: 0.9, scaleX: 1.06, duration: 0.09, yoyo: true, repeat: 1, transformOrigin: '50% 100%' }, '<0.1')
      fly.call(() => {
        const p = centre(big('.pr-bow')[0])
        confetti(p.x, p.y, { n: 24, spread: 220, reach: 120, colors: [C.teal, C.red, C.yellow, wrap] })
        sfx.chime(1.2, 0.6)
      })
    }
    if (reduced()) fly.timeScale(3)
    await finished(fly)

    const entry: Wrapped = { id: d.id, inside, wrap, text: body, to: toName, at: Date.now() }
    const next = [...mine, entry]
    local.setSent(next)
    setMine(next)
    setTotal(d.total)
    setText('')
    setPic(null)
    setStep('sent')
    questLetter('santa')
  }

  const again = () => {
    setErr(null)
    setRound((r) => r + 1)
    setStep('compose')
  }

  const takeBack = async (g: Wrapped) => {
    setErr(null)
    try {
      const d = await santaPost<{ total: number }>({ action: 'back', id: g.id, me: clientId() })
      const keep = mine.filter((x) => x.id !== g.id)
      local.setSent(keep)
      setMine(keep)
      setTotal(d.total)
      sfx.rustle()
      // nothing on the bench yet: hand the words back so they can be changed and sent again
      if (!text.trim() && step === 'compose') {
        setText(g.text)
        setInside(g.inside)
        setWrap(safeColor(g.wrap))
        setTo(g.to ?? '')
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'couldn’t reach the mailbox, try again later')
    }
  }

  const count = total === null ? '' : total === 0 ? t('santa.box0') : total === 1 ? t('santa.box1') : t('santa.boxN', { n: total })
  const locked = step !== 'compose'

  const editor = (
    <div className="sv-front sv-edit" style={{ '--w': wrap } as CSSProperties}>
      <div className="sv-head">
        <label className="sv-to-line">
          <span>{t('santa.to')}</span>
          <input
            value={to}
            maxLength={NAME_MAX}
            placeholder={t('santa.toEveryone')}
            onChange={(e) => {
              setTo(e.target.value)
              setErr(null)
            }}
            disabled={locked}
            aria-label={t('santa.toName')}
          />
        </label>
        <span className="sv-stamp" aria-hidden="true">
          <Icon name={inside} color="#fff" size="62%" />
        </span>
      </div>
      {toName && <p className="sv-to-hint">{t('santa.toHint')}</p>}
      <div className="sv-write">
        <textarea
          ref={writing}
          value={text}
          maxLength={TAG_MAX + 40}
          placeholder={locked ? t('santa.placeholder') : undefined}
          onChange={(e) => {
            setText(e.target.value)
            setErr(null)
          }}
          disabled={locked}
          aria-label={t('santa.tag')}
        />
        {/* an empty letter suggests a few lines, typed out one after another */}
        {!text && !locked && (
          <Ideas
            onUse={(idea) => {
              setText(idea)
              setErr(null)
              sfx.rustle()
              requestAnimationFrame(() => {
                const el = writing.current
                el?.focus()
                el?.setSelectionRange(idea.length, idea.length)
              })
            }}
          />
        )}
      </div>
      {pic ? (
        <div className="sv-pic-edit">
          <img src={pic.url} width={pic.w} height={pic.h} alt="" />
          {!locked && (
            <button className="sv-pic-x" onClick={() => setPic(null)} aria-label={t('santa.removePic')} title={t('santa.removePic')}>
              <Icon name="close" color={C.ink} size={18} />
            </button>
          )}
        </div>
      ) : (
        picsOn && (
          <label className={`sv-add-pic${squeezing ? ' is-busy' : ''}`}>
            <input
              type="file"
              accept={PICS}
              disabled={locked || squeezing}
              onChange={(e) => {
                attach(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <Icon name="picture" color={inkOn(wrap)} size={20} />
            {squeezing ? t('santa.picWorking') : t('santa.addPic')}
          </label>
        )
      )}
      <div className="sv-sign">
        —{' '}
        <input value={from} maxLength={NAME_MAX} placeholder={t('msg.anon')} onChange={(e) => setFrom(e.target.value)} disabled={locked} aria-label={t('msg.signAs')} />
      </div>
    </div>
  )

  return (
    <div className="ss-collect" data-intro="ui">
      <aside className="ss-card ss-how">
        <h3>
          <Icon name="list" color={C.teal} size={20} />
          {t('santa.how')}
        </h3>
        <ol>
          <li>{t('santa.step1')}</li>
          <li>{t('santa.step2')}</li>
          <li>{t('santa.step3', { start, end })}</li>
        </ol>
      </aside>

      <div className="ss-bench">
        {step === 'sent' ? (
          <div className="ss-dropped">
            <Icon name="envelope" color={C.teal} size={40} />
            <p>{t('santa.dropped', { date: burstDate })}</p>
            <button className="msg-btn ss-btn" onClick={again}>
              <Icon name="pencil" color="#fff" size={22} />
              {t('santa.wrapAnother')}
            </button>
          </div>
        ) : (
          <>
            <div ref={letter} className="ss-letter" key={round}>
              <Flip front={editor} back={<LetterBack wrap={wrap} inside={inside} to={toName} />} />
            </div>

            <div className="ss-pick">
              <span className="ss-label">
                {t('santa.inside')}: <b>{t(`santa.in.${inside}` as Key)}</b>
              </span>
              <div className="ss-insides" role="radiogroup" aria-label={t('santa.inside')}>
                {INSIDE.map((k) => (
                  <button
                    key={k}
                    role="radio"
                    aria-checked={k === inside}
                    aria-label={t(`santa.in.${k}` as Key)}
                    title={t(`santa.in.${k}` as Key)}
                    className={`ss-inside${k === inside ? ' is-on' : ''}`}
                    onClick={() => pickInside(k)}
                    disabled={locked}
                  >
                    <Icon name={k} color={k === inside ? '#fff' : C.teal} size={22} />
                  </button>
                ))}
              </div>
              <span className="ss-label">{t('msg.paper')}</span>
              <div className="wr-papers ss-wraps" role="radiogroup" aria-label={t('msg.paper')}>
                {WRAPS.map((c) => (
                  <button
                    key={c}
                    role="radio"
                    aria-checked={c === wrap}
                    aria-label={t('msg.paperOf', { name: t(PAPER[c].name) })}
                    title={t(PAPER[c].name)}
                    className={`wr-paper${c === wrap ? ' is-on' : ''}`}
                    style={{ '--sw': c } as CSSProperties}
                    onClick={() => setWrap(c)}
                    disabled={locked}
                  >
                    <Icon name={PAPER[c].icon} color="#fff" size={18} />
                  </button>
                ))}
              </div>
            </div>

            <div className="wr-meta ss-meta">
              <p className={`wr-hint${shown ? ' is-bad' : ''}`} role="status">
                {shown ?? t('msg.signHint')}
              </p>
              <span className={`wr-count${len > TAG_MAX ? ' is-over' : ''}`}>
                {len}/{TAG_MAX}
              </span>
            </div>
            <button className="msg-btn ss-btn" onClick={send} disabled={!!why || locked}>
              <Icon name="plane" color="#fff" size={22} />
              {t('santa.send')}
            </button>
          </>
        )}
      </div>

      <div className="ss-side">
        <div className="ss-bigbox-wrap">
          <Present ref={box} wrap={C.teal} ribbon={C.red} size={BIG} className="ss-bigbox" />
        </div>
        <p className="ss-count" aria-live="polite">
          {count}
        </p>
        {mine.length > 0 && (
          <div className="ss-card ss-mine">
            <h3>{t('santa.yours')}</h3>
            <ul>
              {mine.map((g) => (
                <li key={g.id}>
                  <span className="ss-mine-ico" style={{ background: safeColor(g.wrap) }}>
                    <Icon name={safeInside(g.inside)} color="#fff" size={16} />
                  </span>
                  <span className="ss-mine-text">
                    {g.to && <b>{g.to}: </b>}
                    {g.text}
                  </span>
                  <button className="ss-link" onClick={() => takeBack(g)}>
                    {t('santa.takeBack')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
