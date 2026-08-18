// Devotional text library for Spiritual Wellness's "Spirit" pillar. Same non-negotiable rule as
// _shared/data/grahaMantras.ts: this is fixed, verified text — NEVER Gemini-generated. Sacred
// syllables are exactly the kind of fact a model must never be left to guess or paraphrase.
//
// Text-only for v1 (no audio) — a deliberate decision, not a placeholder oversight: TTS cannot
// chant, and the real recordings that could are commercially copyrighted even though the
// underlying texts (Hanuman Chalisa, the classical stotras) are centuries-old and public domain.
//
// Honesty convention, matching this codebase's existing pattern (guna.ts's kuta scope,
// panchangEvents.ts's Navratri heuristic, etc.): `isComplete: false` entries are verified,
// accurate EXCERPTS (usually the opening and/or closing verses), not the full text — marked as
// such in the UI rather than silently presented as complete. Full versions are a v2 content pass,
// not an architecture change.

export type DevotionalOccasion = 'diwali' | 'navratri' | 'shivratri' | 'ganesh-chaturthi' | 'daily'

export interface DevotionalVerse {
  transliteration: string
  meaning: string
}

export interface DevotionalText {
  key: string
  title: string
  deity: string
  /** Whether every verse of the traditional text is present, or this is a verified excerpt. */
  isComplete: boolean
  verses: DevotionalVerse[]
  /** When this is traditionally recited/sung. */
  whenToUse: string
  occasions: DevotionalOccasion[]
  /** If this text is the traditional remedy for a graha, ties into the chart-prescribed picks. */
  planetContext?: string
}

export const DEVOTIONAL_TEXTS: DevotionalText[] = [
  {
    key: 'gayatri-mantra',
    title: 'Gayatri Mantra',
    deity: 'Savitr (the Sun as supreme consciousness)',
    isComplete: true,
    verses: [
      {
        transliteration: 'Om Bhur Bhuvah Swah, Tat Savitur Varenyam, Bhargo Devasya Dheemahi, Dhiyo Yo Nah Prachodayat',
        meaning:
          'Om, across the three realms of earth, atmosphere and heaven — we meditate on the glory of that radiant Sun-consciousness. May it illuminate our intellect.',
      },
    ],
    whenToUse: 'At sunrise, sunset, or whenever clarity of mind is needed. One of the oldest and most universally recited mantras.',
    occasions: ['daily'],
    planetContext: 'Sun',
  },
  {
    key: 'mahamrityunjaya-mantra',
    title: 'Mahamrityunjaya Mantra',
    deity: 'Shiva',
    isComplete: true,
    verses: [
      {
        transliteration:
          'Om Tryambakam Yajamahe, Sugandhim Pushti Vardhanam, Urvarukamiva Bandhanan, Mrityor Mukshiya Maamritat',
        meaning:
          'We worship the three-eyed one (Shiva), fragrant and nourishing. May he free us from the bonds of death, as a ripened fruit falls freely from its stem — not into death, but into immortality.',
      },
    ],
    whenToUse: 'During illness, fear, or difficult Saturn/8th-house periods — traditionally recited for protection and resilience.',
    occasions: ['shivratri', 'daily'],
    planetContext: 'Saturn',
  },
  {
    key: 'om-namah-shivaya',
    title: 'Panchakshari Mantra',
    deity: 'Shiva',
    isComplete: true,
    verses: [{ transliteration: 'Om Namah Shivaya', meaning: 'I bow to Shiva — the auspicious one, consciousness itself.' }],
    whenToUse: 'The simplest, most repeated Shiva mantra — for grounding, especially during Saturn or Ketu periods.',
    occasions: ['shivratri', 'daily'],
    planetContext: 'Saturn',
  },
  {
    key: 'om-gam-ganapataye',
    title: 'Ganesha Beej Mantra',
    deity: 'Ganesha',
    isComplete: true,
    verses: [
      { transliteration: 'Om Gam Ganapataye Namaha', meaning: 'I bow to Ganapati (Ganesha), remover of obstacles.' },
    ],
    whenToUse: 'Before starting anything new — a project, a journey, a difficult conversation.',
    occasions: ['ganesh-chaturthi', 'diwali', 'daily'],
    planetContext: 'Jupiter',
  },
  {
    key: 'om-dum-durgayei',
    title: 'Durga Beej Mantra',
    deity: 'Durga',
    isComplete: true,
    verses: [{ transliteration: 'Om Dum Durgayei Namaha', meaning: 'I bow to Durga — the goddess who protects and empowers.' }],
    whenToUse: 'During Navratri, or whenever courage and inner strength are needed.',
    occasions: ['navratri'],
    planetContext: 'Mars',
  },
  {
    key: 'hanuman-chalisa',
    title: 'Hanuman Chalisa',
    deity: 'Hanuman',
    isComplete: false,
    verses: [
      {
        transliteration: 'Shri Guru Charan Saroj Raj, Nij Man Mukur Sudhari, Barnau Raghuvar Bimal Jasu, Jo Dayaku Phal Chari',
        meaning:
          "Cleansing the mirror of my mind with the dust of my Guru's lotus feet, I describe the pure glory of Raghuvar (Rama), which grants the four fruits of life.",
      },
      {
        transliteration: 'Buddhiheen Tanu Janike, Sumirow Pavan Kumar, Bal Buddhi Vidya Dehu Mohi, Harahu Kalesh Bikar',
        meaning:
          'Knowing my body to be without wisdom, I remember you, Son of the Wind. Grant me strength, intellect and knowledge, and remove my troubles and flaws.',
      },
      {
        transliteration: 'Jai Hanuman Gyan Gun Sagar, Jai Kapis Tihu Lok Ujagar',
        meaning: 'Victory to Hanuman, ocean of wisdom and virtue. Victory to the lord of monkeys, radiant across all three worlds.',
      },
      {
        transliteration: 'Pavantanay Sankat Haran, Mangal Murati Roop, Ram Lakhan Sita Sahit, Hriday Basahu Sur Bhoop',
        meaning:
          'O Son of the Wind, remover of troubles, embodiment of auspiciousness — dwell in my heart, along with Rama, Lakshman and Sita, O king among gods.',
      },
    ],
    whenToUse:
      'Daily, or whenever courage, protection, or steadiness is needed — one of the most widely recited texts in devotional practice. This is the opening and closing doha; the 40 chaupais in between are a planned content addition.',
    occasions: ['daily'],
    planetContext: 'Mars',
  },
  {
    key: 'om-jai-lakshmi-mata',
    title: 'Lakshmi Aarti (opening)',
    deity: 'Lakshmi',
    isComplete: false,
    verses: [
      {
        transliteration: 'Om Jai Lakshmi Mata, Maiya Jai Lakshmi Mata, Tumko Nishidin Sevat, Hari Vishnu Vidhata',
        meaning: 'Victory to Mother Lakshmi — Lord Vishnu himself serves and worships you, day and night.',
      },
    ],
    whenToUse: 'Diwali and Lakshmi Puja, or any Friday — sung for prosperity and abundance. This is the opening verse; the full aarti is a planned content addition.',
    occasions: ['diwali'],
    planetContext: 'Venus',
  },
  {
    key: 'jai-ganesh-deva',
    title: 'Ganesh Aarti (opening)',
    deity: 'Ganesha',
    isComplete: false,
    verses: [
      {
        transliteration: 'Jai Ganesh, Jai Ganesh, Jai Ganesh Deva, Mata Jaki Parvati, Pita Mahadeva',
        meaning: 'Victory to Lord Ganesha — whose mother is Parvati and father is Mahadeva (Shiva).',
      },
    ],
    whenToUse: 'Ganesh Chaturthi, Diwali, or before any new beginning. This is the opening verse; the full aarti is a planned content addition.',
    occasions: ['ganesh-chaturthi', 'diwali'],
    planetContext: 'Jupiter',
  },
]

export function devotionalTextsForOccasion(occasion: DevotionalOccasion): DevotionalText[] {
  return DEVOTIONAL_TEXTS.filter((t) => t.occasions.includes(occasion))
}

export function devotionalTextForPlanet(planet: string): DevotionalText | null {
  return DEVOTIONAL_TEXTS.find((t) => t.planetContext === planet) ?? null
}
