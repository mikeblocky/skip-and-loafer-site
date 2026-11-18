export interface Cue {
  /** seconds */
  start: number
  end: number
  jp: string
  en: string
  /**
   * Karaoke steps: at time t (seconds), the first n characters of `jp` have been sung.
   * Without it the highlight is spread evenly across the line.
   */
  k?: [t: number, n: number][]
  /** furigana: characters [at, at + len) of `jp` are read as `reading` */
  ruby?: [at: number, len: number, reading: string][]
}

/**
 * Lines are written with furigana inline, `{漢字|かんじ}`, over kanji only. This strips them
 * back to the plain line (so `k` still counts the characters you see) and keeps the readings
 * by character position.
 */
const furigana = (cues: Cue[]): Cue[] =>
  cues.map((c) => {
    const ruby: NonNullable<Cue['ruby']> = []
    let at = 0
    const jp = c.jp.replace(/\{([^|}]+)\|([^}]+)\}|[^{]/gu, (m, base?: string, reading?: string) => {
      if (base && reading) {
        const len = Array.from(base).length
        ruby.push([at, len, reading])
        at += len
        return base
      }
      at += 1
      return m
    })
    return ruby.length ? { ...c, jp, ruby } : c
  })

/**
 * Season 1 opening, メロウ (Mellow) by 須田景凪, timed per syllable to the TV-size cut in
 * public/anime/s1/op.mp4. The instrumental break (13.4–28s) has no line on purpose.
 */
export const OP_S1: Cue[] = furigana([
  {
    start: 0.75,
    end: 3.70,
    jp: "{眩|まぶ}しくて {眩|まぶ}しくて",
    en: "So bright, so dazzling,",
    k: [[0.75, 1], [1.15, 2], [1.35, 3], [1.55, 4], [2.10, 6], [2.50, 7], [2.70, 8], [2.90, 9]],
  },
  {
    start: 3.70,
    end: 6.90,
    jp: "{僕|ぼく}は{目|め}を{逸|そ}らしてしまう",
    en: "I can't help but look away.",
    k: [[3.70, 1], [4.20, 2], [4.45, 3], [4.70, 4], [5.00, 5], [5.25, 6], [5.45, 7], [5.65, 8], [5.85, 9], [6.10, 10], [6.35, 11]],
  },
  {
    start: 7.55,
    end: 10.40,
    jp: "{似|に}{合|あ}う{言葉|ことば}ひとつだって",
    en: "I can't even find the right words,",
    k: [[7.55, 1], [7.80, 2], [8.05, 3], [8.30, 4], [8.75, 5], [9.00, 6], [9.25, 7], [9.50, 8], [9.75, 9], [9.95, 10], [10.10, 11]],
  },
  {
    start: 10.40,
    end: 13.40,
    jp: "{何|なに}も{言|い}えない{僕|ぼく}だ",
    en: "so I end up saying nothing at all.",
    k: [[10.40, 1], [10.95, 2], [11.20, 3], [11.45, 4], [11.70, 5], [12.00, 6], [12.30, 7], [12.85, 8]],
  },
  {
    start: 28.00,
    end: 31.25,
    jp: "こんなに{狭|せま}い{世|せ}{界|かい}で",
    en: "In this little world of ours,",
    k: [[28.00, 1], [28.20, 2], [28.40, 3], [28.60, 4], [28.85, 5], [29.40, 6], [29.75, 7], [30.05, 8], [30.55, 9]],
  },
  {
    start: 31.35,
    end: 33.90,
    jp: "{跳|は}ねる{笑|わら}い{声|ごえ}が",
    en: "the sound of your carefree laughter",
    k: [[31.35, 1], [31.60, 2], [31.85, 3], [32.10, 4], [32.60, 5], [32.85, 6], [33.35, 7]],
  },
  {
    start: 34.20,
    end: 37.50,
    jp: "とても{綺|き}{麗|れい}に{響|ひび}くから",
    en: "echoes so beautifully",
    k: [[34.20, 1], [34.40, 2], [34.60, 3], [34.85, 4], [35.10, 5], [35.60, 6], [35.90, 7], [36.45, 8], [36.75, 9], [37.00, 10]],
  },
  {
    start: 37.70,
    end: 40.20,
    jp: "{救|すく}われたんだ",
    en: "that it somehow makes everything feel a little easier.",
    k: [[37.70, 1], [38.20, 2], [38.50, 3], [38.80, 4], [39.10, 5], [39.40, 6]],
  },
  {
    start: 40.80,
    end: 43.90,
    jp: "{刹|せつ}{那|な}を{繰|く}り{返|かえ}す",
    en: "If our days are made of fleeting moments,",
    k: [[40.80, 1], [41.35, 2], [41.70, 3], [42.05, 4], [42.35, 5], [42.60, 6], [43.25, 7]],
  },
  {
    start: 44.00,
    end: 47.25,
    jp: "{途|と}{方|ほう}もない{未|み}{来|らい}なら",
    en: "stretching into a future we can barely imagine,",
    k: [[44.00, 1], [44.25, 2], [44.85, 3], [45.10, 4], [45.35, 5], [45.65, 6], [45.95, 7], [46.50, 8], [46.75, 9]],
  },
  {
    start: 47.40,
    end: 50.60,
    jp: "{迷|まよ}いながらでもいいさ",
    en: "it's okay if we lose our way sometimes.",
    k: [[47.40, 1], [47.95, 2], [48.20, 3], [48.45, 4], [48.70, 5], [48.95, 6], [49.25, 7], [49.55, 8], [49.85, 9], [50.15, 10]],
  },
  {
    start: 50.70,
    end: 54.30,
    jp: "{全|すべ}て{分|わ}け{合|あ}っていこう",
    en: "We can go through it all together.",
    k: [[50.70, 1], [51.20, 2], [51.45, 3], [51.70, 4], [51.95, 5], [52.20, 6], [52.40, 7], [52.65, 8], [52.95, 9], [53.35, 10]],
  },
  {
    start: 55.00,
    end: 58.10,
    jp: "{眩|まぶ}しくて {眩|まぶ}しくて",
    en: "So bright, so dazzling,",
    k: [[55.00, 1], [55.40, 2], [55.60, 3], [55.80, 4], [56.50, 6], [56.90, 7], [57.10, 8], [57.30, 9]],
  },
  {
    start: 58.10,
    end: 61.50,
    jp: "{僕|ぼく}は{目|め}を{逸|そ}らしてしまう",
    en: "I can't help but look away.",
    k: [[58.10, 1], [58.60, 2], [58.85, 3], [59.10, 4], [59.40, 5], [59.65, 6], [59.85, 7], [60.05, 8], [60.25, 9], [60.50, 10], [60.80, 11]],
  },
  {
    start: 62.00,
    end: 64.95,
    jp: "{似|に}{合|あ}う{言葉|ことば}ひとつだって",
    en: "I can't even find the right words,",
    k: [[62.00, 1], [62.25, 2], [62.50, 3], [62.75, 4], [63.20, 5], [63.45, 6], [63.70, 7], [63.95, 8], [64.20, 9], [64.45, 10], [64.65, 11]],
  },
  {
    start: 64.95,
    end: 68.10,
    jp: "{何|なに}も{言|い}えない{僕|ぼく}だ",
    en: "so I end up saying nothing at all.",
    k: [[64.95, 1], [65.45, 2], [65.70, 3], [65.95, 4], [66.20, 5], [66.50, 6], [66.80, 7], [67.35, 8]],
  },
  {
    start: 68.30,
    end: 71.50,
    jp: "{軽|かろ}やかに {軽|かろ}やかに",
    en: "So light, so carefree,",
    k: [[68.30, 1], [68.75, 2], [68.95, 3], [69.15, 4], [69.85, 6], [70.30, 7], [70.50, 8], [70.70, 9]],
  },
  {
    start: 71.50,
    end: 74.90,
    jp: "{跳|は}ねる{背|せ}に{見|み}{惚|と}れていた",
    en: "I couldn't take my eyes off you as you skipped along.",
    k: [[71.50, 1], [71.75, 2], [72.00, 3], [72.25, 4], [72.55, 5], [72.85, 6], [73.15, 7], [73.40, 8], [73.65, 9], [73.90, 10], [74.20, 11]],
  },
  {
    start: 75.50,
    end: 78.55,
    jp: "{青|あお}い{温|おん}{度|ど}の{正|しょう}{体|たい}が",
    en: "And if this strange, youthful warmth I've been feeling",
    k: [[75.50, 1], [76.00, 2], [76.25, 3], [76.75, 4], [77.00, 5], [77.25, 6], [77.75, 7], [78.20, 8]],
  },
  {
    start: 78.55,
    end: 82.10,
    jp: "{恋|こい}だとしたら",
    en: "is what they call love...",
    k: [[78.55, 1], [79.20, 2], [79.55, 3], [79.90, 4], [80.25, 5], [80.70, 6]],
  },
  {
    start: 82.40,
    end: 85.45,
    jp: "{青|あお}い{温|おん}{度|ど}の{正|しょう}{体|たい}が",
    en: "If this strange, youthful warmth I've been feeling",
    k: [[82.40, 1], [82.90, 2], [83.15, 3], [83.65, 4], [83.90, 5], [84.15, 6], [84.65, 7], [85.10, 8]],
  },
  {
    start: 85.45,
    end: 89.50,
    jp: "{恋|こい}だとしたら",
    en: "really is love...",
    k: [[85.45, 1], [86.10, 2], [86.45, 3], [86.80, 4], [87.15, 5], [87.65, 6]],
  },
])

/**
 * Season 1 ending, ハナウタとまわり道 (Hanauta to Mawarimichi) by 逢田梨香子, timed per syllable
 * to public/anime/s1/ed.mp4. The intro (0–17.4s) is instrumental.
 */
export const ED_S1: Cue[] = furigana([
  {
    start: 17.40,
    end: 22.15,
    jp: "やさしい{風|かぜ}と{夕|ゆう}{焼|や}け ({夕|ゆう}{焼|や}け)",
    en: "A gentle breeze and the evening sky, glowing orange.",
    k: [[17.40, 1], [17.65, 2], [17.90, 3], [18.15, 4], [18.50, 5], [19.15, 6], [19.55, 7], [20.10, 8], [20.40, 9], [20.90, 12], [21.45, 13], [21.75, 15]],
  },
  {
    start: 22.20,
    end: 26.10,
    jp: "{今日|きょう}も{何|なに}{気|げ}にいい{日|ひ}だった",
    en: "Come to think of it, today was a pretty good day.",
    k: [[22.20, 1], [22.45, 2], [22.70, 3], [23.05, 4], [23.60, 5], [23.90, 6], [24.20, 7], [24.45, 8], [24.75, 9], [25.05, 10], [25.30, 11], [25.50, 12]],
  },
  {
    start: 26.20,
    end: 30.00,
    jp: "つめ{込|こ}んだ {予|よ}{定|てい}{変|か}えて",
    en: "Maybe I'll put aside my busy plans",
    k: [[26.20, 1], [26.45, 2], [26.70, 3], [27.00, 4], [27.30, 5], [28.00, 7], [28.30, 8], [28.90, 9], [29.25, 10], [29.55, 11]],
  },
  {
    start: 30.20,
    end: 34.20,
    jp: "ひと{駅|えき}{歩|ある}こう",
    en: "and walk an extra stop instead.",
    k: [[30.20, 1], [30.50, 2], [30.80, 3], [31.55, 4], [32.20, 5], [32.60, 6]],
  },
  {
    start: 34.90,
    end: 38.60,
    jp: "{躓|つまず}くその{分|ぶん}だけ",
    en: "With every little stumble along the way,",
    k: [[34.90, 1], [35.45, 2], [35.90, 3], [36.30, 4], [36.65, 5], [37.30, 6], [37.70, 7]],
  },
  {
    start: 38.80,
    end: 43.10,
    jp: "{起|お}きるの{上|じょう}{手|ず}になった",
    en: "I've gotten a little better at picking myself back up.",
    k: [[38.80, 1], [39.10, 2], [39.40, 3], [39.70, 4], [40.10, 5], [40.70, 6], [41.05, 7], [41.50, 8], [41.85, 9], [42.10, 10]],
  },
  {
    start: 43.20,
    end: 48.70,
    jp: "{本|ほん}{音|ね}{交|か}わしたダイアローグ (ダイアローグ)",
    en: "Those conversations where we could truly be ourselves,",
    k: [[43.20, 1], [43.75, 2], [44.10, 3], [44.40, 4], [44.70, 5], [45.00, 6], [45.35, 7], [45.65, 8], [45.95, 9], [46.25, 10], [46.55, 11], [46.85, 12], [47.20, 15], [47.45, 16], [47.70, 17], [47.95, 18], [48.20, 19], [48.40, 21]],
  },
  {
    start: 48.70,
    end: 52.30,
    jp: "ぬくもりが{胸|むね}に{沁|し}みてく",
    en: "their warmth still lingers deep in my heart.",
    k: [[48.70, 1], [48.95, 2], [49.20, 3], [49.45, 4], [49.75, 5], [50.05, 6], [50.55, 7], [50.85, 8], [51.15, 9], [51.45, 10], [51.75, 11]],
  },
  {
    start: 52.30,
    end: 56.20,
    jp: "ハナウタとまわり{道|みち}",
    en: "Humming a little tune as I take the long way home.",
    k: [[52.30, 1], [52.65, 2], [53.00, 3], [53.35, 4], [53.70, 5], [54.10, 6], [54.45, 7], [54.80, 8], [55.15, 9]],
  },
  {
    start: 56.20,
    end: 60.45,
    jp: "この{世|せ}{界|かい}はまだ{未|み}{知|ち}",
    en: "There's still so much of this world I haven't seen.",
    k: [[56.20, 1], [56.55, 2], [56.90, 3], [57.25, 4], [57.95, 5], [58.40, 6], [58.80, 7], [59.20, 8], [59.60, 9]],
  },
  {
    start: 60.60,
    end: 64.50,
    jp: "ひたむき つま{先|さき}",
    en: "One earnest little step at a time,",
    k: [[60.60, 1], [61.00, 2], [61.40, 3], [61.85, 4], [62.40, 6], [62.80, 7], [63.20, 8]],
  },
  {
    start: 64.60,
    end: 69.20,
    jp: "{歩|ほ}{幅|はば}みんな{違|ちが}うけど",
    en: "even if we all move at our own pace.",
    k: [[64.60, 1], [64.95, 2], [65.70, 3], [66.05, 4], [66.40, 5], [66.80, 6], [67.50, 7], [67.90, 8], [68.30, 9]],
  },
  {
    start: 69.30,
    end: 73.25,
    jp: "{夕|ゆう}{暮|ぐ}れに{手|て}を{振|ふ}って",
    en: "I wave goodbye to the setting sun,",
    k: [[69.30, 1], [70.00, 2], [70.35, 3], [70.70, 4], [71.10, 5], [71.50, 6], [71.85, 7], [72.25, 8], [72.55, 9]],
  },
  {
    start: 73.30,
    end: 77.45,
    jp: "{新|あたら}しい{朝|あさ}になる",
    en: "knowing another morning will come.",
    k: [[73.30, 1], [74.35, 2], [74.75, 3], [75.15, 4], [75.90, 5], [76.30, 6], [76.70, 7]],
  },
  {
    start: 77.70,
    end: 81.90,
    jp: "{守|まも}りたい{毎|まい}{日|にち}",
    en: "These ordinary days are the ones I want to hold on to.",
    k: [[77.70, 1], [78.45, 2], [78.85, 3], [79.25, 4], [79.70, 5], [80.45, 6]],
  },
  {
    start: 82.10,
    end: 88.30,
    jp: "スキップで{越|こ}えて また{明日|あした}",
    en: "So I'll skip my way through whatever comes, and see you tomorrow.",
    k: [[82.10, 1], [82.40, 2], [82.70, 3], [82.95, 4], [83.25, 5], [83.60, 6], [84.00, 7], [84.40, 8], [84.95, 10], [85.35, 11], [85.75, 12], [86.15, 13]],
  },
])
