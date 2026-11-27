import type { Chapter, Entry, Line, Speaker } from './Dialogue'
import { BOX, LETTER, SET, UENO, type Scene } from './story'

/**
 * Secret Santa, part 2: "The Tilt".
 *
 * How they talk: like people, not like a quest log. Half-sentences, talking over each other,
 * changing the subject, small jokes when they're nervous. Nobody explains the plot to anyone.
 *
 * And they know. They know they're on a website, that there's a text box under them, that the
 * tabs are tabs, and that someone (you) is reading this and pressing a key to make the next line
 * come. Each of them takes it their own way:
 *   Shima    used to act, so he always knows where the camera is; he noticed you first and he's
 *            weirdly calm about it
 *   Mitsumi  is delighted, and polite to you, and keeps forgetting you can hear her
 *   Makoto   has read enough manga to know a visual novel when she's standing in one
 *   Yuzuki   finds it rude that you can skip her lines, and says so
 *   ???      speaks to you exactly once, near the end
 * Don't lean on it every line. A wink now and then, then back to the story.
 *
 * Text effects inside a line: *italics*, {shake:…}, {wave:…}, {small:…}, {big:…}, {glow:…}.
 * `anim: 'peer'` has someone lean right up to the screen, at you.
 */

const ch = (n: number, title: string, note: string): Chapter => ({ n, title, note })
const HATS: Speaker[] = ['shima', 'mitsumi']
type Cast = [Speaker, Entry][]
const both = (a: Entry = 'pop', b: Entry = 'pop'): Cast => [
  ['mitsumi', a],
  ['shima', b],
]
const three = (): Cast => [
  ['mitsumi', 'here'],
  ['makoto', 'here'],
  ['shima', 'here'],
]
const four = (): Cast => [
  ['mitsumi', 'here'],
  ['makoto', 'here'],
  ['shima', 'here'],
  ['yuzuki', 'here'],
]
/** a memory from the set: washed out, nobody standing there, just the voices */
const SET_PAST = 'Nine years ago'

export type Scene2 = Scene & { hats?: Speaker[] }

// ── Chapter 1 · Something's Different ────────────────────────────────────

/** the key goes warm, the site is wrong, and their memories don't match */
export const ALTERED: Scene2 = {
  chapter: ch(1, 'Something’s Different', 'Remember it right.'),
  when: 'December',
  hats: HATS,
  cast: both(),
  lines: [
    { who: 'mitsumi', anim: 'peer', text: '{wave:Oh! You’re back!} Hi! Sorry, give us a second, we were just—' },
    { who: 'shima', text: 'She’s been checking the ticket gate every ten minutes.' },
    { who: 'mitsumi', text: '{small:Not *every* ten minutes.}' },
    { who: 'shima', text: 'Anyway. The key’s gone warm. Like it’s been sitting on a radiator.' },
    { who: 'mitsumi', text: 'And something’s off with the site. Look at the page behind us. Who’s missing?' },
    { who: 'shima', text: 'Yuzuki. She was standing right there yesterday.' },
    { who: 'mitsumi', text: 'And her birthday on the wheel just says “Y.” now. That’s not funny.' },
    { who: 'shima', text: 'Okay. Let’s not panic. Let’s just... start from the start. The first letter. My desk.' },
    { who: 'mitsumi', fx: 'shake', text: '{shake:My shoe locker!} I was *there*, Shima-kun!' },
    { who: 'shima', text: 'So was I. It was on my desk.' },
    { who: 'shima', text: '{small:...Wasn’t it?}' },
    { who: 'narrator', fx: 'glow', text: 'The key gets warmer in his hand.' },
    { who: 'unknown', via: 'voice', fx: 'glow', text: '{glow:Something’s been changed.}' },
    { who: 'unknown', via: 'voice', text: 'In each of your memories, one thing isn’t how it happened. Go back through them. Put them right.' },
    { who: 'mitsumi', text: 'How are we meant to spot it? It’s *our* memory. It all sounds right to us.' },
    { who: 'shima', anim: 'peer', text: 'Not to everyone. {small:Somebody out there’s been reading along since part 1.}' },
    { who: 'shima', text: 'If a line sounds wrong to you, stop it. Hit “That’s not how it went”. We’ll trust you.' },
    { who: 'mitsumi', text: '{small:Please be good at this.}' },
  ],
}

/**
 * One of part 1's memories, coming back changed: the line at `at` is swapped for `wrong`.
 * Catch it and it turns back into the real one.
 */
const altered = (scene: Scene, at: number, wrong: Line): Scene2 => ({
  ...scene,
  chapter: undefined,
  lines: scene.lines.map((l, i) => (i === at ? wrong : l)),
  spot: { at, fixed: scene.lines[at] },
})

/** the four altered memories, in the order they come back */
export const MEMORY: Scene2[] = [
  altered(LETTER, 3, { who: 'mitsumi', text: 'And it’s signed... just a letter. “Y.”' }),
  altered(BOX, 3, { who: 'shima', text: 'It says “Open when I say.”' }),
  altered(UENO, 3, { who: 'unknown', text: '{glow:Here, for you two.} Hang on to it. See you at school.' }),
  altered(SET, 2, { who: 'unknown', tag: 'a girl’s voice', text: 'Just one more take, little star. I’m cold too, you know.' }),
]

/** a memory went by without anyone stopping it */
export const MISSED: Scene2 = {
  hats: HATS,
  cast: both('here', 'here'),
  lines: [
    { who: 'shima', text: 'Something in that was wrong. I could feel it. Couldn’t you?' },
    { who: 'mitsumi', text: 'It’s okay! Again, slower. I’ll walk extra slowly.' },
  ],
}

/** all four put back: and the first suspicion */
export const RESTORED: Scene2 = {
  hats: HATS,
  cast: both('here', 'here'),
  lines: [
    { who: 'shima', text: 'That’s four. They feel... right again. Like a song that was out of tune and isn’t.' },
    { who: 'mitsumi', anim: 'peer', text: '{wave:Thank you!} Really. I’d have believed every one of them.' },
    { who: 'mitsumi', text: 'But someone *changed* them. Who even does that?' },
    { who: 'shima', text: 'Someone who signs with a Y, apparently.' },
    { who: 'mitsumi', text: 'Yuzuki starts with a Y.' },
    { who: 'shima', text: 'So does “yogurt”.' },
    { who: 'mitsumi', text: '{small:...Yogurt isn’t missing from the page, though.}' },
    { who: 'narrator', text: 'Neither of them says anything for a bit.' },
  ],
}

// ── Chapter 2 · The Letter ───────────────────────────────────────────────

/** ??? wants a letter first */
export const OPEN: Scene2 = {
  chapter: ch(2, 'The Letter', 'Santa never gets one. Almost never.'),
  hats: HATS,
  cast: both('here', 'here'),
  lines: [
    { who: 'unknown', via: 'voice', fx: 'glow', text: '{glow:Before the key turns,} I want a letter. Put one in the big Secret Santa box.' },
    { who: 'mitsumi', text: 'A letter? For you?' },
    { who: 'unknown', via: 'voice', text: 'For anyone. Santas give all year and nobody writes back. {glow:Well. Almost nobody.}' },
    { who: 'unknown', via: 'voice', text: 'Someone wrote me one once. I still have it.' },
    { who: 'narrator', text: 'And then it’s quiet.' },
    { who: 'mitsumi', text: 'Who writes a letter *to* Santa and actually hands it to her?' },
    { who: 'shima', text: '{small:...A kid. On a film set.}' },
    { who: 'mitsumi', text: 'Hm?' },
    { who: 'shima', text: 'Nothing. Come on. Secret Santa tab.' },
    { who: 'mitsumi', anim: 'peer', text: 'Oh, and you should write one too! A real one. It goes in the same box as everyone’s.' },
  ],
}

/** the letter goes in, and she picks the globe up */
export const TILT: Scene2 = {
  hats: HATS,
  cast: both('here', 'here'),
  lines: [
    { who: 'narrator', fx: 'glow', text: 'The letter drops into the big box. The lid clicks shut.' },
    { who: 'mitsumi', text: 'See? Easy. That wasn’t scary at all—' },
    { who: 'narrator', fx: 'tilt', tilt: -5, sway: 0.8, text: 'And the whole site lurches sideways. Everything on it slides.' },
    { who: 'mitsumi', text: '{shake:Whoa whoa whoa!}' },
    { who: 'shima', text: 'Everyone on the page just fell over. Hi, everyone.' },
    { who: 'mitsumi', text: 'The stickers are all in a pile! And we’re crooked! Are *you* crooked?' },
    { who: 'shima', text: 'They’re not. It’s just us. And the site.' },
    { who: 'unknown', via: 'voice', fx: 'glow', text: '{glow:Thank you for the letter.} Hold on. I’m picking it up.' },
    { who: 'shima', text: 'Picking *what* up?' },
    { who: 'unknown', via: 'voice', text: 'You worked it out last time, little star. Watch for the light.' },
    { who: 'narrator', text: 'Over on the Countdown page, a small light starts blinking. On, off. On-on-on, off.' },
    { who: 'shima', text: '{small:...I know that light.}' },
  ],
}

// ── Chapter 3 · The Signal ───────────────────────────────────────────────

/** Makoto turns up, and knows Morse */
export const SIGNAL: Scene2 = {
  chapter: ch(3, 'The Signal', 'Long and short. On and off.'),
  hats: HATS,
  cast: [
    ['mitsumi', 'here'],
    ['shima', 'here'],
    ['makoto', 'walk'],
  ],
  lines: [
    { who: 'makoto', text: 'Um. Sorry. Is the whole site meant to be sideways? My books all slid to one end of the Volumes page.' },
    { who: 'mitsumi', anim: 'spin', text: '{wave:Mako-chan!}' },
    { who: 'makoto', text: 'Oh. And there’s a text box under us.' },
    { who: 'makoto', text: '{small:We’re in a visual novel, aren’t we. I knew it felt like one.}' },
    { who: 'shima', text: 'You get used to it. Did you see the light on the Countdown?' },
    { who: 'makoto', text: 'Long blinks and short ones. That’s Morse code. I learned it for a manga about a radio club.' },
    { who: 'shima', text: 'It’s a cue light. From a film set.' },
    { who: 'mitsumi', text: 'How do you know *that*?' },
    { who: 'shima', text: 'Because somebody used to blink one at me.' },
  ],
}

/** flashback: between takes, ??? and the cue light */
export const CUE: Scene2 = {
  past: SET_PAST,
  bg: 'set',
  cast: [],
  lines: [
    { who: 'narrator', text: 'Between takes. The giant snow globe is dark, and the eight-year-old inside it is sulking.' },
    { who: 'unknown', text: 'See that little light, {glow:little star}? The one the crew keeps looking at?' },
    { who: 'shima', via: 'memory', tag: 'age 8', text: 'It blinks when they want me.' },
    { who: 'unknown', text: 'It can say anything, if you know how. Short, short, short. Long, long, long.' },
    { who: 'unknown', text: 'I’ll talk to you with it. Then you’re not on your own in there.' },
    { who: 'shima', via: 'memory', tag: 'age 8', text: '{small:What if I want to talk back?}' },
    { who: 'unknown', fx: 'glow', text: 'When I ask where you are, tap back where we are. Then I’ll know you’re okay.' },
    { who: 'shima', via: 'memory', tag: 'age 8', text: '{wave:Ueno!}' },
  ],
}

/** back on the page: Makoto will read, they'll write it down */
export const CUE_AFTER: Scene2 = {
  hats: HATS,
  cast: three(),
  lines: [
    { who: 'shima', text: 'She taught me. I don’t remember a single letter of it now, though.' },
    { who: 'makoto', text: 'I do. Mostly. If we write it down as it blinks. Dot for short, dash for long.' },
    { who: 'makoto', text: 'A little gap between letters, a longer one between words. Slow it down if it’s too fast. It’s not cheating.' },
    { who: 'mitsumi', anim: 'peer', text: 'You’re on pen duty, okay? We’ll read over your shoulder.' },
  ],
}

/** the message is read: and she's asking where they are */
export const HEARD = (signal: string): Scene2 => ({
  hats: HATS,
  cast: three(),
  lines: [
    { who: 'makoto', text: `{wave:Got it.} “${signal}.” That’s what it says.` },
    { who: 'shima', text: '{small:She used to say that. Every time.}' },
    { who: 'narrator', fx: 'glow', text: 'The light blinks again, quicker now. Then it stops, like it’s waiting.' },
    { who: 'makoto', text: '“Where are you?” And a question mark. She’s asking us.' },
    { who: 'mitsumi', text: 'So we answer like you did! With where we are!' },
    { who: 'shima', text: 'Ueno. Same as the key.' },
    { who: 'makoto', text: 'Tap for a dot, hold for a dash, and wait a moment between letters. You’ve got this. Probably.' },
  ],
})

// ── Chapter 4 · The Shift ────────────────────────────────────────────────

/** she heard them: the site swings the other way, and every word on it shifts */
export const SWING = (shifted: string): Scene2 => ({
  hats: HATS,
  cast: three(),
  lines: [
    { who: 'narrator', fx: 'flash', text: 'The light goes steady. Then out.' },
    { who: 'unknown', via: 'voice', fx: 'glow', text: '{glow:There you are.}' },
    { who: 'narrator', fx: 'tilt', tilt: 6, sway: 1.2, shift: true, text: 'The site swings back the other way, hard. Everything slides across the page again.' },
    { who: 'mitsumi', fx: 'shake', text: '{shake:Hold on to something!}' },
    { who: 'shima', text: 'Like what? The text box?' },
    { who: 'makoto', text: '{small:Please don’t hold on to the text box.}' },
    { who: 'mitsumi', text: `Wait, look at the tabs! Since when is there a tab called “${shifted}”?` },
    { who: 'makoto', text: 'The letters moved. All of them. Same distance, I think.' },
  ],
})

/** Yuzuki turns up, a bit put out, and doesn't seem to know she was ever gone */
export const YUZUKI: Scene2 = {
  chapter: ch(4, 'The Shift', 'Every letter, the same distance along.'),
  hats: HATS,
  cast: [
    ['mitsumi', 'here'],
    ['makoto', 'here'],
    ['shima', 'here'],
    ['yuzuki', 'walk'],
  ],
  lines: [
    { who: 'yuzuki', text: 'Okay. Why is everything sideways, and why do the tabs look like a password?' },
    { who: 'mitsumi', fx: 'shake', text: '{shake:Yuzuki!} Where have you *been*? You weren’t on the page!' },
    { who: 'yuzuki', text: '{small:...Wasn’t I?}' },
    { who: 'shima', text: '{small:You weren’t.}' },
    { who: 'yuzuki', text: 'Whatever. I heard there were *riddles* last week. Nobody told me.' },
    { who: 'shima', text: 'You were busy.' },
    { who: 'yuzuki', text: 'I’m never too busy for riddles.' },
    { who: 'yuzuki', anim: 'peer', text: 'And you. Yes, you. Don’t skip my lines. I can tell.' },
    { who: 'yuzuki', text: 'Anyway, there’s a sheet of paper on the Volumes page. Total gibberish.' },
    { who: 'shima', text: '{small:...A call sheet.}' },
  ],
}

/** flashback: the call sheet, in her code */
export const CALLSHEET: Scene2 = {
  past: SET_PAST,
  bg: 'set',
  cast: [],
  lines: [
    { who: 'shima', via: 'memory', tag: 'age 8', text: 'My call sheet’s broken. The letters are all wrong.' },
    { who: 'unknown', text: 'That’s because there’s a surprise on it, and you’re not allowed to peek.' },
    { who: 'shima', via: 'memory', tag: 'age 8', text: 'Then how do I read it?' },
    { who: 'unknown', fx: 'glow', text: 'Every letter got moved along the alphabet by {glow:how old you are}. Move them back, and there it is.' },
    { who: 'unknown', text: 'When you’re bigger. Not now.' },
  ],
}

/** back on the page: so how old was he */
export const CALLSHEET_AFTER: Scene2 = {
  hats: HATS,
  cast: four(),
  lines: [
    { who: 'shima', text: 'Every letter, moved along by how old I was. On the shoot.' },
    { who: 'yuzuki', text: 'Which was?' },
    { who: 'shima', text: '{small:Old enough to remember the number.}' },
    { who: 'yuzuki', text: 'That’s not an answer, that’s a fortune cookie.' },
    { who: 'makoto', text: 'We can count it, then. We know what the tabs are *supposed* to say. See how far one of them moved.' },
    { who: 'mitsumi', text: 'Volumes page! Pen duty again, sorry!' },
  ],
}

// ── Chapter 5 · The Snow Globe ───────────────────────────────────────────

/** the call sheet says to turn it over: and she does */
export const FLIP: Scene2 = {
  hats: HATS,
  cast: four(),
  lines: [
    { who: 'yuzuki', text: '“Little star. This site is my snow globe. To make it snow, turn it over.”' },
    { who: 'mitsumi', text: 'Turn what over?' },
    { who: 'makoto', text: '{small:Oh no. Oh no, I know this panel.}' },
    { who: 'narrator', fx: 'tilt', tilt: 180, sway: 1.5, text: 'The whole site turns upside down.' },
    { who: 'narrator', text: 'Everything that isn’t stuck down falls to the bottom. The stickers. The characters. Them.' },
    { who: 'mitsumi', fx: 'shake', text: '{shake:We’re upside down!!}' },
    { who: 'shima', text: 'Everything is. Hold on to your hat. Literally.' },
    { who: 'makoto', text: 'It’s a snow globe. Someone’s holding it. And shaking it.' },
    { who: 'yuzuki', text: 'She turned a whole *website* into a snow globe? Who has the time?' },
    { who: 'shima', text: '{small:She turned a whole film set into one, once.}' },
    { who: 'mitsumi', anim: 'peer', text: 'Sorry, you must be reading this with your head tilted. Hang in there!' },
  ],
}

/** the little globe from the set, shaken loose */
export const GLOBE: Scene2 = {
  chapter: ch(5, 'The Snow Globe', 'Turned over, everything falls.'),
  hats: HATS,
  cast: four(),
  lines: [
    { who: 'mitsumi', text: 'Something rolled onto the Birthdays page when everything fell. A little snow globe!' },
    { who: 'shima', text: 'That was on the set. A tiny one, same as the big one.' },
    { who: 'yuzuki', text: 'There’s a snowball in it. And a maze. And four stars.' },
    { who: 'shima', text: 'The set had four lights with numbers taped on. For the crew.' },
    { who: 'makoto', text: 'If you tip it, the snowball slides until it hits something. It can’t stop halfway.' },
    { who: 'makoto', text: 'And if it falls in a hole, it starts over. Stars and everything.' },
    { who: 'yuzuki', text: 'All four stars, then the gate. Remember the order they light up in. Mitsumi, you’re steering.' },
    { who: 'mitsumi', fx: 'shake', text: '{shake:Me?! I’m upside down!}' },
    { who: 'shima', text: 'We all are. Actually...' },
    { who: 'shima', anim: 'peer', text: 'You steer. You’ve got the arrow keys. She’s got two left hands right now.' },
    { who: 'mitsumi', text: '{small:I have the normal number of hands.}' },
  ],
}

/** four lights, four numbers; the site rolls back over and it snows */
export const DIGITS = (digits: number[]): Scene2 => ({
  hats: HATS,
  cast: four(),
  lines: [
    { who: 'narrator', fx: 'glow', text: `The snowball drops into the gate. The four lights come on, in order: ${digits.join(', ')}.` },
    { who: 'narrator', fx: 'tilt', tilt: 3, sway: 0.6, text: 'Slowly, the site rolls back over. Everything tumbles down the other side.' },
    { who: 'narrator', fx: 'snow', text: 'And then, everywhere, it snows.' },
    { who: 'mitsumi', anim: 'spin', text: '{wave:She shook it! It’s snowing!}' },
    { who: 'yuzuki', text: `${digits.join(', ')}. Four numbers in an order. That’s a lock combination if I ever saw one.` },
    { who: 'unknown', via: 'voice', fx: 'glow', text: '{glow:The night the box bursts open.} Where the letters wait.' },
    { who: 'makoto', text: 'The Secret Santa box bursts on the twenty-fourth of December. Twelve, twenty-four.' },
    { who: 'mitsumi', text: 'And letters wait in the... Message tab?' },
    { who: 'shima', text: 'There’s a coin locker on the Message page. Number 1224. I’d bet anything.' },
    { who: 'yuzuki', text: 'Of course there is. Locker 1224, and the lights are the code.' },
  ],
})

// ── Chapter 6 · Locker 1224 ──────────────────────────────────────────────

/** the locker opens: his old letter, the photo, the Dimensional Gift, "Y." */
export const LOCKER_OPEN: Scene2 = {
  chapter: ch(6, 'Locker 1224', 'Where the letters wait.'),
  hats: HATS,
  cast: four(),
  lines: [
    { who: 'narrator', fx: 'glow', text: 'The locker clicks open. Behind it, a second little door with a keyhole. The Key of Ueno fits.' },
    { who: 'narrator', text: 'Inside: their letter from today, on top. Under it, an old envelope in crayon. A photo. And a tiny gift box that hums, like it’s much bigger on the inside.' },
    { who: 'mitsumi', text: 'That’s our letter! She really kept it.' },
    { who: 'makoto', text: 'And this one says... “To Santa. From Sousuke, age 8.”' },
    { who: 'shima', fx: 'shake', text: '{shake:Don’t read that out loud.}' },
    { who: 'yuzuki', text: '“I would like to see real snow. And go home soon. Thank you for the light.”' },
    { who: 'shima', text: '{small:I *said* don’t.}' },
    { who: 'mitsumi', text: 'Shima-kun. That’s so sweet.' },
    { who: 'shima', anim: 'peer', text: 'And you didn’t see any of that. We’re clear?' },
    { who: 'makoto', text: 'The photo’s from the set. Inside the big snow globe. You’re wearing the hat.' },
    { who: 'yuzuki', text: 'Hold on. Is that the *same hat*?' },
    { who: 'shima', text: '{small:...Looks like it.}' },
    { who: 'mitsumi', text: 'There’s someone next to you. You can’t see her face, the snow’s in the way. On the back: “For my little star. Y.”' },
    { who: 'unknown', via: 'voice', fx: 'glow', text: '{glow:I keep every letter a Santa sends me.} His was the first. Yours is next to it now.' },
    { who: 'unknown', via: 'voice', text: 'That’s a Dimensional Gift. Don’t open it yet. Soon, come and find me.' },
    { who: 'unknown', via: 'voice', fx: 'glow', text: '{glow:And you, reading this.} Thank you for bringing them all the way here.' },
    { who: 'narrator', fx: 'tilt', tilt: 0, text: 'The site rights itself, slowly, like someone setting a snow globe back on the shelf.' },
    { who: 'mitsumi', anim: 'spin', text: '{wave:It’s straight again!}' },
    { who: 'yuzuki', text: 'Finally. I was getting seasick.' },
  ],
}

/** two more Santa hats, and the snow settles for good */
export const HATS_TOO: Scene2 = {
  hats: HATS,
  cast: four(),
  lines: [
    { who: 'makoto', text: 'So... who’s Y?' },
    { who: 'shima', text: 'The person who built the snow globe. That’s all I ever knew.' },
    { who: 'mitsumi', text: 'Soon, she said. Then we’ll find out the rest.' },
    { who: 'narrator', fx: 'poof', hats: ['yuzuki', 'makoto'], text: 'Two somethings land. One on Yuzuki, one on Makoto.' },
    { who: 'yuzuki', fx: 'shake', text: '{shake:Excuse me?!}' },
    { who: 'makoto', text: 'Oh. A Santa hat. It’s... really warm, actually.' },
    { who: 'mitsumi', anim: 'spin', text: '{wave:Four Santas!}' },
    { who: 'shima', text: 'The letter said two. I think she’s just adding people now.' },
    { who: 'yuzuki', text: 'I’m keeping it. For the record.' },
    { who: 'makoto', text: '{small:Me too.}' },
    { who: 'narrator', fx: 'snow', text: 'The snow she shook up drifts down over the whole site, and stays.' },
    { who: 'mitsumi', text: 'Look. Yuzuki’s back on the page. Hat and everything.' },
    { who: 'yuzuki', text: '{small:Of course I am. Where else would I be?}' },
    { who: 'makoto', text: '{small:...}' },
  ],
}

/** that evening: the four of them walk home through it */
export const HOME: Scene2 = {
  when: 'That evening',
  bg: 'street',
  snow: true,
  exit: true,
  hats: ['shima', 'mitsumi', 'yuzuki', 'makoto'],
  cast: [
    ['mitsumi', 'pop'],
    ['makoto', 'pop'],
    ['shima', 'pop'],
    ['yuzuki', 'pop'],
  ],
  lines: [
    { who: 'yuzuki', text: 'Morse code, a cipher, the whole site upside down, and a locker. In one afternoon.' },
    { who: 'makoto', text: 'I’ve never been this useful in my life.' },
    { who: 'mitsumi', text: 'Mako-chan, you were the *most* useful!' },
    { who: 'shima', text: 'True. I mostly stood there being crooked.' },
    { who: 'yuzuki', text: 'You were very good at it.' },
    { who: 'mitsumi', text: 'Shima-kun. The letter. Did you ever get to see real snow? That year?' },
    { who: 'shima', text: 'Not that year.' },
    { who: 'shima', text: '{small:...This counts, though.}' },
    { who: 'makoto', text: 'So, soon, then.' },
    { who: 'yuzuki', text: 'And next time, *nobody* solves anything without me.' },
    { who: 'shima', text: 'Deal.' },
    { who: 'mitsumi', anim: 'peer', text: '{wave:Thanks for walking with us!} Come back for part 3, okay? We’ll wait right here.' },
    { who: 'narrator', text: 'Four Santa hats head off into the snow, and the site, for now, stays the right way up.' },
  ],
}
