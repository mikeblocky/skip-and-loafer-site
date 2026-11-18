import { C, VOLUMES } from '../data'
import { VolumeCards } from './VolumeCards'
import { FlexText } from './FlexText'

export function Volumes({ hidden, onOpen }: { hidden: number | null; onOpen: (i: number) => void }) {
  return (
    <section className="view view-volumes">
      <FlexText
        as="h2"
        className="vol-title"
        words={[{ t: 'Volumes', w: 760, c: C.blue }]}
        data-intro="ui"
        data-safe=""
      >
        <sup className="vt-count">{VOLUMES.length}</sup>
      </FlexText>
      <VolumeCards hidden={hidden} onOpen={onOpen} />
      <p className="shelf-hint" data-intro="ui" data-safe="">
        ← drag →
      </p>
    </section>
  )
}
