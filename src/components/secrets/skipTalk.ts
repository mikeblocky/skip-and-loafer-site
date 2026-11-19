/**
 * Skip to School: side chatter. The friends running along (and whoever leads the page) chime in
 * on what's happening: a hit, a heal, a twist, a break, a dare. These are our own little lines,
 * not quotes from the series.
 */

export type TalkEvent =
  | 'join' // the one who just caught up
  | 'hit'
  | 'low' // down to the last heart
  | 'heal'
  | 'power'
  | 'break'
  | 'twist'
  | 'idle'
  | 'win'
  | 'page' // the new page's leader
  | 'done' // a dare was met
  | 'miss' // a dare ran out

/** what anyone might say */
const ANYONE: Record<TalkEvent, string[]> = {
  join: ['wait up!', 'made it! what did I miss?', 'room for one more?'],
  hit: ['ouch, you okay?', 'shake it off!', "that one came out of nowhere"],
  low: ['careful, careful…', 'one heart left, slow and steady!', "we're almost there, hang on!"],
  heal: ['phew, much better', 'good as new!'],
  power: ['ooh, nice grab!', 'lucky!'],
  break: ['water break!', 'okay… catching my breath…'],
  twist: ['whoa, what is happening?!', 'eyes on the road!', 'is it just me or is the road weird?'],
  idle: ['is the bell going to ring?', 'so who did the reading?', 'nice day for running late', 'left, right, hop, repeat'],
  win: ['we actually made it!', 'everyone together!'],
  page: ['my turn up front!', 'follow me, everyone!'],
  done: ['you did it!', 'no way, that was perfect!', "okay, I'm impressed"],
  miss: ['so close!', "next time for sure", "that's okay, keep going!"],
}

/** each character's own spin, mixed in with the lines above */
const OWN: Record<string, Partial<Record<TalkEvent, string[]>>> = {
  mitsumi: {
    join: ["I'll make it on time, I made a plan!"],
    hit: ["it's fine! it's part of the plan!", 'ow… note to self: look ahead'],
    low: ['I did not come all the way from the countryside to be late!'],
    idle: ['back home, the road had more frogs', 'step one: get to school. step two: everything else!'],
    done: ['just like I practised!'],
    page: ['valedictorian pace, everyone!'],
  },
  makoto: {
    join: ['s-sorry, I was finishing a chapter'],
    hit: ['oh no, are you hurt?!'],
    idle: ['this reminds me of a book… a very sweaty book', "I can't read and run at the same time. I've tried"],
    done: ['that was like the climax of a novel!'],
    twist: ['this is not how physics works'],
    page: ['um… right this way, I think!'],
  },
  mika: {
    join: ["i-it's not like I ran to catch up with you or anything"],
    hit: ['ugh, watch where you hop!'],
    idle: ['my hair is going to be a disaster', "I'm only running because the bus is slow"],
    done: ["hmph. fine. that was cool."],
    miss: ["I totally could've done that. probably."],
    page: ["okay, I'm in front, so everyone look normal"],
  },
  ujie: {
    join: ['arriving early is arriving on time'],
    hit: ['form, Iwakura. mind your form'],
    idle: ['at this pace we arrive four minutes early', "I've timed this route twice"],
    done: ['acceptable. no, better than acceptable'],
    miss: ['we review, we adjust, we try again'],
    page: ['single file, everyone. efficient spacing'],
  },
  shima: {
    join: ['hey, mind if I tag along?'],
    hit: ["you're fine, you're fine. that was almost graceful"],
    idle: ['honestly, this is the best part of the day', 'feels like a movie scene, right?'],
    done: ["see? I knew you'd pull that off"],
    twist: ['huh. this is new'],
    page: ['alright, follow me. no pressure'],
  },
  yuzuki: {
    join: ['you left without me? rude'],
    hit: ['okay, that looked painful'],
    idle: ["your shoelace is untied. kidding", 'next time we take the bus'],
    done: ["fine, I'll admit it. that was good"],
    miss: ['honestly? not bad for a first try'],
    page: ["I'm leading. try to keep up"],
  },
  yasaka: {
    join: ['no rush… oh wait, there is a rush'],
    hit: ['want a snack? snacks fix everything'],
    idle: ['anyone want to stop for melon bread?', "we'll get there when we get there"],
    done: ['nice! that earns a snack'],
    break: ['snack break!'],
    page: ['easy pace, everyone. easy pace'],
  },
  fumi: {
    join: ['surprise! I came all the way from back home to cheer you on'],
    hit: ['Mitsumi! you okay?'],
    idle: ['everything here is so busy compared to home', 'send me a photo of your school later!'],
    done: ["that's the Mitsumi I know!"],
    page: ["follow me, I know a shortcut. probably"],
  },
  nao: {
    join: ['you forgot your lunch, so I ran it over'],
    hit: ['careful! no scraped knees on my watch'],
    idle: ["I'll make something nice for dinner tonight", 'running in these shoes. the things I do for you'],
    done: ['look at you go!'],
    break: ['deep breaths. you’re doing great'],
    page: ['alright, I’m in charge now'],
  },
  yamada: {
    join: ['hey hey, wait for me!'],
    hit: ["haha, you good? that was a big one"],
    idle: ['race you to the gate!', 'I could do this all day'],
    done: ['whoa, that was awesome!'],
    power: ["let's gooo!"],
    page: ['full speed ahead!'],
  },
  mukai: {
    join: ['…morning'],
    hit: ['that looked like it hurt'],
    idle: ['I should have brought a book', 'the gate closes soon. just saying'],
    done: ['…nice'],
    twist: ['hm. interesting'],
    page: ['this way. no need to rush'],
  },
  takamine: {
    join: ['I had to run. I hate being late'],
    hit: ['watch your footing'],
    idle: ['let’s keep a steady pace', 'I went over today’s notes on the train'],
    done: ['well done. really'],
    miss: ['we’ll get it next time'],
    page: ['stay close, everyone'],
  },
  kanechika: {
    join: ['my, everyone’s in a hurry this morning'],
    hit: ['oh dear. are you alright?'],
    idle: ['no running in the halls, but out here is fine', 'ah, to be young and late again'],
    done: ['splendid! full marks'],
    break: ['a short rest never hurt anyone'],
    page: ['follow me, everyone. mind the traffic'],
  },
}

/** a line for this character and moment: their own lines win half the time */
export function lineFor(id: string, ev: TalkEvent) {
  const own = OWN[id]?.[ev] ?? []
  const pool = own.length && (Math.random() < 0.55 || !ANYONE[ev].length) ? own : ANYONE[ev]
  return pool[Math.floor(Math.random() * pool.length)]
}

/** seconds between chatter lines, unless something big just happened */
export const TALK_GAP = 4.5
/** seconds of quiet before someone fills the silence */
export const IDLE_TALK: [number, number] = [14, 24]
