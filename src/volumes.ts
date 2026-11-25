import type { IconName } from './icons'

/**
 * Volumes and chapters. Chapters link only to the official Japanese release on comic-days
 * (often split into two parts there). No English chapter links are kept.
 */

export interface Chapter {
  n: number
  title: string
  /** official comic-days episode pages, in reading order */
  jp: string[]
  latest?: boolean
}

export interface Volume {
  n: number
  src: string | null
  chapters: number[]
  anime?: string
  buyEn?: string
  buyJp?: string
  inProgress?: boolean
  /** mark for the volume's main storyline */
  icon: IconName
}

const cd = (id: string) => `https://comic-days.com/episode/${id}`
const c = (n: number, title: string, ...ids: string[]): Chapter => ({ n, title, jp: [...new Set(ids)].map(cd) })
const prh = (id: string, n: number) =>
  `https://www.penguinrandomhouse.com/books/${id}/skip-and-loafer-vol-${n}-by-misaki-takamatsu/`
const amzn = (asin: string) => `https://www.amazon.co.jp/dp/${asin}/`

export const VOLUMES: Volume[] = [
  { n: 1, src: '/volumes/1.jpg', chapters: [1, 2, 3, 4, 5], anime: 'Season 1', buyEn: prh('677487', 1), buyJp: amzn('4065142091'), icon: 'school' },
  { n: 2, src: '/volumes/2.jpg', chapters: [6, 7, 8, 9, 10, 11, 11.5], anime: 'Season 1', buyEn: prh('696193', 2), buyJp: amzn('4065163005'), icon: 'umbrella' },
  { n: 3, src: '/volumes/3.jpg', chapters: [12, 13, 14, 15, 16, 17], anime: 'Season 1', buyEn: prh('707653', 3), buyJp: amzn('4065184711'), icon: 'watermelon' },
  { n: 4, src: '/volumes/4.jpg', chapters: [18, 19, 20, 21, 22, 23, 23.5], anime: 'Season 1', buyEn: prh('707725', 4), buyJp: amzn('4065205395'), icon: 'bunting' },
  { n: 5, src: '/volumes/5.jpg', chapters: [24, 25, 26, 27, 28, 29], buyEn: prh('707592', 5), buyJp: amzn('4065224977'), icon: 'heartbreak' },
  { n: 6, src: '/volumes/6.jpg', chapters: [30, 31, 32, 33, 34, 35, 35.5], buyEn: prh('719281', 6), buyJp: amzn('4065257794'), icon: 'valentine' },
  { n: 7, src: '/volumes/7.jpg', chapters: [36, 37, 38, 39, 40, 41, 41.5], buyEn: prh('725414', 7), buyJp: amzn('4065281474'), icon: 'mountain' },
  { n: 8, src: '/volumes/8.jpg', chapters: [42, 43, 44, 45, 46, 47, 47.5], buyEn: prh('740385', 8), buyJp: amzn('4065302676'), icon: 'basket' },
  { n: 9, src: '/volumes/9.jpg', chapters: [48, 49, 50, 51, 52, 53, 53.1, 53.2, 53.5], buyEn: prh('749797', 9), buyJp: amzn('4065326427'), icon: 'wave' },
  { n: 10, src: '/volumes/10.jpg', chapters: [54, 55, 56, 56.5, 57, 58, 59], buyEn: prh('772728', 10), buyJp: amzn('406534851X'), icon: 'flame' },
  { n: 11, src: '/volumes/11.jpg', chapters: [60, 61, 62, 63, 64, 65], buyEn: prh('783973', 11), buyJp: amzn('4065377226'), icon: 'suitcase' },
  { n: 12, src: '/volumes/12.jpg', chapters: [66, 67, 68, 69, 70, 71, 72], buyEn: prh('819145', 12), buyJp: amzn('4065397065'), icon: 'masks' },
  { n: 13, src: '/volumes/13.jpg', chapters: [73, 74, 75, 76, 77, 78], buyJp: amzn('B0DPMT3VW4'), icon: 'torii' },
  { n: 14, src: '/volumes/14.jpg', chapters: [79, 80, 81, 82, 83, 84], inProgress: true, buyJp: amzn('4065456746'), icon: 'sakura' },
  { n: 15, src: null, chapters: [85, 86], inProgress: true, icon: 'gradcap' },
]

/** Per-volume colours, hue-matched to each cover. Volume 14 uses its sampled cover colour. */
export const VOL_COLORS: Record<number, string> = {
  1: '#F53D84', // pink
  2: '#F5900F', // peach-yellow → amber
  3: '#12B266', // green
  4: '#7A45E0', // lavender → violet
  5: '#F0344F', // red
  6: '#246BE8', // blue
  7: '#F85A66', // peach-pink → coral
  8: '#1B88E8', // yellow-blue → azure
  9: '#4CB41A', // green-red → leaf
  10: '#3F44D6', // blue-lavender → indigo
  11: '#DE2A8E', // pink → raspberry
  12: '#0EA09E', // peach-green → teal
  13: '#AC3DD4', // lavender → orchid
  15: '#F86E1A', // in progress → orange
}

export const CHAPTERS: Chapter[] = [
  // Volume 1
  c(1, 'Sparkling High School Student', '10834108156642600786'),
  c(2, 'Fidget Fidget Karaoke Box', '10834108156642601520'),
  c(3, 'Restless Club Activities', '10834108156642602112'),
  c(4, 'Fluffy Student Council', '10834108156642602366'),
  c(5, '"Cracklin\'" Movie Theatre', '10834108156642602694'),
  // Volume 2
  c(6, 'Tingling Friendship', '10834108156668590062'),
  c(7, 'Clickclopping Schedule', '10834108156668590208'),
  c(8, 'Prickling Private Training', '10834108156668590479'),
  c(9, 'Cheerful Class Match', '10834108156668590742'),
  c(10, 'Start of the Damp Rainy Season', '10834108156668591026'),
  c(11, 'Flick Flickering End of the Rainy Season', '10834108156668591282'),
  c(11.5, 'Volume 2 Extras'),
  // Volume 3
  c(12, 'Flip Flapping Student Council Election', '10834108156674222779'),
  c(13, 'Mad Dash for Popularity Before Summer Break', '10834108156681817600'),
  c(14, 'Blistering Hot Zoo', '10834108156689695263'),
  c(15, 'Our Varied Summer Break Experience', '10834108156702932647', '10834108156702932652'),
  c(16, 'Drowsy Homecoming', '10834108156714563671', '10834108156714563676'),
  c(17, 'Euphoric End to the Summer Break', '10834108156728426240', '10834108156728426249'),
  // Volume 4
  c(18, 'Bustling Culture Festival Preparations', '10834108156763050102', '10834108156763050107'),
  c(19, 'Tearful Dance', '13933686331610221120', '13933686331610221127'),
  c(20, 'Boisterous Culture Festival, Part 1', '13933686331628939870', '13933686331628939875'),
  c(21, 'Boisterous Culture Festival, Part 2', '13933686331653168562', '13933686331653168567'),
  c(22, 'Boisterous Culture Festival, Part 3', '13933686331668847505', '13933686331668847512'),
  c(23, 'Boisterous Culture Festival, Part 4', '13933686331682350450', '13933686331682350455'),
  c(23.5, 'Volume 4 Extras'),
  // Volume 5
  c(24, 'Anxious Adolescence', '13933686331697683930', '13933686331697683935'),
  c(25, 'A Whirlwind First Love?', '13933686331711040301', '13933686331711040306'),
  c(26, 'Heartache Girls, Part 1', '13933686331724591150', '13933686331724591155'),
  c(27, 'Heartache Girls, Part 2', '13933686331768729177', '13933686331768729192'),
  c(28, 'A Jingling Christmas', '13933686331799849305', '13933686331799849308'),
  c(29, "A Snowy New Year's Holiday", '3269632237261316422', '3269632237261316428'),
  // Volume 6
  c(30, "A Heart-Pounding Valentine's, Part 1", '3269632237294758127', '3269632237294757482'),
  c(31, "A Heart-Pounding Valentine's, Part 2", '3269632237330828584', '3269632237330828587'),
  c(32, 'Snipping Sixteen', '3269754496323930381', '3269754496323930386'),
  c(33, 'Happy Hotcakes', '3269754496368929302', '3269754496368929307'),
  c(34, 'Lovey-Dovey Ambitions', '3269754496406934387', '3269754496406934394'),
  c(35, 'Fluttering Grade Change', '3269754496455961015', '3269754496455961024'),
  c(35.5, 'Side Stories', '3269754496509982293'),
  // Volume 7
  c(36, 'Shining Second Year', '3269754496608520550', '3269754496608520264'),
  c(37, 'Rowdy Kouhai', '3269754496662918439', '3269754496662918445'),
  c(38, 'Cloudy New Class', '3269754496711763364', '3269754496711763369'),
  c(39, 'Chatty Stroll Home', '3269754496770608140', '3269754496770608145'),
  c(40, 'Bumpy Mountain Climbing', '3269754496818823944', '3269754496818823954'),
  c(41, 'Fluffy Spring', '3269754496883832703', '3269754496883832708'),
  c(41.5, 'Volume 7 Extras'),
  // Volume 8
  c(42, 'Flustered Dating?', '3270296674425333928', '3270296674425333933'),
  c(43, 'Mixed Feelings', '3270375685361073151', '3270375685361073164'),
  c(44, 'Crumpled Heart', '3270375685439722475', '3270375685439722483'),
  c(45, 'Noisy New Student Council President', '316112896863019858', '316112896863019865'),
  c(46, 'Warm Picnic', '316112896952050654', '316112896952050662'),
  c(47, 'Sprinkling Rain', '316190246979986224', '316190246979986231'),
  c(47.5, 'Volume 8 Extras'),
  // Volume 9
  c(48, 'Roly-Poly Unrequited Love', '316190247042279870', '316190247042279880'),
  c(49, 'Exciting Travel Plans', '316190247118283881', '316190247118283893'),
  c(50, 'Awkward School Day', '4856001361071324274', '4856001361071324279'),
  c(51, 'Heart-Thumping Ocean, Part 1', '4856001361160184122', '4856001361160184140'),
  c(52, 'Heart-Thumping Ocean, Part 2', '4856001361259614168', '4856001361259614177'),
  c(53, 'Heart-Thumping Ocean, Part 3', '4856001361358252154', '4856001361358252159'),
  c(53.1, 'Blu-ray 1 Extras'),
  c(53.2, 'Blu-ray 2 Extras'),
  c(53.5, 'Volume 9 Extras'),
  // Volume 10
  c(54, 'Heart-Thumping Ocean, Part 4', '14079602755121009418', '14079602755121009426'),
  c(55, 'Heart-Thumping Ocean, Part 5', '14079602755228055583', '14079602755228055588'),
  c(56, 'Weary Road Home', '14079602755350262708', '14079602755350262715'),
  c(56.5, 'Extra Scenes', '14079602755480613581'),
  c(57, 'Fluffy School Day', '14079602755589254213', '14079602755589254218'),
  c(58, 'Blazing Future, Part 1', '10044607041231571992', '10044607041231572001'),
  c(59, 'Blazing Future, Part 2', '2550668105999738799', '2550668105999738804'),
  // Volume 11
  c(60, 'Mumbled Words', '2550689798326775721', '2550689798326775726'),
  c(61, 'Maddening District Competition', '2550689798731966132', '2550689798731966135'),
  c(62, 'Cuddly Shopping Trip', '2550689798870505287', '2550689798870505292'),
  c(63, 'Steady School Trip, Part 1', '2550912964508240630', '2550912964508240635'),
  c(64, 'Steady School Trip, Part 2', '2550912964646763116', '2550912964646763123'),
  c(65, 'Steady School Trip, Part 3', '2550912964789944228', '2550912964789944234'),
  // Volume 12
  c(66, 'Steady School Trip, Part 4', '2550912965035136193', '2550912965035136200'),
  c(67, 'Gritty Memories', '2550912965173786337', '2550912965173786345'),
  c(68, 'Flickering Stage', '2550912965311933687', '2550912965311933692'),
  c(69, 'Hectic Family Trip', '2550912965441924780', '2550912965441924791'),
  c(70, 'Flustered Culture Festival, Part 1', '2550912965593342631', '2550912965593342637'),
  c(71, 'Flustered Culture Festival, Part 2', '2550912965726057446', '2550912965726057454'),
  c(72, 'Flustered Culture Festival, Part 3', '2550912965862280006', '2550912965862280016'),
  // Volume 13
  c(73, 'Flustered Culture Festival, Part 4', '2551460909479801204', '2551460909479801213'),
  c(74, 'Chatty Wrap Parties', '2551460909604985710', '2551460909604985719'),
  c(75, 'Snipping Hair Salon', '2551460909729059490', '2551460909729059495'),
  c(76, 'Unsteady Detour', '2551460909956871151', '2551460909956871160'),
  c(77, 'A Distressed Christmas Eve', '2551460910063177187', '2551460910063177193'),
  c(78, 'Huffy-Puffy Shrine Visit', '12207421983406221656', '12207421983406221664'),
  // Volume 14
  c(79, 'A Bright Day in Early Spring', '12207421983633662678', '12207421983633662683'),
  c(80, 'A Sign of a Heartbreak', '12207421983746014862', '12207421983746014867'),
  c(81, 'Head Over Heels', '12207421983877873652', '12207421983877873659'),
  c(82, 'Leisurely Spring Break', '12207421983996851573', '12207421983996851581'),
  c(83, 'Comfortable Friend', '12207421984125525108'),
  c(84, 'Rippling Final Year', '12207421984406164162', '12207421984406164169'),
  // Volume 15
  { ...c(85, 'Wandering Yokohama (temporary name)', '12207421984544045844', '12207421984544045849'), latest: true },
]

export const LATEST_CHAPTER = CHAPTERS.find((ch) => ch.latest)!
export const chapterByNumber = new Map(CHAPTERS.map((ch) => [ch.n, ch]))
/** Index of the volume holding the latest released chapter. */
export const LATEST_VOLUME = VOLUMES.findIndex((v) => v.chapters.includes(LATEST_CHAPTER.n))
