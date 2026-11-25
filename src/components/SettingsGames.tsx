import { useSyncExternalStore, type CSSProperties } from 'react'
import { C } from '../data'
import { Icon, type IconName } from '../icons'
import { SECRETS, openSecret, secrets, secretsReady, type SecretId } from '../secrets'
import { useT, type Key } from '../i18n'

/**
 * Settings › Games: a shortcut straight into each of the hidden games, for anyone who'd rather
 * play than hunt for them. Playing one this way counts as finding it. Shows your best so far.
 */

/** the games' own headers are lowercase by design; here they're named like menu items (gm.* keys) */
const LOOK: Record<
  SecretId,
  { name: Key; icon: IconName; color: string; best: (s: ReturnType<typeof secrets.get>) => number }
> = {
  gacha: { name: 'gm.gacha', icon: 'capsule', color: C.pink, best: (s) => s.gachaBest },
  skip: { name: 'gm.skip', icon: 'school', color: C.orange, best: (s) => s.skipBest },
  poll: { name: 'gm.poll', icon: 'smile', color: C.red, best: (s) => s.pollBest },
  quiz: { name: 'gm.quiz', icon: 'pencil', color: C.blue, best: (s) => s.quizBest },
}

export function GameShortcuts({ onPlay }: { onPlay: () => void }) {
  const { t, locale } = useT()
  const saved = useSyncExternalStore(secrets.subscribe, secrets.get)
  const ready = useSyncExternalStore(secrets.subscribe, secretsReady)

  const play = (id: SecretId) => {
    // close Settings first, so the game opens on its own and focus comes back to the gear after
    onPlay()
    window.setTimeout(() => openSecret(id), 0)
  }

  return (
    <div className="gm-grid">
      {SECRETS.map((g) => {
        const look = LOOK[g.id]
        const best = look.best(saved)
        return (
          <button
            key={g.id}
            type="button"
            className="gm-tile"
            disabled={!ready}
            onClick={() => play(g.id)}
            style={{ '--tc': look.color } as CSSProperties}
          >
            <span className="gm-icon" aria-hidden="true">
              <Icon name={look.icon} color="#fff" size={26} />
            </span>
            <span className="gm-text">
              <b>{t(look.name)}</b>
              <small>{best > 0 ? t('gm.best', { n: best.toLocaleString(locale) }) : t('gm.new')}</small>
            </span>
            <span className="gm-play" aria-hidden="true">
              <Icon name="play" color="#fff" size={14} />
            </span>
          </button>
        )
      })}
      {!ready && <p className="gm-wait">{t('gm.wait')}</p>}
    </div>
  )
}
