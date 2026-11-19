import { C } from './data'
import type { IconName } from './icons'

/**
 * What's new on the site, newest first. When something worth telling people about ships, add an
 * entry at the top with a fresh id: anyone who's been here before sees the "what's new" card
 * once, opened on the first entry they haven't seen. Brand new visitors skip it.
 *
 * `at` is when it went up, with its time zone; everyone sees it in their own local time.
 * Keep it short and plain, like patch notes you'd post for friends.
 */
export interface Update {
  id: string
  at: string
  icon: IconName
  color: string
  title: string
  /** a few sentences to start, the way you'd tell someone about it */
  intro: string
  /** a snapshot of it, from /public/updates (16:9 works best), and what it shows */
  shot?: { src: string; alt: string }
  items: string[]
  /**
   * A bigger update can be split into parts, one per thing, each with a short looping clip
   * (an animated .webp in /public/updates, 16:9) and, for the hidden games, how to open it.
   */
  parts?: Part[]
}

export interface Part {
  title: string
  icon: IconName
  color: string
  clip?: { src: string; alt: string }
  /** how to get to it */
  how?: string
  items: string[]
}

export const UPDATES: Update[] = [
  {
    id: 'games-day',
    at: '2026-11-19T14:35:00+07:00',
    icon: 'capsule',
    color: C.pink,
    title: 'Four games',
    intro:
      'This one’s a big one, so grab a snack. I spent today on the hidden games. Skip to School got a lot longer, and the other three secrets turned into real games too, each with its own leaderboard and its own song. They’re still hidden around the site, but this time I’ll tell you where.',
    items: [
      'Every game has a leaderboard now. Save your score at the end with any name you like.',
      'Each game has its own song. It speeds up and gets busier as the game gets harder.',
      'They all start easy so you can get the hang of them, then get harder slowly. Getting better really does get you further.',
      'On phones each game fills the screen, and the buttons sit low where your thumbs are.',
    ],
    parts: [
      {
        title: 'Skip to School',
        icon: 'school',
        color: C.orange,
        clip: { src: '/updates/games-skip.webp', alt: 'Mitsumi hopping over clutter on the road while Mika catches up and chats' },
        how: 'Go to the Anime page and play the Season 1 ending, “Hanauta to Mawarimichi”, with the lyrics on. When the song gets to スキップ (skip), that line turns gold for a moment. Tap it before it goes.',
        items: [
          'Tap or press space to hop, and tap again in the air to skip. Hop over the clutter, watch out for paper planes, and grab stars, hearts and power-ups.',
          'Friends catch up with you as your score goes up. Get all six to win, then keep going for the leaderboard.',
          'The game starts off easier and lasts a lot longer now. After 10k, points come in way faster, so 100k or even a million is possible.',
          'Your friends talk while you run, and sometimes they dare you to do something. Each friend has their own little tune for it, and finishing a dare gets you a boost.',
        ],
      },
      {
        title: 'Capsule pairs',
        icon: 'capsule',
        color: C.pink,
        clip: { src: '/updates/games-gacha.webp', alt: 'A tray of capsule cards being matched in pairs, then a bigger tray' },
        how: 'One of the little stickers floating around the page is a pink capsule. Tap it three times quickly, without dragging it, and it cracks open.',
        items: [
          'The gacha is a memory game now. You get a quick look at the cards, then the capsules close, and you open two at a time to find pairs.',
          'A pair is the same friend at the same rarity, so look at the frame colour too. Later on there’ll be a Mika N right next to a Mika SR.',
          'Pairs and full trays give you time back, and misses cost a little. The tray grows by one pair each time.',
          'Every pair you find goes in your collection.',
        ],
      },
      {
        title: 'The quiz',
        icon: 'book',
        color: C.blue,
        clip: { src: '/updates/games-quiz.webp', alt: 'Quiz questions about birthdays and the series, answered against a shrinking timer' },
        how: 'On the Volumes page, drag the row of covers past the very last volume. Keep pulling until it starts to resist, then let go.',
        items: [
          'It keeps going until you run out of hearts. Answer before the bar runs out, and faster answers score more.',
          'It starts with birth months and easy stuff about the series, then moves on to exact dates, volumes and family names.',
          'A run of right answers gives you a heart back. It takes a longer run the further you get.',
          'Questions come back sometimes, so if you get one wrong, remember it for next time.',
        ],
      },
      {
        title: 'Find your friends',
        icon: 'smile',
        color: C.red,
        clip: { src: '/updates/games-poll.webp', alt: 'Picking Mika as a walking buddy, then finding each friend in a growing crowd' },
        how: 'On the Birthdays page, spin the dial all the way round twice in one go. You can drag it round or give it a good fling.',
        items: [
          'The poll turned into a game. First you pick who you’d walk to school with, and finding them gets you double points.',
          'A name comes up and you find that friend in the crowd. The crowd keeps growing, and later the faces get flipped, turned and zoomed in.',
          'Every friend you find gives you a bit of time back. Wrong taps cost time, but only a little at first, so it’s fine to learn by tapping.',
        ],
      },
    ],
  },
  {
    id: 'new-look',
    at: '2026-11-18T22:55:23+07:00',
    icon: 'pencil',
    color: C.pink,
    title: 'New look',
    intro:
      'The site used to look a bit like a template, so I spent a while giving it its own style. Everything should feel a little warmer now.',
    shot: { src: '/updates/new-look.webp', alt: 'The Birthdays page in the new colours' },
    items: [
      'New colours and icons around the site, and titles where each word has its own colour.',
      'The letter guide on the Message tab looks like stationery now.',
      'There’s confetti when you send or open a letter.',
      'The music in the game is livelier, and power-ups glow in their own colours.',
    ],
  },
  {
    id: 'furigana',
    at: '2026-11-18T14:12:42+07:00',
    icon: 'note',
    color: C.violet,
    title: 'Furigana in the karaoke',
    intro: 'A small one, but I really wanted it. The lyrics are much easier to follow when you can see how the kanji are read.',
    shot: { src: '/updates/furigana.webp', alt: 'OP lyrics with furigana above the kanji' },
    items: [
      'The OP and ED lyrics have furigana above the kanji.',
      'You can turn it off if you don’t need it.',
      'Lyrics fit better on phones and don’t break in weird places.',
    ],
  },
  {
    id: 'message',
    at: '2026-11-18T10:05:22+07:00',
    icon: 'envelope',
    color: C.red,
    title: 'Message tab',
    intro: 'This is probably my favourite part of the site. It’s a little post office where fans can leave letters for each other.',
    shot: { src: '/updates/message.webp', alt: 'The Message tab with the how it works card and a blank letter' },
    items: [
      'You can write a short letter and drop it in a mailbox everyone shares.',
      'You can also check the mail and open a random letter someone else wrote. Sometimes you get your own back.',
      'Letters are anonymous unless you sign them.',
    ],
  },
  {
    id: 'game-bigger',
    at: '2026-11-18T02:52:02+07:00',
    icon: 'star',
    color: C.yellow,
    title: 'Game update',
    intro: 'The hidden game got a lot bigger. If you already found it, there’s more to see the further you go.',
    shot: { src: '/updates/game-bigger.webp', alt: 'Skip to School during a lights out twist' },
    items: [
      'There are levels now, plus short breaks so you can catch your breath.',
      'Twists mess with the camera for a few seconds at a time.',
      'After 10k points there are new events, and the page itself changes as you go.',
    ],
  },
  {
    id: 'secrets',
    at: '2026-11-18T00:14:15+07:00',
    icon: 'capsule',
    color: C.green,
    title: 'Hidden stuff',
    intro: 'I hid a few things around the site for people who like poking around. I won’t say where.',
    items: [
      'There are a few secrets on the site now (no hints, sorry).',
      'One of them is a small game with its own leaderboard.',
      'The site works properly on phones now too.',
    ],
  },
  {
    id: 'karaoke',
    at: '2026-11-17T21:36:46+07:00',
    icon: 'film',
    color: C.blue,
    title: 'Karaoke',
    intro: 'You can sing along to the OP and ED now!',
    shot: { src: '/updates/karaoke.webp', alt: 'The OP and ED players on the Anime page, with lyrics on screen' },
    items: ['The lyrics show up in time with the song on the Anime page.'],
  },
  {
    id: 'hello',
    at: '2026-11-17T20:12:40+07:00',
    icon: 'school',
    color: C.sky,
    title: 'Site launch',
    intro: 'The site is live! I wanted one place to count down to the next chapter and keep up with everything Skip and Loafer.',
    shot: { src: '/updates/hello.webp', alt: 'The countdown to the next chapter' },
    items: [
      'A countdown to the next chapter, in Japan time and your own.',
      'All the volume covers, everyone’s birthdays, and the anime.',
    ],
  },
]

/** a date in the reader's own time zone, e.g. "November 19, 2026 · 1:00 PM" (or their locale's version) */
export const longDate = (iso: string) => {
  const d = new Date(iso)
  const day = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${day} · ${time}`
}
/** short, for the thumbnails: "Nov 19" */
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
