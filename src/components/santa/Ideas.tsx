import { useEffect, useMemo, useState } from 'react'
import { useT } from '../../i18n'
import { reduced } from '../message/geometry'

/** one visible character at a time, so Thai, Korean and emoji don't get typed half-formed */
const split = (s: string): string[] =>
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s), (g) => g.segment)
    : Array.from(s)

const TYPE = 42
const ERASE = 16
const HOLD = 2600
const GAP = 450
/** with reduced motion: no typing, the whole line shows and swaps */
const STILL = 4200

/**
 * The empty letter's placeholder: suggested lines that type themselves out, wait, erase and make
 * way for the next. A button under them puts the one showing into the letter.
 */
export function Ideas({ onUse }: { onUse: (text: string) => void }) {
  const { t, locale } = useT()
  const ideas = useMemo(() => t('santa.ideas').split('\n').filter(Boolean), [t, locale])
  // start somewhere different each visit, so it doesn't always open on the same line
  const [i, setI] = useState(() => Math.floor(Math.random() * ideas.length))
  const [shown, setShown] = useState(0)
  const [erasing, setErasing] = useState(false)
  const still = reduced()
  const idea = ideas[i % ideas.length] ?? ''
  const chars = useMemo(() => split(idea), [idea])

  useEffect(() => {
    if (still) {
      const id = window.setTimeout(() => setI((n) => n + 1), STILL)
      return () => window.clearTimeout(id)
    }
    let wait: number
    if (!erasing && shown < chars.length) wait = TYPE + (/[.,!?。、！？]/.test(chars[shown - 1] ?? '') ? 160 : 0)
    else if (!erasing) wait = HOLD
    else if (shown > 0) wait = ERASE
    else wait = GAP
    const id = window.setTimeout(() => {
      if (!erasing && shown < chars.length) setShown(shown + 1)
      else if (!erasing) setErasing(true)
      else if (shown > 0) setShown(shown - 1)
      else {
        setErasing(false)
        setI((n) => n + 1)
      }
    }, wait)
    return () => window.clearTimeout(id)
  }, [still, erasing, shown, chars])

  // a fresh language: start that line over
  useEffect(() => {
    setShown(0)
    setErasing(false)
  }, [locale])

  const text = still ? idea : chars.slice(0, shown).join('')
  const ready = still || shown > 0

  return (
    <>
      <p className="sv-idea" aria-hidden="true">
        {text}
        {!still && <i className="sv-caret" />}
      </p>
      <button
        type="button"
        className={`sv-use-idea${ready ? '' : ' is-hidden'}`}
        onClick={() => onUse(idea)}
        aria-label={`${t('santa.useIdea')}: ${idea}`}
        tabIndex={ready ? 0 : -1}
      >
        {t('santa.useIdea')} ↵
      </button>
    </>
  )
}
