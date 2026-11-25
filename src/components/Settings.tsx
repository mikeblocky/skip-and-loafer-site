import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { C } from '../data'
import { Icon, type IconName } from '../icons'
import { sfx } from '../sfx'
import { COLOR_FILTERS, settings, useSettings, type Settings } from '../settings'
import { FocusDemo, MotionDemo, ReadingDemo, SeeingDemo } from './SettingsDemos'
import { LANGS, deviceLang, langName, useT, type Key } from '../i18n'
import { lyricLangs } from '../i18n/lyrics'
import { PagePicker } from './SettingsPicker'
import { GameShortcuts } from './SettingsGames'
import { quest } from '../quest'

/**
 * One place for sound and accessibility options. A dialog over the page: focus stays inside
 * while it's open, Escape or the × closes it, and focus goes back to the gear afterwards.
 * Every change applies at once and is remembered on this device (see ../settings).
 */

const set = (patch: Partial<Settings>) => settings.set(patch)

type SectionId = 'language' | 'sound' | 'motion' | 'seeing' | 'reading' | 'focus' | 'page' | 'games' | 'countdown' | 'karaoke'

/** each section's title is `sec.<id>` in the language files */
const SECTIONS: { id: SectionId; icon: IconName; color: string }[] = [
  { id: 'language', icon: 'bubble', color: C.teal },
  { id: 'sound', icon: 'sound', color: C.pink },
  { id: 'motion', icon: 'sparkle', color: C.violet },
  { id: 'seeing', icon: 'sun', color: C.orange },
  { id: 'reading', icon: 'book', color: C.blue },
  { id: 'focus', icon: 'star', color: C.green },
  { id: 'page', icon: 'smile', color: C.magenta },
  { id: 'games', icon: 'capsule', color: C.orange },
  { id: 'countdown', icon: 'clock', color: C.red },
  { id: 'karaoke', icon: 'note', color: C.sky },
]
const titleKey = (id: SectionId) => `sec.${id}` as Key
const sectionId = (id: SectionId) => `st-sec-${id}`

function Section({ id, demo, children }: { id: SectionId; demo?: ReactNode; children: ReactNode }) {
  const { icon, color } = SECTIONS.find((x) => x.id === id)!
  const { t } = useT()
  const hid = useId()
  return (
    <section id={sectionId(id)} className="st-sec" aria-labelledby={hid} style={{ '--c': color } as CSSProperties}>
      <h3 id={hid}>
        <span className="st-ico" aria-hidden="true">
          <Icon name={icon} color={color} size={18} />
        </span>
        {t(titleKey(id))}
      </h3>
      {demo}
      {children}
    </section>
  )
}

/** scroll the settings list (only the list) to a section and put focus on its first control */
function goTo(id: SectionId) {
  const el = document.getElementById(sectionId(id))
  const list = el?.closest<HTMLElement>('.st-body')
  if (!el || !list) return
  list.scrollTo({ top: el.offsetTop - 8, behavior: document.documentElement.dataset.motion === 'reduce' ? 'auto' : 'smooth' })
  el.querySelector<HTMLElement>('input, button')?.focus({ preventScroll: true })
  // a soft glow in the section's colour so your eye lands on it (restarts if you jump again)
  el.classList.remove('is-flash')
  void el.offsetWidth
  el.classList.add('is-flash')
  el.addEventListener('animationend', () => el.classList.remove('is-flash'), { once: true })
}

/** e.g. "Version 1.0.0 · f02ba2a · 25 Nov 2026", from what vite.config.ts stamped in */
function BuildInfo() {
  const { t, locale } = useT()
  const b = __BUILD__
  const when = new Date(b.date)
  const day = when.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
  return (
    <p className="st-build" title={when.toLocaleString(locale)}>
      {t('st.version')} {b.version} · <span className="st-build-sha">{b.sha}</span> · {day}
      {b.dev && ' · dev'}
    </p>
  )
}

/** Which section is at the top of the list right now, followed as you scroll. */
function useCurrentSection(body: React.RefObject<HTMLDivElement | null>) {
  const [current, setCurrent] = useState<SectionId>('sound')
  useEffect(() => {
    const el = body.current
    if (!el) return
    let raf = 0
    const check = () => {
      raf = 0
      const y = el.scrollTop + 40
      let at: SectionId = SECTIONS[0].id
      for (const x of SECTIONS) {
        const sec = document.getElementById(sectionId(x.id))
        if (sec && sec.offsetTop <= y) at = x.id
      }
      // scrolled to the very end: the last sections may be too short to reach the top
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) at = SECTIONS[SECTIONS.length - 1].id
      setCurrent(at)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check)
    }
    check()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [body])
  return current
}

/**
 * Getting around the panel. Wide screens get a list of sections down the side, with a pill that
 * slides to whichever one you're reading; phones get a "Jump to" dropdown above the settings.
 * Both are always in the page and CSS shows the right one (the hidden one can't be tabbed to).
 */
function Jump({ current }: { current: SectionId }) {
  const { t } = useT()
  const at = SECTIONS.findIndex((x) => x.id === current)
  const cur = SECTIONS[at]
  return (
    <>
      <nav className="st-side" aria-label={t('st.sections')} style={{ '--i': at, '--c': cur.color } as CSSProperties}>
        <span className="st-side-pill" aria-hidden="true" />
        {SECTIONS.map((x) => (
          <button
            key={x.id}
            className={x.id === current ? 'is-on' : ''}
            aria-current={x.id === current ? 'true' : undefined}
            onClick={() => goTo(x.id)}
            style={{ '--c': x.color } as CSSProperties}
          >
            <Icon name={x.icon} color={x.color} size={18} />
            <span>{t(titleKey(x.id))}</span>
          </button>
        ))}
      </nav>
      <div className="st-jump" style={{ '--c': cur.color } as CSSProperties}>
        <Choice
          label={t('st.jump')}
          value={current}
          options={SECTIONS.map((x) => ({ v: x.id, label: t(titleKey(x.id)) }))}
          onChange={goTo}
        />
      </div>
    </>
  )
}

function Slider({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  const id = useId()
  const pct = Math.round(value * 100)
  return (
    <div className={`st-row st-slider${disabled ? ' is-off' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {/* a real range input, drawn as a coloured fill with a thumb that grows while you drag it */}
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={pct}
        disabled={disabled}
        aria-valuetext={`${pct}%`}
        style={{ '--p': `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        // a soft tick on release so you can hear the new level (it plays on the effects bus)
        onPointerUp={() => sfx.tick(1, 1)}
        onKeyUp={(e) => e.key.startsWith('Arrow') && sfx.tick(1, 1)}
      />
      <output htmlFor={id}>{pct}%</output>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId()
  return (
    <div className="st-row st-toggle">
      <label htmlFor={id}>{label}</label>
      {/* a real checkbox, drawn as a pill whose knob springs across */}
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => {
          sfx.click(e.target.checked ? 1.1 : 0.9)
          onChange(e.target.checked)
        }}
      />
    </div>
  )
}

type Opt<T> = { v: T; label: string }

/**
 * A dropdown in the site's style: a button showing the current choice and a list that pops open
 * under it (or above it, near the bottom of the panel). Built as an ARIA "select-only combobox":
 * focus stays on the button, the arrow keys move through the options, Enter or Space picks,
 * Escape closes just the list, and typing a letter jumps to an option starting with it.
 * Options can come in labelled groups.
 */
function Choice<T extends string>({
  label,
  value,
  options = [],
  groups = [],
  onChange,
}: {
  label: string
  value: T
  options?: Opt<T>[]
  groups?: { group: string; options: Opt<T>[] }[]
  onChange: (v: T) => void
}) {
  const id = useId()
  const labelId = `${id}-l`
  const listId = `${id}-list`
  const flat = [...options, ...groups.flatMap((g) => g.options)]
  const index = (v: T) =>
    Math.max(
      0,
      flat.findIndex((o) => o.v === v),
    )
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(() => index(value))
  const [up, setUp] = useState(false)
  const [room, setRoom] = useState(300)
  const wrap = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const current = flat[index(value)]

  const show = () => {
    setActive(index(value))
    // open upwards if there isn't room below inside the panel's scrolling list
    const b = btn.current?.getBoundingClientRect()
    const box = btn.current?.closest('.st-body')?.getBoundingClientRect()
    if (b && box) {
      const need = Math.min(300, flat.length * 40 + groups.length * 30 + 12)
      const below = box.bottom - b.bottom
      const above = b.top - box.top
      // like a native menu: open downwards unless that leaves less than a few rows' room
      const flip = below < Math.min(need, 180) && above > below
      setUp(flip)
      // never taller than the space it opens into, so the panel never cuts it off
      setRoom(Math.max(120, Math.min(300, (flip ? above : below) - 14)))
    }
    setOpen(true)
    sfx.tick(1.2, 0.8)
  }
  const pick = (i: number) => {
    setOpen(false)
    sfx.click(1.05)
    if (flat[i].v !== value) onChange(flat[i].v)
  }

  // a tap anywhere else closes it
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    // like a native menu, it closes if the panel scrolls under it
    const scroller = wrap.current?.closest('.st-body')
    const away = () => setOpen(false)
    document.addEventListener('pointerdown', down, true)
    scroller?.addEventListener('scroll', away, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', down, true)
      scroller?.removeEventListener('scroll', away)
    }
  }, [open])

  // keep the highlighted option in view inside the list (only the list scrolls, not the panel)
  useEffect(() => {
    const ul = list.current
    const li = ul?.querySelector<HTMLElement>(`[data-i="${active}"]`)
    if (!open || !ul || !li) return
    const top = li.offsetTop
    const bottom = top + li.offsetHeight
    if (top < ul.scrollTop + 4) ul.scrollTop = top - 4
    else if (bottom > ul.scrollTop + ul.clientHeight - 4) ul.scrollTop = bottom - ul.clientHeight + 4
  }, [open, active])

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key
    if (!open) {
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ') {
        e.preventDefault()
        show()
      }
      return
    }
    if (k === 'ArrowDown') setActive((a) => Math.min(flat.length - 1, a + 1))
    else if (k === 'ArrowUp') setActive((a) => Math.max(0, a - 1))
    else if (k === 'Home' || k === 'PageUp') setActive(0)
    else if (k === 'End' || k === 'PageDown') setActive(flat.length - 1)
    else if (k === 'Enter' || k === ' ') pick(active)
    else if (k === 'Escape') setOpen(false)
    else if (k === 'Tab') return setOpen(false)
    else if (k.length === 1 && /\S/.test(k)) {
      // type-ahead: the next option starting with that letter
      const c = k.toLowerCase()
      const order = [...flat.keys()].map((n) => (active + 1 + n) % flat.length)
      const hit = order.find((n) => flat[n].label.toLowerCase().startsWith(c))
      if (hit !== undefined) setActive(hit)
    } else return
    e.preventDefault()
  }

  let i = 0
  const item = (o: Opt<T>) => {
    const n = i++
    const sel = o.v === value
    return (
      <li
        key={o.v}
        id={`${id}-o${n}`}
        role="option"
        aria-selected={sel}
        data-i={n}
        className={`st-dd-opt${n === active ? ' is-active' : ''}${sel ? ' is-sel' : ''}`}
        style={{ '--d': `${Math.min(n, 8) * 18}ms` } as CSSProperties}
        // keep focus on the button while the mouse picks
        onPointerDown={(e) => e.preventDefault()}
        onPointerMove={() => n !== active && setActive(n)}
        onClick={() => pick(n)}
      >
        <span>{o.label}</span>
        <svg className="st-dd-check" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </li>
    )
  }

  return (
    <div className="st-row st-choice">
      <span id={labelId} className="st-lbl">
        {label}
      </span>
      <div ref={wrap} className={`st-dd${open ? ' is-open' : ''}${up ? ' is-up' : ''}`}>
        <button
          ref={btn}
          type="button"
          className="st-dd-btn"
          role="combobox"
          aria-labelledby={labelId}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open ? `${id}-o${active}` : undefined}
          onClick={() => (open ? setOpen(false) : show())}
          onKeyDown={onKey}
          // Space is handled on key-down; stop the button's own click on key-up re-toggling it
          onKeyUp={(e) => e.key === ' ' && e.preventDefault()}
        >
          <span className="st-dd-val">{current?.label}</span>
          <svg className="st-dd-chev" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <ul ref={list} id={listId} role="listbox" aria-labelledby={labelId} className="st-dd-list" style={{ maxHeight: room }}>
          {options.map(item)}
          {groups.map((g) => (
            <li key={g.group} role="presentation" className="st-dd-grp">
              <span className="st-dd-grp-name" aria-hidden="true">
                {g.group}
              </span>
              <ul role="group" aria-label={g.group}>
                {g.options.map(item)}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const s = useSettings()
  // the Secret Santa theme switch appears once part 1 is done
  const santaUnlocked = useSyncExternalStore(quest.subscribe, () => quest.get().keys.includes('ueno'))
  const { t, lang: resolvedLang } = useT()
  const [soundOn, setSoundOn] = useState(sfx.on)
  useEffect(() => sfx.subscribe(setSoundOn), [])
  const card = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const current = useCurrentSection(body)
  const close = useRef<HTMLButtonElement>(null)
  const closeFn = useRef(onClose)
  closeFn.current = onClose
  const titleId = useId()

  // focus the × on open, keep Tab inside the card, Escape closes, focus goes back afterwards
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    close.current?.focus({ preventScroll: true })
    sfx.rustle()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // an open dropdown closes itself first; the panel waits for the next Escape
        if ((e.target as Element | null)?.closest?.('.st-dd.is-open')) return
        e.stopPropagation()
        closeFn.current()
        return
      }
      if (e.key !== 'Tab' || !card.current) return
      const items = Array.from(
        card.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => {
        return el.offsetParent !== null
      })
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      const at = document.activeElement
      if (e.shiftKey && (at === first || !card.current.contains(at))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (at === last || !card.current.contains(at))) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    // the page behind can't scroll while this is up
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.documentElement.style.overflow = prev
      // back where focus was, or to the gear if it wasn't anywhere in particular
      const back =
        before && before !== document.body && before.isConnected
          ? before
          : document.querySelector<HTMLElement>('.settings-toggle')
      back?.focus?.({ preventScroll: true })
    }
  }, [])

  const setSound = async (v: boolean) => {
    sfx.setOn(v)
    if (v) {
      await sfx.unlock()
      sfx.chime(1.5, 0.7)
    }
  }

  return (
    <div className="st">
      <div className="st-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="st-card" ref={card} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="st-head">
          <h2 id={titleId}>
            <Icon name="gear" color="#fff" size={24} />
            {t('app.settings')}
          </h2>
          <div className="st-head-btns">
            <button
              className="st-x st-sound"
              onClick={() => setSound(!soundOn)}
              aria-label={soundOn ? t('st.mute') : t('st.unmute')}
              aria-pressed={soundOn}
              title={soundOn ? t('st.mute') : t('st.unmute')}
            >
              <Icon name={soundOn ? 'sound' : 'mute'} color="#fff" size={22} />
            </button>
            <button ref={close} className="st-x" onClick={onClose} aria-label={t('st.close')}>
              <Icon name="close" color="#fff" size={22} />
            </button>
          </div>
        </header>

        <div className="st-main">
          <Jump current={current} />
          <div className="st-body" ref={body}>
            <Section id="language">
              <Choice
                label={t('lang.label')}
                value={LANGS.some((l) => l.code === s.lang) ? s.lang : 'auto'}
                options={[
                  { v: 'auto', label: t('lang.auto', { name: langName(deviceLang()) }) },
                  ...LANGS.map((l) => ({ v: l.code, label: l.name })),
                ]}
                onChange={(lang) => set({ lang })}
              />
            </Section>

            <Section id="sound">
              <Slider label={t('snd.master')} value={s.master} onChange={(master) => set({ master })} />
              <Slider label={t('snd.sfx')} value={s.sfx} onChange={(v) => set({ sfx: v })} disabled={!soundOn} />
              <Slider label={t('snd.music')} value={s.music} onChange={(music) => set({ music })} disabled={!soundOn} />
              <Slider label={t('snd.videos')} value={s.karaoke} onChange={(karaoke) => set({ karaoke })} />
              <Toggle label={t('snd.ticks')} checked={s.ticks} onChange={(ticks) => set({ ticks })} />
              <Toggle label={t('snd.clacks')} checked={s.clacks} onChange={(clacks) => set({ clacks })} />
              {/* the Secret Santa reward: only here once it's been earned (English only, like the quest) */}
              {santaUnlocked && (
                <span lang="en">
                  <Toggle label="“Snow on the Site” as the site’s music (a Secret Santa reward)" checked={s.santaTheme} onChange={(santaTheme) => set({ santaTheme })} />
                </span>
              )}
            </Section>

            <Section id="motion" demo={<MotionDemo />}>
              <Choice
                label={t('mo.reduce')}
                value={s.motion}
                options={[
                  { v: 'system', label: t('mo.system') },
                  { v: 'reduce', label: t('mo.on') },
                  { v: 'full', label: t('mo.off') },
                ]}
                onChange={(motion) => set({ motion })}
              />
              <Toggle label={t('mo.skipIntro')} checked={s.skipIntro} onChange={(skipIntro) => set({ skipIntro })} />
              <Toggle label={t('mo.bursts')} checked={s.bursts} onChange={(bursts) => set({ bursts })} />
            </Section>

            <Section id="seeing" demo={<SeeingDemo />}>
              <Choice
                label={t('see.filter')}
                value={s.colorFilter}
                options={[{ v: 'none', label: t('see.off') }]}
                groups={COLOR_FILTERS.map((g, i) => ({
                  group: t((['see.groupRG', 'see.groupBY', 'see.groupMono'] as const)[i]),
                  options: g.options.map((o) => ({ v: o.v, label: t(`see.${o.v}` as Key) })),
                }))}
                onChange={(colorFilter) => set({ colorFilter })}
              />
              <Choice
                label={t('see.colours')}
                value={s.saturation}
                options={[
                  { v: 'normal', label: t('see.bright') },
                  { v: 'soft', label: t('see.soft') },
                  { v: 'muted', label: t('see.muted') },
                ]}
                onChange={(saturation) => set({ saturation })}
              />
              <Toggle label={t('see.contrast')} checked={s.contrast} onChange={(contrast) => set({ contrast })} />
              <Toggle label={t('see.underline')} checked={s.underline} onChange={(underline) => set({ underline })} />
              <Toggle label={t('see.cursors')} checked={s.cursors} onChange={(cursors) => set({ cursors })} />
              {s.cursors && <Toggle label={t('see.bigCursor')} checked={s.bigCursor} onChange={(bigCursor) => set({ bigCursor })} />}
            </Section>

            <Section id="reading" demo={<ReadingDemo />}>
              <Choice
                label={t('rd.size')}
                value={s.textSize}
                options={[
                  { v: 'normal', label: t('rd.normal') },
                  { v: 'large', label: t('rd.large') },
                  { v: 'larger', label: t('rd.larger') },
                ]}
                onChange={(textSize) => set({ textSize })}
              />
              <Choice
                label={t('rd.font')}
                value={s.font}
                options={[
                  { v: 'site', label: t('rd.site') },
                  { v: 'plain', label: t('rd.plain') },
                  { v: 'readable', label: t('rd.easy') },
                ]}
                onChange={(font) => set({ font })}
              />
              <Choice
                label={t('rd.letter')}
                value={s.letterSpacing}
                options={[
                  { v: 'normal', label: t('rd.normal') },
                  { v: 'wide', label: t('rd.wide') },
                  { v: 'wider', label: t('rd.wider') },
                ]}
                onChange={(letterSpacing) => set({ letterSpacing })}
              />
              <Choice
                label={t('rd.line')}
                value={s.lineSpacing}
                options={[
                  { v: 'normal', label: t('rd.normal') },
                  { v: 'relaxed', label: t('rd.relaxed') },
                  { v: 'loose', label: t('rd.loose') },
                ]}
                onChange={(lineSpacing) => set({ lineSpacing })}
              />
              <Toggle label={t('rd.ruler')} checked={s.ruler} onChange={(ruler) => set({ ruler })} />
            </Section>

            <Section id="focus" demo={<FocusDemo />}>
              <Toggle label={t('fo.calm')} checked={s.calm} onChange={(calm) => set({ calm })} />
              <Toggle label={t('fo.quiet')} checked={s.quietNews} onChange={(quietNews) => set({ quietNews })} />
            </Section>

            <Section id="page">
              <PagePicker />
              <Toggle label={t('pg.rings')} checked={s.rings} onChange={(rings) => set({ rings })} />
              {/* the Secret Santa reward: only here once it's been earned (English only, like the quest) */}
              {santaUnlocked && (
                <span lang="en">
                  <Toggle label="Snow falling over the site (a Secret Santa reward)" checked={s.santaSnow} onChange={(santaSnow) => set({ santaSnow })} />
                </span>
              )}
            </Section>

            <Section id="games">
              <GameShortcuts onPlay={onClose} />
            </Section>

            <Section id="countdown">
              <Choice
                label={t('cs.clock')}
                value={s.clock}
                options={[
                  { v: 'auto', label: t('cs.auto') },
                  { v: '12h', label: t('cs.h12') },
                  { v: '24h', label: t('cs.h24') },
                ]}
                onChange={(clock) => set({ clock })}
              />
              <Choice
                label={t('cs.zone')}
                value={s.zone}
                options={[
                  { v: 'both', label: t('cs.both') },
                  { v: 'jst', label: t('cs.jst') },
                  { v: 'local', label: t('cs.local') },
                ]}
                onChange={(zone) => set({ zone })}
              />
            </Section>

            <Section id="karaoke">
              <Toggle label={t('kar.lyrics')} checked={s.lyrics} onChange={(lyrics) => set({ lyrics })} />
              <Toggle label={t('kar.furigana')} checked={s.furigana} onChange={(furigana) => set({ furigana })} />
              <Choice
                label={t('pl.translation')}
                value={s.lyricsLang}
                options={[
                  { v: 'auto', label: t('pl.tlAuto', { name: langName(resolvedLang) }) },
                  ...lyricLangs(LANGS.map((l) => l.code)).map((c) => ({ v: c as string, label: langName(c) })),
                  { v: 'off', label: t('pl.tlOff') },
                ]}
                onChange={(lyricsLang) => set({ lyricsLang })}
              />
            </Section>

            <BuildInfo />
          </div>
        </div>

        <footer className="st-foot">
          <button className="st-reset" onClick={() => settings.reset()}>
            {t('st.reset')}
          </button>
          <button className="st-done" onClick={onClose}>
            {t('st.done')}
          </button>
        </footer>
      </div>
    </div>
  )
}
