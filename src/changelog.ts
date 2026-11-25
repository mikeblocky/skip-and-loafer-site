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
    id: 'secret-santa',
    at: '2026-11-25T21:00:00+07:00',
    icon: 'snow',
    color: C.sky,
    title: 'Secret Santa',
    intro:
      'Somebody left a ticket lying around on the site. Nobody knows who it’s from yet, but it looks like a Secret Santa is starting, in parts, all through December.',
    items: [
      'Part 1 is out now. Every good story starts at the beginning.',
    ],
  },
  {
    id: 'settings',
    at: '2026-11-25T18:00:00+07:00',
    icon: 'gear',
    color: C.violet,
    title: 'Settings and more languages',
    intro:
      'The biggest update so far. The sound button in the corner is now a settings button, with sound, accessibility and page options in one place, and the whole site can be read in five languages. The video player, the countdown and the hidden games all got some care too.',
    items: [
      'A new Settings panel behind the gear in the corner.',
      'The site speaks English, Spanish, Brazilian Portuguese, French and German, with more on the way.',
      'The OP/ED player has its own controls now, with a settings menu for lyrics, furigana, the translation line and speed.',
      'You can pick which characters float around the page, and the rest spread out to fill the room.',
      'On a wide screen this list of updates sits down the side, like the sections in Settings.',
    ],
    parts: [
      {
        title: 'Sound',
        icon: 'sound',
        color: C.blue,
        items: [
          'A master volume, plus separate volumes for the effects, the music and the OP/ED videos.',
          'Switches for the little blips on hover and while scrolling, and for the clack when a countdown digit flips.',
          'Volume sliders glide instead of jumping, so dragging them doesn’t crackle.',
        ],
      },
      {
        title: 'Seeing and reading',
        icon: 'book',
        color: C.teal,
        items: [
          'Bigger text in two steps, high contrast, and two plainer fonts: Inter, and Atkinson Hyperlegible for easier reading.',
          'Colour-blind filters for each kind of red-green and blue-yellow colour blindness and for little or no colour.',
          'Softer colours, underlined links, wider letter and line spacing, and a bigger cursor or your normal one.',
          'A reading ruler: a band that follows your pointer or keyboard focus and dims the rest of the page.',
        ],
      },
      {
        title: 'Motion and the page',
        icon: 'sparkle',
        color: C.pink,
        items: [
          'Reduce motion, or skip the intro and go straight to the page. The Replay ribbon still plays it in full.',
          'Turn off the coloured pop where you click, or the rainbow rings behind everything.',
          'A calm page that hides the floating characters and doodles, or pick exactly which ones stay.',
          'Characters you leave off no longer leave empty gaps: everyone else spreads out over the free space, right away.',
          '"What’s new" can wait for its button instead of opening by itself.',
        ],
      },
      {
        title: 'Languages, time and dates',
        icon: 'plane',
        color: C.orange,
        items: [
          'Pick a language in Settings, or leave it on Auto to follow your device.',
          'Pages, buttons, the hidden games and the characters’ lines are all translated. These update notes stay in English for now, and say so.',
          'The countdown headline keeps its look in every language, with upright words for scripts where a slant looks wrong.',
          'A 12 or 24-hour clock (Auto uses your language’s usual one), and release times in JST, your local time or both.',
          'Dates everywhere, including these notes, follow the language you picked.',
        ],
      },
      {
        title: 'The OP/ED player',
        icon: 'film',
        color: C.red,
        items: [
          'Play, pause, stop, the time, a scrub bar, volume and fullscreen, all drawn to match the site.',
          'A little settings menu for lyrics on or off, furigana, which language the translation line is in, and playback speed.',
          'Lyrics and furigana are shared with Settings, so flipping them in one place flips them in both.',
          'Muting at zero volume brings a usable volume back instead of staying silent.',
        ],
      },
      {
        title: 'Games',
        icon: 'capsule',
        color: C.green,
        how: 'Settings › Games',
        items: [
          'A Games section with a shortcut into each hidden game and your best score so far.',
          'Quiz questions, Skip to School goals and everyone’s chatter work in every language.',
          'Some Settings sections have a small moving preview, so you can see what an option does before you close the panel.',
          'The bottom of Settings shows which version of the site you’re on.',
        ],
      },
    ],
  },
  {
    id: 'new-faces',
    at: '2026-11-19T18:25:00+07:00',
    icon: 'smile',
    color: C.violet,
    title: 'New faces',
    intro:
      'The site got a lot more crowded this evening. Six more characters moved in, everyone got their art from the official anime site, and the site has its own cursors now because the plain ones felt a bit boring.',
    items: [
      'Fumi, Nao, Takamine, Yamada, Mukai and Kanechika joined the cast, so there are thirteen characters now.',
      'Everyone uses the art from the official anime site, and the pictures load a bit faster too.',
      'The new characters are in all four hidden games as well.',
    ],
    parts: [
      {
        title: 'Six more characters',
        icon: 'smile',
        color: C.violet,
        clip: { src: '/updates/new-faces.webp', alt: 'All thirteen characters flying in as the site opens' },
        items: [
          'The new six fly in with everyone else when the site opens, and you can drag them around like the others.',
          'Mukai, Yamada, Kanechika and Takamine have pictures on the birthday dial now, not just their names.',
          'In Skip to School, everyone can catch up with you now, not just six friends. The first six come as quickly as before, and the rest take longer, so getting all twelve in the line is a real challenge.',
          'The new characters talk while you run, give you dares with their own little tunes, and react if you pick them as your walking buddy in Find your friends.',
          'They show up in the capsule pairs trays and your collection too.',
        ],
      },
      {
        title: 'Cursors and clicks',
        icon: 'sparkle',
        color: C.pink,
        clip: { src: '/updates/cursors.webp', alt: 'The pink arrow, the yellow pointing hand on a tab, the green hand on a character, and a pop of colour from a click' },
        items: [
          'The site has its own cursors now, drawn like the icons around the page.',
          'A pink arrow most of the time, a yellow pointing hand on anything you can click, and a green hand on anything you can drag. The hand closes when you grab something.',
          'Clicking or tapping makes a little pop of colour. It stays out of the way in Skip to School and in text boxes, and it’s off if your device is set to reduce motion.',
        ],
      },
    ],
  },
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
          'Friends catch up with you as your score goes up. Get everyone to win, then keep going for the leaderboard.',
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
export const longDate = (iso: string, locale?: string) => {
  const d = new Date(iso)
  const day = d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
  const time = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
  return `${day} · ${time}`
}
/** short, for the thumbnails: "Nov 19" */
export const shortDate = (iso: string, locale?: string) => new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
