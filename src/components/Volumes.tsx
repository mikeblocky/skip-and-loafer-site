import { C, VOLUMES } from '../data'
import { VolumeCards } from './VolumeCards'
import { FlexText } from './FlexText'
import { useT } from '../i18n'

export function Volumes({ hidden, onOpen }: { hidden: number | null; onOpen: (i: number) => void }) {
  const { t } = useT()
  return (
    <section className="view view-volumes">
      <FlexText
        as="h2"
        className="vol-title"
        words={[{ t: t('nav.volumes'), w: 760, c: C.blue }]}
        data-intro="ui"
        data-safe=""
      >
        <sup className="vt-count">{VOLUMES.length}</sup>
      </FlexText>
      <VolumeCards hidden={hidden} onOpen={onOpen} />
      <p className="shelf-hint" data-intro="ui" data-safe="">
        {t('vol.drag')}
      </p>
    </section>
  )
}
