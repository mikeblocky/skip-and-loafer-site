import { C } from '../../data'
import { FlexText } from '../FlexText'
import { dayMonth, useT } from '../../i18n'
import { BURST_ON, daysToBurst, LAST_DAY } from '../../santa'
import { useSeason } from './season'
import { Workshop } from './Workshop'
import { Burst } from './Burst'
import '../../message.css'

/**
 * Secret Santa, the limited-time tab. Until 23 December you wrap gifts and drop them in one
 * big shared box; from 24 to 31 December it bursts open and everyone gets all of them.
 */
export function Santa() {
  const phase = useSeason()
  const { t, locale } = useT()
  const burstDate = dayMonth(BURST_ON.month, BURST_ON.day, locale)
  const days = daysToBurst()

  return (
    <section className="view view-santa">
      <FlexText
        as="h2"
        className="ss-title"
        words={t('nav.santa')
          .split(/\s+/)
          .map((w, i) => ({ t: w, w: 760, c: i % 2 ? C.red : C.teal }))}
        data-intro="ui"
        data-safe=""
      />
      <p className="ss-sub" data-intro="ui">
        {phase === 'collect' && (
          <>
            {t('santa.burstsOn', { date: burstDate })} · <b>{days === 1 ? t('santa.days1') : t('santa.daysN', { n: days })}</b>
          </>
        )}
        {phase === 'open' && t('santa.closedOn', { date: dayMonth(BURST_ON.month, BURST_ON.day - 1, locale) })}
        {!phase && t('santa.over')}
      </p>
      {phase === 'collect' && (
        <Workshop
          burstDate={burstDate}
          start={dayMonth(BURST_ON.month, BURST_ON.day, locale)}
          end={dayMonth(LAST_DAY.month, LAST_DAY.day, locale)}
        />
      )}
      {phase === 'open' && <Burst />}
    </section>
  )
}
