import type { Chapter, Entry, Line, Speaker } from './Dialogue'
import type { Backdrop } from './SceneBg'

/** Secret Santa, part 1. Four chapters: */
export interface Scene {
  lines: Line[]
  cast: [Speaker, Entry][]
  dark?: boolean
  /** a flashback, and when it was (from before the hat: Shima's bare-headed in these) */
  past?: string
  /** a painted place behind them */
  bg?: Backdrop
  /** this scene opens a chapter */
  chapter?: Chapter
  /** when and where, for a scene that isn't a flashback */
  when?: string
  /** snow falling the whole scene */
  snow?: boolean
  /** Mitsumi has her Santa hat on by now */
  mitsumiHat?: boolean
  /** they walk off together at the end */
  exit?: boolean
  /** one of part 2's scenes (it gets part 2's music) */
  part2?: boolean
  /** who has a Santa hat on from the start (part 2 says so outright) */
  hats?: Speaker[]
  /**
   * Part 2's altered memories: the line at `at` isn't how it really went. Catch it while it's
   * on screen ("That's not how it went") and it rewrites itself back into `fixed`.
   */
  spot?: { at: number; fixed: Line }
}
const both = (a: Entry = 'pop', b: Entry = 'pop'): [Speaker, Entry][] => [
  ['mitsumi', a],
  ['shima', b],
]

// ── Chapter 1 · The Ticket ───────────────────────────────────────────────

/** the gate beeps, Shima walks on, a Santa hat lands on his head out of nowhere, and he calls Mitsumi */
export const CALL: Scene = {
  chapter: { n: 1, title: 'The Ticket', note: 'Someone found it.' },
  cast: [['shima', 'shock']],
  lines: [
    { who: 'narrator', text: 'The ticket gate beeps. And something lands on Shima’s head.' },
    { who: 'shima', text: '{shake:Whoa!} What the— what is this?' },
    { who: 'shima', text: '...Is this a Santa hat? Since when am I wearing a Santa hat?' },
    { who: 'narrator', text: 'The gate’s little screen says {glow:UENO}.' },
    { who: 'shima', text: 'Okay. I’m calling Mitsumi.' },
    { who: 'mitsumi', via: 'phone', text: 'Hello? Shima-kun? It’s kind of late...' },
    { who: 'shima', text: 'Sorry. Hey, you know that ticket you hid?' },
    { who: 'mitsumi', via: 'phone', text: 'The Ueno one? Yeah?' },
    { who: 'shima', text: 'Someone just used it.' },
    { who: 'mitsumi', via: 'phone', text: '{big:Wait, seriously?!} Someone actually found it?' },
    { who: 'shima', text: 'Yep. Also I have a Santa hat on now.' },
    { who: 'mitsumi', via: 'phone', text: '...Huh?' },
    { who: 'shima', text: 'Don’t ask me. It just showed up.' },
    { who: 'mitsumi', via: 'phone', text: 'Okay, that’s weird.' },
    { who: 'shima', text: 'Yeah. Hang on, the lights are doing something—' },
    { who: 'narrator', fx: 'dark', text: 'The page goes dark.' },
  ],
}

/** in the dark: Mitsumi runs in */
export const ARRIVE: Scene = {
  cast: [
    ['shima', 'here'],
    ['mitsumi', 'walk'],
  ],
  dark: true,
  lines: [
    { who: 'mitsumi', text: 'Shima-kun! {small:Sorry, I ran here...}' },
    { who: 'mitsumi', text: 'Where’s everything? The tabs, the countdown, everyone. It’s all gone.' },
    { who: 'shima', text: 'I know. It all just shut off when the ticket went through.' },
    { who: 'mitsumi', text: 'It’s so quiet. Kind of creepy.' },
    { who: 'mitsumi', text: '...Okay, but the hat, though.' },
    { who: 'shima', text: 'Don’t.' },
    { who: 'mitsumi', text: '{wave:It’s cute!}' },
    { who: 'shima', text: 'It’s really not.' },
    { who: 'mitsumi', text: 'This is because of that letter, isn’t it?' },
    { who: 'shima', text: 'Has to be.' },
  ],
}

/** flashback: the letter in Mitsumi's shoe locker */
export const LETTER: Scene = {
  past: 'A week ago',
  bg: 'lockers',
  cast: both('here', 'here'),
  lines: [
    { who: 'mitsumi', text: 'Huh? There’s something in my shoe locker.' },
    { who: 'shima', text: 'Ooh. A love letter?' },
    { who: 'mitsumi', fx: 'shake', text: '{shake:No!} ...I mean, I don’t think so? There’s a snowflake sticker on it.' },
    { who: 'mitsumi', text: 'And it’s signed... question mark, question mark, question mark.' },
    { who: 'shima', text: 'Very mysterious.' },
    { who: 'unknown', via: 'letter', fx: 'glow', text: '{glow:Dear Mitsumi and Shima.} Will you two be Santa for the site this year?' },
    { who: 'unknown', via: 'letter', text: 'Hide this ticket where it all started, and wait for someone to find it. I’ll take care of the rest.' },
    { who: 'shima', text: '“I’ll take care of the rest.” That’s a little creepy.' },
    { who: 'mitsumi', text: 'I think it’s nice! Someone wants to do something nice for everyone. Let’s do it!' },
    { who: 'shima', text: 'You said yes way too fast.' },
    { who: 'mitsumi', text: 'I thought about it!' },
    { who: 'shima', text: 'For like a second.' },
    { who: 'mitsumi', text: '...A whole second.' },
  ],
}

/** back in the dark: what went wrong */
export const CONFESS: Scene = {
  cast: both('here', 'here'),
  dark: true,
  lines: [
    { who: 'mitsumi', text: 'So what’s wrong? You sounded weird on the phone.' },
    { who: 'shima', text: 'Okay, so. Yesterday I got another envelope. It was the list. Who’s giving what to who.' },
    { who: 'mitsumi', text: 'Okay...' },
    { who: 'shima', text: 'And then I opened my window.' },
    { who: 'mitsumi', text: '{small:Oh no.}' },
    { who: 'shima', text: 'It ripped into like five pieces and blew all over the site.' },
    { who: 'mitsumi', fx: 'shake', text: '{big:Shima-kun!}' },
    { who: 'shima', text: 'The presents are fine, though! I buried them in the snow so no one would peek.' },
    { who: 'mitsumi', text: 'You buried them. In the snow.' },
    { who: 'shima', text: 'It made sense at the time.' },
    { who: 'mitsumi', text: 'Okay, okay. We need the list first, or we won’t know which present is whose.' },
    { who: 'shima', text: 'The pieces are still flying around. One goes by every now and then.' },
    { who: 'mitsumi', text: 'Then we catch them! I’m good at chasing stuff. Back home I chased a flyer all the way down a hill once.' },
    { who: 'shima', text: 'Why were you chasing a flyer?' },
    { who: 'mitsumi', text: 'It had a coupon on it!' },
    { who: 'narrator', fx: 'flash', text: 'Somewhere, the countdown starts ticking again.' },
  ],
}

// ── Chapter 2 · The List ─────────────────────────────────────────────────

/** all five pieces caught */
export const PIECES: Scene = {
  chapter: { n: 2, title: 'The List', note: 'Five pieces and a roll of tape.' },
  cast: both(),
  lines: [
    { who: 'mitsumi', fx: 'snow', anim: 'spin', text: '{wave:Got it!} That’s all five!' },
    { who: 'shima', text: 'Nice. They’re all mixed up, though.' },
    { who: 'mitsumi', text: 'It’s fine, I have tape.' },
    { who: 'shima', text: 'Of course you have tape.' },
    { who: 'mitsumi', text: 'Tape is useful! Okay, hold this. The ripped edges should match up.' },
  ],
}

/** the list is whole: and there's something on the back */
export const MENDED: Scene = {
  cast: both(),
  lines: [
    { who: 'shima', text: 'Okay. That’s... mostly a list.' },
    { who: 'mitsumi', text: 'Wait, the presents are for the tabs? Like the Countdown and Volumes and stuff?' },
    { who: 'shima', text: 'Yeah. They work hard. The Countdown never even gets to sleep.' },
    { who: 'mitsumi', text: 'Aww. That’s actually really sweet.' },
    { who: 'shima', text: '{small:Don’t make it a thing.}' },
    { who: 'mitsumi', text: 'Hang on. There’s writing on the back.' },
    { who: 'shima', text: 'That’s not my handwriting.' },
    { who: 'unknown', via: 'letter', fx: 'glow', text: '{glow:The snow is holding on to your presents.} It won’t let go for just anyone.' },
    { who: 'unknown', via: 'letter', text: 'Every riddle you solve lights one of my lanterns. Light all three and the snow will let go. Take your time. I’ve already waited a long time.' },
    { who: 'shima', text: 'A long time? What’s that supposed to mean?' },
    { who: 'mitsumi', text: 'Oh, that’s why. I poked one of the snow piles on the way here and it was frozen solid.' },
    { who: 'shima', text: 'So. Three riddles, three lanterns.' },
    { who: 'mitsumi', text: 'And the presents are under the snow, so the list tells us who gets what after. It all connects!' },
    { who: 'shima', text: 'Pick whichever riddle you want. They’re all on the back.' },
  ],
}

// ── Chapter 3 · The Riddles ──────────────────────────────────────────────

/** the riddles can be solved in any order: whichever comes first opens the chapter */
export const RIDDLE_CHAPTER: Chapter = { n: 3, title: 'The Riddles', note: 'Three riddles, three lanterns. Then the snow lets go.' }

/** riddle 1: the countdown chimed on 25 */
export const CLOCK: Scene = {
  cast: both(),
  lines: [
    { who: 'narrator', fx: 'glow', text: 'The clock chimes.' },
    { who: 'mitsumi', anim: 'spin', text: '{wave:It worked!} Twenty-five, like Christmas!' },
    { who: 'shima', text: 'How’d they know we’d be here right at that second?' },
    { who: 'mitsumi', text: 'You think they’re watching us?' },
    { who: 'shima', text: 'Kind of feels like it. Remember that box?' },
  ],
}

/** flashback: the empty box, on the walk home */
export const BOX: Scene = {
  past: 'Three days ago',
  bg: 'street',
  cast: both('here', 'here'),
  lines: [
    { who: 'shima', text: 'Someone left this on my desk at lunch.' },
    { who: 'mitsumi', text: 'A box? What’s in it?' },
    { who: 'shima', text: 'Nothing. Just a card.' },
    { who: 'shima', text: 'It says “{glow:Open when the ticket is used.}”' },
    { who: 'mitsumi', text: '...But it’s already open.' },
    { who: 'shima', text: 'Yeah. I noticed.' },
    { who: 'mitsumi', text: 'That’s so weird.' },
    { who: 'shima', text: 'Yeah.' },
  ],
}

/** back from the flashback */
export const BOX_AFTER: Scene = {
  cast: both(),
  lines: [
    { who: 'mitsumi', text: 'So the box was empty, and now you’ve got a hat.' },
    { who: 'shima', text: 'When you put it like that it’s even weirder.' },
    { who: 'mitsumi', text: 'Okay. That’s a lantern lit, anyway.' },
  ],
}

/** riddle 2: the birthday wheel, turned to Yuzuki */
export const WHEEL: Scene = {
  cast: both(),
  lines: [
    { who: 'mitsumi', text: 'Yuzuki! December eleventh. That’s the closest to Christmas!' },
    { who: 'shima', text: 'Should we tell her she’s part of a riddle?' },
    { who: 'mitsumi', text: 'She’d be so annoyed she didn’t get to solve it herself.' },
    { who: 'shima', text: 'Honestly, she’d have figured out who ??? is by now.' },
    { who: 'mitsumi', fx: 'glow', text: 'Look, another lantern just lit up!' },
  ],
}

/** riddle 3: ???'s seal inside a cover */
export const SEAL: Scene = {
  cast: both(),
  lines: [
    { who: 'mitsumi', text: 'There’s a stamp in here. It’s the same snowflake as the letter.' },
    { who: 'mitsumi', text: 'Wait. I’ve seen this before. Before the letter, I mean.' },
    { who: 'shima', text: 'Where?' },
    { who: 'mitsumi', text: 'Last Christmas. At Ueno Park, at the lights.' },
  ],
}

/** flashback: the Santa at Ueno Park */
export const UENO: Scene = {
  past: 'Last December',
  bg: 'ueno',
  cast: both('here', 'here'),
  lines: [
    { who: 'mitsumi', anim: 'spin', text: '{wave:Shima-kun, look!} The whole park’s lit up!' },
    { who: 'shima', text: 'Watch where you’re going, you’re about to hit a tree.' },
    { who: 'mitsumi', text: 'Oh, there’s a Santa handing stuff out!' },
    { who: 'unknown', text: '{glow:Here, for you two.} Hang on to it. You’ll need it next winter.' },
    { who: 'mitsumi', text: 'Oh! Um, thank you!' },
    { who: 'mitsumi', text: '...Huh? Where’d they go?' },
    { who: 'shima', text: '{small:That voice...}' },
    { who: 'mitsumi', text: 'Hm?' },
    { who: 'shima', text: 'Nothing.' },
  ],
}

/** flashback, further back: Shima at eight, on a commercial shoot */
export const SET: Scene = {
  past: 'Nine years ago',
  bg: 'set',
  cast: [],
  lines: [
    { who: 'narrator', text: 'Shima was eight. They’d been shooting a Christmas commercial since the morning.' },
    { who: 'shima', via: 'memory', tag: 'age 8', text: '{small:I’m cold. Can we go home now?}' },
    { who: 'unknown', text: 'Just one more take, {glow:little star}. Here, hold this. It’ll keep your hands warm.' },
    { who: 'narrator', fx: 'snow', text: 'A paper ticket, with a snowflake stamped in the corner.' },
    { who: 'unknown', text: 'Someday you’ll get to be someone’s Santa, too.' },
    { who: 'narrator', text: 'He never found out her name.' },
  ],
}

/** back from the film set: Shima puts it together */
export const SET_AFTER: Scene = {
  cast: both(),
  lines: [
    { who: 'shima', text: 'Mitsumi. I think I’ve met ??? before. Way before the park.' },
    { who: 'mitsumi', text: 'What? When?' },
    { who: 'shima', text: 'When I was a kid. On a shoot. I totally forgot until just now.' },
    { who: 'mitsumi', text: 'Shima-kun...' },
    { who: 'shima', text: '{small:It’s fine.} Anyway. That’s another lantern.' },
  ],
}

/** all three lanterns lit: the snow lets go */
export const THAW: Scene = {
  cast: both(),
  lines: [
    { who: 'narrator', fx: 'glow', text: 'The third lantern lights up.' },
    { who: 'narrator', fx: 'shake', text: 'The whole page shakes.' },
    { who: 'mitsumi', text: '{big:Listen!} The snow’s cracking!' },
    { who: 'shima', text: 'Guess that means we can dig now.' },
    { who: 'mitsumi', text: 'Let’s go! Dig them up, then give each one to whoever wanted it.' },
  ],
}

// ── Chapter 4 · The Key ──────────────────────────────────────────────────

/** every present delivered: a key, a voice, and an old nickname */
export const BLESS: Scene = {
  chapter: { n: 4, title: 'The Key', note: 'The last chapter of part 1.' },
  cast: both(),
  lines: [
    { who: 'mitsumi', fx: 'snow', anim: 'spin', text: '{wave:That’s the last one!} Everyone got what they wanted!' },
    { who: 'shima', text: 'Not bad for a Santa who lost the list.' },
    { who: 'mitsumi', text: 'Wait, look at the tags. U, E, N, O... and a snowflake.' },
    { who: 'shima', text: 'Ueno. Again.' },
    { who: 'mitsumi', text: 'Shima-kun, look. The snow over there is glowing.' },
    { who: 'shima', text: '{small:I didn’t bury anything there.}' },
    { who: 'narrator', fx: 'glow', text: 'There’s a key in the snow. An old brass one.' },
    { who: 'mitsumi', text: 'It says “Ueno” on it. Like the ticket.' },
    { who: 'unknown', via: 'voice', fx: 'glow', text: '{glow:You two did great.} The presents were never really the point.' },
    { who: 'mitsumi', fx: 'shake', text: '{shake:That’s her!} The Santa from the park!' },
    { who: 'unknown', via: 'voice', text: 'This was for you, {glow:little star}. It always was.' },
    { who: 'narrator', text: 'Shima doesn’t move.' },
    { who: 'unknown', via: 'voice', text: 'Keep the key safe. You’ll know when to use it. {glow:Merry Christmas.}' },
    { who: 'narrator', text: 'And then it’s quiet again.' },
    { who: 'mitsumi', text: '...“Little star”?' },
    { who: 'shima', text: '{small:No one’s called me that since I was a kid.}' },
  ],
}

/** right after: a hat for Mitsumi too, and the snow starts */
export const HAT_TOO: Scene = {
  cast: both('here', 'here'),
  lines: [
    { who: 'mitsumi', text: 'So... what do we do with a key that doesn’t open anything yet?' },
    { who: 'shima', text: 'Keep it safe, I guess. Like she said.' },
    { who: 'mitsumi', text: '“She.” So it *is* a she.' },
    { who: 'shima', text: '...Yeah. I think so.' },
    { who: 'narrator', fx: 'poof', text: 'Something lands on Mitsumi’s head.' },
    { who: 'mitsumi', fx: 'shake', text: '{shake:Eh?!} Wait, is this— is this a—' },
    { who: 'shima', anim: 'spin', text: '{wave:Oh, nice.} Welcome to the club.' },
    { who: 'mitsumi', text: 'Why do *I* have one now?!' },
    { who: 'shima', text: 'Two Santas. The letter did say two.' },
    { who: 'mitsumi', text: '...Huh. It’s actually really warm.' },
    { who: 'shima', text: 'Right? That’s the annoying part.' },
    { who: 'narrator', fx: 'snow', text: 'And then it starts to snow. On the site, for real this time.' },
    { who: 'mitsumi', anim: 'spin', text: '{wave:Shima-kun, it’s snowing!}' },
    { who: 'shima', text: 'Yeah. Okay. That’s pretty nice.' },
  ],
}

/** the next morning, on the way to school: they talk it all over, then head in together */
export const WALK: Scene = {
  when: 'The next morning',
  bg: 'school',
  snow: true,
  mitsumiHat: true,
  exit: true,
  cast: [
    ['mitsumi', 'walk'],
    ['shima', 'walk'],
  ],
  lines: [
    { who: 'narrator', text: 'The next morning, it’s still snowing.' },
    { who: 'mitsumi', text: 'Morning! I barely slept. I kept thinking about the key.' },
    { who: 'shima', text: 'I slept great.' },
    { who: 'mitsumi', text: 'Liar. You’ve got bags under your eyes.' },
    { who: 'shima', text: '...Okay, I slept okay.' },
    { who: 'mitsumi', text: 'Do you think the tabs liked their presents?' },
    { who: 'shima', text: 'The Countdown looked happier. I swear it was ticking faster.' },
    { who: 'mitsumi', text: 'That’s not how countdowns work, Shima-kun.' },
    { who: 'shima', text: 'You don’t know that.' },
    { who: 'mitsumi', text: 'And Birthdays got cake, so Yuzuki’s birthday is basically covered.' },
    { who: 'shima', text: 'We should probably still get her an actual present.' },
    { who: 'mitsumi', text: '{small:Oh. Right. Yeah.}' },
    { who: 'mitsumi', text: 'Hey. Are you okay? About the “little star” thing?' },
    { who: 'shima', text: 'Yeah. It’s kind of nice, actually. Someone remembered.' },
    { who: 'mitsumi', text: 'Then let’s find her. Properly. Whenever that key decides to do something.' },
    { who: 'shima', text: 'Deal.' },
    { who: 'shima', text: '...You’re wearing the hat to school, aren’t you.' },
    { who: 'mitsumi', anim: 'spin', text: '{wave:Obviously!} We’re Santas now!' },
    { who: 'shima', text: '{small:I’m taking mine off before homeroom.}' },
    { who: 'mitsumi', text: 'No you’re not.' },
    { who: 'shima', text: '...No, I’m not.' },
    { who: 'narrator', text: 'They walk the rest of the way together, two Santa hats bobbing along through the snow.' },
  ],
}
