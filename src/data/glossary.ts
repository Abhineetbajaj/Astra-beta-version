// Plain-English glossary for Vedic jargon shown throughout the app — planets, houses, signs,
// dignities, and dasha/transit concepts. Written with a bit of hook, not textbook tone: the goal
// is a reader with zero astrology background clicking a term and thinking "oh, that's actually
// interesting" rather than glazing over a dictionary definition. Looked up by `GlossaryTerm` and
// by `highlightGlossaryTerms` — keys are lowercase for case-insensitive matching.

export const GLOSSARY: Record<string, string> = {
  // Planets (grahas)
  sun: 'Your core identity and willpower — status, authority, and how visible you are willing to be.',
  moon: 'Your inner emotional weather — instinct, comfort, and what actually makes you feel okay.',
  mars: 'Drive, courage, and conflict — where you push, fight, or act before thinking it through.',
  mercury: 'Communication and quick thinking — how you talk, negotiate, and process information.',
  jupiter: 'Growth, luck, and meaning — expansion, wisdom, teachers, and where things tend to work out.',
  venus: 'Love, beauty, and pleasure — relationships, money you enjoy spending, and what you find attractive.',
  saturn: "Discipline and delay — the planet of hard lessons, patience, and things built to last.",
  rahu: 'An obsessive pull toward the new and unfamiliar — ambition, shortcuts, and hunger without an easy off-switch.',
  ketu: 'Detachment and letting go — old mastery you no longer need to prove, sometimes felt as disinterest.',

  // Rashis (signs)
  aries: 'The initiator — fast, direct, and first through the door, sometimes before thinking it through.',
  taurus: 'The builder — steady, sensual, and slow to move, but nearly impossible to knock off course once set.',
  gemini: 'The communicator — curious, quick, and happiest juggling several things (and conversations) at once.',
  cancer: 'The nurturer — protective and deeply feeling, with a strong pull toward home and emotional safety.',
  leo: 'The performer — warm, proud, and built to be seen; thrives on recognition and creative self-expression.',
  virgo: 'The perfectionist — analytical and detail-obsessed, happiest when something is genuinely useful and well-made.',
  libra: 'The diplomat — charming and fairness-driven, often more comfortable deciding *with* someone than alone.',
  scorpio: 'The transformer — intense and private, drawn to what\'s hidden, taboo, or emotionally all-in.',
  sagittarius: 'The explorer — optimistic and freedom-loving, allergic to anything that feels like a cage.',
  capricorn: 'The strategist — ambitious and disciplined, willing to trade short-term fun for long-term standing.',
  aquarius: 'The reformer — independent and idea-driven, more loyal to a principle than to the crowd.',
  pisces: 'The dreamer — intuitive and empathetic, with a foot in imagination as much as in reality.',

  // Houses (bhavas) — 1-indexed
  'house-1': 'Your ascendant — literally "who you are" when you walk into a room, before you say a word.',
  'house-2': 'Money, possessions, and your own voice — what you value enough to hold onto and speak up for.',
  'house-3': 'Effort, courage, and communication with siblings/peers — the house of "doing it yourself."',
  'house-4': 'Home, mother, and inner peace — your emotional foundation and how settled you actually feel.',
  'house-5': 'Romance, creativity, and children — self-expression and the things you make purely because you want to.',
  'house-6': 'Daily grind, health, and conflict — routines, rivals, debts, and the friction you have to push through.',
  'house-7': 'Partnerships — marriage and business alliances, and how you show up one-on-one with an equal.',
  'house-8': 'Sudden change, other people\'s money, and the hidden — transformation that arrives whether you\'re ready or not.',
  'house-9': 'Luck, philosophy, and long journeys — higher learning, belief systems, and where fortune tends to favor you.',
  'house-10': 'Career and public reputation — the "what do you do" house; ambition made visible to the world.',
  'house-11': 'Gains, networks, and big goals — friendships, income streams, and hopes actually coming through.',
  'house-12': 'Loss, rest, and the subconscious — endings, solitude, faraway places, and what happens behind closed doors.',

  // Dignity
  exalted: 'A planet operating at its personal best — this placement amplifies its strengths with unusual ease.',
  debilitated: "A planet working against its own grain here — its natural strengths take more effort to access, not that they're absent.",
  own: "A planet at home in its own sign — comfortable, consistent, and reliably itself, without needing to strain.",

  // Dasha / timing
  mahadasha: "Your current multi-year 'chapter,' ruled by one planet — the broad theme of this stretch of your life.",
  antardasha: "A shorter sub-chapter inside your current Mahadasha — the specific flavor of what's active right now.",
  retrograde: 'When a planet appears to move backward from Earth\'s view — classically read as a time to revisit or redo, not launch something new.',
  'sade sati': "Saturn's roughly 7.5-year transit through the signs around your natal Moon — a demanding but ultimately maturing period, not a curse.",
  'guru gochar': "Jupiter's current transit relative to your natal Moon — where growth and opportunity are most available to you right now.",
  ascendant: 'Your rising sign — the mask you wear and the lens the rest of your chart gets filtered through.',

  // Numerology
  'life path number': "Your core number, from your full birth date — the broad theme and lessons of this lifetime, numerology's answer to a Sun sign.",
  'expression number': 'Also called Destiny — every letter of your full birth name, reduced. What you\'re built to do and express in the world.',
  'soul urge number': "Also called Heart's Desire — the vowels in your name, reduced. What you actually want underneath the surface.",
  'personality number': 'The consonants in your name, reduced — the version of you a stranger meets before they know you well.',
  'birthday number': 'The day of the month you were born, reduced — a specific talent layered onto your Life Path.',
  'master number': 'Eleven, 22, or 33 — kept un-reduced because they carry an amplified version of 2, 4, or 6, with both more potential and more pressure.',
  'personal year': "Where you are in your own 1-9 cycle this calendar year — the broad theme for the months ahead, independent of your age.",
  'personal month': 'A finer-grained slice of your current Personal Year — this month\'s specific flavor of that broader theme.',
  'personal day': "Today's number in your personal cycle — the most granular, and the one that changes daily.",
}

export type GlossaryKey = keyof typeof GLOSSARY
