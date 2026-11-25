import { useId, type CSSProperties } from 'react'
import { CHARACTERS, RAINBOW } from '../data'
import { Icon, SCATTER_ICONS, type IconName } from '../icons'
import { sfx } from '../sfx'
import { settings, useSettings } from '../settings'
import { useT, type Key } from '../i18n'

/**
 * Settings › On the page: pick which characters and which kinds of doodle float around the
 * site. Each tile is a toggle button (pressed = shown); hidden ones go grey and shrink back.
 * The gacha capsule isn't listed: it's the hint to a hidden game, so it always stays.
 */

function Group({
  title,
  hidden,
  all,
  onChange,
  children,
}: {
  title: string
  hidden: string[]
  all: string[]
  onChange: (hidden: string[]) => void
  children: React.ReactNode
}) {
  const id = useId()
  const { t } = useT()
  const shown = all.length - hidden.filter((h) => all.includes(h)).length
  return (
    <div className="pk-group" role="group" aria-labelledby={id}>
      <div className="pk-head">
        <span id={id} className="pk-title">
          {title}
          <span className="pk-count">{t('pg.count', { n: shown, total: all.length })}</span>
        </span>
        <button
          type="button"
          className="pk-all"
          onClick={() => {
            onChange([])
            sfx.pop(1.2)
          }}
          disabled={shown === all.length}
        >
          {t('pg.all')}
        </button>
        <button
          type="button"
          className="pk-all"
          onClick={() => {
            onChange([...all])
            sfx.pop(0.8)
          }}
          disabled={shown === 0}
        >
          {t('pg.none')}
        </button>
      </div>
      <div className="pk-grid">{children}</div>
    </div>
  )
}

function Tile({
  on,
  label,
  color,
  onToggle,
  children,
}: {
  on: boolean
  label: string
  color: string
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`pk-tile${on ? ' is-on' : ''}`}
      aria-pressed={on}
      title={label}
      style={{ '--tc': color } as CSSProperties}
      onClick={() => {
        sfx.pop(on ? 0.85 : 1.2)
        onToggle()
      }}
    >
      {children}
      <span className="pk-name">{label}</span>
      <svg className="pk-mark" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </button>
  )
}

const flip = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

export function PagePicker() {
  const { hiddenChars, hiddenIcons } = useSettings()
  const { t } = useT()
  return (
    <>
      <Group
        title={t('pg.chars')}
        hidden={hiddenChars}
        all={CHARACTERS.map((c) => c.id)}
        onChange={(hiddenChars) => settings.set({ hiddenChars })}
      >
        {CHARACTERS.map((c) => (
          <Tile
            key={c.id}
            on={!hiddenChars.includes(c.id)}
            label={c.name}
            color={c.color}
            onToggle={() => settings.set({ hiddenChars: flip(hiddenChars, c.id) })}
          >
            <span className="pk-face" style={{ backgroundImage: `url(${c.src})` }} aria-hidden="true" />
          </Tile>
        ))}
      </Group>
      <Group
        title={t('pg.doodles')}
        hidden={hiddenIcons}
        all={[...SCATTER_ICONS]}
        onChange={(hiddenIcons) => settings.set({ hiddenIcons })}
      >
        {SCATTER_ICONS.map((name, i) => {
          const color = RAINBOW[(i * 5) % RAINBOW.length]
          return (
            <Tile
              key={name}
              on={!hiddenIcons.includes(name)}
              label={t(`icon.${name}` as Key)}
              color={color}
              onToggle={() => settings.set({ hiddenIcons: flip(hiddenIcons, name) })}
            >
              <span className="pk-icon" aria-hidden="true">
                <Icon name={name} color={color} size={26} />
              </span>
            </Tile>
          )
        })}
      </Group>
    </>
  )
}
