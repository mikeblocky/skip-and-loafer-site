import type { CSSProperties } from 'react'
import {
  BookOpen,
  Candy,
  ChevronRight,
  Circle,
  Citrus,
  Clapperboard,
  Clock,
  Cloud,
  Clover,
  Drama,
  Flame,
  Flower,
  Gift,
  GraduationCap,
  Heart,
  HeartCrack,
  Luggage,
  Mail,
  Maximize2,
  MessageCircle,
  Moon,
  Mountain,
  Music2,
  PartyPopper,
  Pause,
  Pencil,
  Play,
  Redo,
  RotateCcw,
  School,
  Send,
  ShoppingBag,
  ShoppingBasket,
  Smile,
  Sparkles,
  Star,
  Sun,
  Umbrella,
  Volume2,
  VolumeX,
  Waves,
  X,
  Zap,
  createLucideIcon,
  type LucideIcon,
} from 'lucide-react'
import { C } from './data'

// Lucide has no Japanese motifs; these are drawn on its 24px grid so they share its stroke and corners.
const Onigiri = createLucideIcon('onigiri', [
  ['path', { d: 'M10.3 4.6 3.4 16.3A2.6 2.6 0 0 0 5.6 20.2h12.8a2.6 2.6 0 0 0 2.2-3.9L13.7 4.6a2 2 0 0 0-3.4 0z', key: 'rice' }],
  ['path', { d: 'M9 20.2V15h6v5.2', key: 'nori' }],
])
const Torii = createLucideIcon('torii', [
  ['path', { d: 'M2 5c6.5 1.6 13.5 1.6 20 0', key: 'kasagi' }],
  ['path', { d: 'M4 10h16', key: 'nuki' }],
  ['path', { d: 'M6.5 6.4V21', key: 'left' }],
  ['path', { d: 'M17.5 6.4V21', key: 'right' }],
  ['path', { d: 'M12 6.6V10', key: 'strut' }],
])
const Squiggle = createLucideIcon('squiggle', [['path', { d: 'M2 14c2-5 3.5-5 5 0s3.5 5 5 0 3.5-5 5 0 3.5 5 5 0', key: 'wave' }]])
const Capsule = createLucideIcon('capsule', [
  ['circle', { cx: '12', cy: '12', r: '9', key: 'shell' }],
  ['path', { d: 'M3 12h18', key: 'seam' }],
  ['path', { d: 'M7.5 8.5a5.5 5.5 0 0 1 3-2.5', key: 'shine' }],
])

const SHAPES = {
  star: Star,
  heart: Heart,
  sparkle: Sparkles,
  sakura: Flower,
  bolt: Zap,
  note: Music2,
  sun: Sun,
  cloud: Cloud,
  smile: Smile,
  onigiri: Onigiri,
  plane: Send,
  bow: Gift,
  squiggle: Squiggle,
  ring: Circle,
  clover: Clover,
  pencil: Pencil,
  envelope: Mail,
  moon: Moon,
  bubble: MessageCircle,
  arrow: Redo,
  close: X,
  chev: ChevronRight,
  replay: RotateCcw,
  book: BookOpen,
  sound: Volume2,
  mute: VolumeX,
  bag: ShoppingBag,
  play: Play,
  pause: Pause,
  expand: Maximize2,
  film: Clapperboard,
  school: School,
  umbrella: Umbrella,
  watermelon: Citrus,
  bunting: PartyPopper,
  heartbreak: HeartCrack,
  valentine: Candy,
  mountain: Mountain,
  basket: ShoppingBasket,
  wave: Waves,
  flame: Flame,
  suitcase: Luggage,
  masks: Drama,
  torii: Torii,
  gradcap: GraduationCap,
  clock: Clock,
  /** a gacha capsule */
  capsule: Capsule,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof SHAPES
export const SCATTER_ICONS: IconName[] = [
  'star', 'heart', 'sparkle', 'sakura', 'bolt', 'note', 'sun', 'cloud', 'smile',
  'onigiri', 'plane', 'bow', 'squiggle', 'ring', 'clover', 'pencil', 'envelope', 'moon', 'bubble', 'arrow',
]

/** One weight for every icon on the site: a touch heavier than Lucide's default to sit with the rounded type. */
const STROKE = 2.4
/** Closed shapes get a soft fill of their own colour; open lines would fill into odd slivers, so they stay bare. */
const FILL_OPACITY = 0.3
const LINE_ONLY = new Set<IconName>(['squiggle', 'arrow', 'close', 'chev', 'replay', 'wave'])

export function Icon({
  name,
  color = C.ink,
  size = 32,
  className,
  style,
}: {
  name: IconName
  color?: string
  size?: number | string
  className?: string
  style?: CSSProperties
}) {
  const S = SHAPES[name]
  return (
    <S
      color={color}
      size={size}
      strokeWidth={STROKE}
      fill={LINE_ONLY.has(name) ? 'none' : color}
      fillOpacity={FILL_OPACITY}
      className={className}
      style={{ overflow: 'visible', ...style }}
      aria-hidden="true"
    />
  )
}
