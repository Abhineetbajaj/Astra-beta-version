// Deno copy of src/data/numerologyMeanings.ts — keep in sync; do not diverge silently.

export interface NumerologyMeaning {
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 22 | 33
  isMaster: boolean
  title: string
  positiveTraits: string[]
  shadowTraits: string[]
  careers: string[]
  compatibility: { mostHarmonious: number[]; mostChallenging: number[]; note: string }
  lifeLesson: string
}

export const NUMEROLOGY_MEANINGS: Record<number, NumerologyMeaning> = {
  1: {
    number: 1,
    isMaster: false,
    title: 'The Leader',
    positiveTraits: ['Independent', 'Pioneering', 'Courageous', 'Determined', 'Innovative', 'Confident'],
    shadowTraits: ['Can lean egotistical under pressure', 'Impatient with slower pace', 'Stubborn once decided', 'Prone to isolating when leading alone'],
    careers: ['Entrepreneur', 'CEO', 'Inventor', 'Director', 'Individual-sport athlete'],
    compatibility: { mostHarmonious: [3, 5, 6], mostChallenging: [1, 8], note: 'Best with 3, 5, or 6; can clash with other 1s and 8s over who leads.' },
    lifeLesson: 'Balance independence with collaboration — lead by inspiring, not demanding.',
  },
  2: {
    number: 2,
    isMaster: false,
    title: 'The Diplomat',
    positiveTraits: ['Empathetic', 'Intuitive', 'Cooperative', 'Patient', 'Detail-attentive', 'Peacemaking'],
    shadowTraits: ['Can slip into indecision', 'Hypersensitive to conflict', 'Risks self-neglect while accommodating others', 'Avoids necessary confrontation'],
    careers: ['Counselor', 'Mediator', 'Diplomat', 'HR', 'Nurse', 'Teacher'],
    compatibility: { mostHarmonious: [1, 6, 8], mostChallenging: [5, 7], note: 'Best with 1, 6, or 8; can feel strained by 5 or 7.' },
    lifeLesson: 'Set boundaries, value your own needs, and decide with confidence.',
  },
  3: {
    number: 3,
    isMaster: false,
    title: 'The Creative Communicator',
    positiveTraits: ['Creative', 'Expressive', 'Optimistic', 'Charismatic', 'Sociable', 'Resilient'],
    shadowTraits: ['Can scatter energy across too much at once', 'Risks surface-level follow-through', 'Seeks external validation', 'Prone to exaggeration under stress'],
    careers: ['Writer', 'Actor', 'Musician', 'Designer', 'Marketer', 'Speaker'],
    compatibility: { mostHarmonious: [1, 5, 6], mostChallenging: [4, 7], note: 'Best with 1, 5, or 6; can feel strained by 4 or 7.' },
    lifeLesson: 'Finish what you start, and add emotional depth beneath the charm.',
  },
  4: {
    number: 4,
    isMaster: false,
    title: 'The Builder',
    positiveTraits: ['Disciplined', 'Reliable', 'Organized', 'Practical', 'Loyal', 'Thorough'],
    shadowTraits: ['Can become rigid about process', 'Prone to overworking', 'Risks pessimism when plans slip', 'Controlling under stress'],
    careers: ['Engineer', 'Accountant', 'Architect', 'Project/operations manager'],
    compatibility: { mostHarmonious: [2, 7, 8], mostChallenging: [3, 5], note: 'Best with 2, 7, or 8; can feel strained by 3 or 5.' },
    lifeLesson: 'Embrace flexibility and play — excellence over perfection.',
  },
  5: {
    number: 5,
    isMaster: false,
    title: 'The Freedom Seeker',
    positiveTraits: ['Adaptable', 'Curious', 'Adventurous', 'Versatile', 'Charismatic', 'Courageous'],
    shadowTraits: ['Restless when routine sets in', 'Prone to impulsive decisions', 'Risks inconsistency in commitments', 'Can lean on escapism under pressure'],
    careers: ['Sales', 'Travel/journalism', 'Entrepreneurship', 'PR', 'Anything mobile or varied'],
    compatibility: { mostHarmonious: [1, 3, 7], mostChallenging: [2, 4], note: 'Best with 1, 3, or 7; can feel boxed in by 2 or 4.' },
    lifeLesson: 'Freedom requires responsibility — commit fully in at least one area.',
  },
  6: {
    number: 6,
    isMaster: false,
    title: 'The Nurturer',
    positiveTraits: ['Caring', 'Responsible', 'Loving', 'Harmonious', 'Artistic', 'Protective'],
    shadowTraits: ['Prone to over-giving until depleted', 'Can slide into meddling with good intentions', 'Worries more than necessary', 'Perfectionist about the people they love'],
    careers: ['Teacher', 'Nurse', 'Counselor', 'Therapist', 'Interior designer', 'Chef'],
    compatibility: { mostHarmonious: [1, 2, 9], mostChallenging: [5, 7], note: 'Best with 1, 2, or 9; can feel strained by 5 or 7.' },
    lifeLesson: 'Serve from overflow, not depletion — set boundaries before resentment builds.',
  },
  7: {
    number: 7,
    isMaster: false,
    title: 'The Seeker',
    positiveTraits: ['Analytical', 'Intuitive', 'Spiritual', 'Introspective', 'Wise', 'Independent-minded'],
    shadowTraits: ['Can come across as aloof', 'Prone to secrecy', 'Skeptical to a fault', 'Risks isolating through overthinking'],
    careers: ['Researcher', 'Analyst', 'Scientist', 'Philosopher', 'Writer', 'Spiritual teacher', 'Counselor'],
    compatibility: { mostHarmonious: [3, 5], mostChallenging: [2, 6, 8], note: 'Best with 3 or 5; can feel overwhelmed by the emotional/material focus of 2, 6, or 8.' },
    lifeLesson: 'Balance solitude with connection — trust others enough to share what you know.',
  },
  8: {
    number: 8,
    isMaster: false,
    title: 'The Powerhouse',
    positiveTraits: ['Ambitious', 'Authoritative', 'Strategic', 'Resilient', 'Results-driven', 'Financially capable'],
    shadowTraits: ['Risks workaholic patterns', 'Can become controlling under pressure', 'Prone to over-valuing material success', 'Guarded about vulnerability'],
    careers: ['Finance', 'Corporate leadership', 'Law', 'Real estate', 'Business ownership'],
    compatibility: { mostHarmonious: [2, 4], mostChallenging: [1, 8], note: 'Best with 2 or 4; guards independence closely, wary of other 8s and 1s.' },
    lifeLesson: 'Balance material ambition with relationships and inner life — power tests character.',
  },
  9: {
    number: 9,
    isMaster: false,
    title: 'The Humanitarian',
    positiveTraits: ['Compassionate', 'Idealistic', 'Wise', 'Generous', 'Creative', 'Globally minded'],
    shadowTraits: ['Prone to self-sacrifice past the point of depletion', 'Risks poor boundaries', 'Can be emotionally overwhelmed by others’ pain', 'Over-generous financially'],
    careers: ['Humanitarian work', 'Medicine', 'Teaching', 'Arts/film', 'Social entrepreneurship', 'Healing professions'],
    compatibility: { mostHarmonious: [6], mostChallenging: [], note: 'Expansive and idealistic; pairs especially well with 6.' },
    lifeLesson: 'Set boundaries and receive as well as give — you cannot pour from an empty cup.',
  },
  11: {
    number: 11,
    isMaster: true,
    title: 'The Visionary',
    positiveTraits: ['Highly intuitive', 'Inspired', 'Sensitive', 'Charismatic', 'Spiritually attuned'],
    shadowTraits: ['Prone to anxiety and nervous tension', 'Self-doubt despite real insight', 'Oversensitive to criticism', 'Can struggle to ground big visions practically'],
    careers: ['Same fields as its root, 2, but with more public/visionary reach — teaching, counseling, the arts, spiritual leadership'],
    compatibility: { mostHarmonious: [2, 6, 9], mostChallenging: [], note: 'An amplified 2 — shares 2’s harmonies, with more intensity on both sides.' },
    lifeLesson: 'Channel visionary intuition into service without burning out.',
  },
  22: {
    number: 22,
    isMaster: true,
    title: 'The Master Builder',
    positiveTraits: ['Combines big-picture vision with practical execution', 'Capable of large-scale, tangible results', 'Disciplined', 'Purposeful'],
    shadowTraits: ['Can feel crushing self-pressure', 'Prone to overwhelm at the scale of their own ambitions', 'Risks wasted potential without self-belief'],
    careers: ['Same fields as its root, 4, but at a larger scale — large-scale architecture/engineering, institution-building, civic leadership'],
    compatibility: { mostHarmonious: [4, 8], mostChallenging: [], note: 'An amplified 4 — shares 4’s harmonies, with far greater capacity to build.' },
    lifeLesson: 'Trust your ability to turn dreams into reality without self-sabotage.',
  },
  33: {
    number: 33,
    isMaster: true,
    title: 'The Master Teacher',
    positiveTraits: ['Deep compassion', 'Healing presence', 'Selfless service', 'Creative nurturing at scale'],
    shadowTraits: ['Prone to martyrdom', 'Risks absorbing too much of the world’s pain', 'Can neglect self while healing others'],
    careers: ['Same fields as its root, 6, but at a collective/teaching scale — master teacher, healer, humanitarian leader'],
    compatibility: { mostHarmonious: [6, 9], mostChallenging: [], note: 'An amplified 6 — the rarest master number; only counts when it appears as a final core-number result.' },
    lifeLesson: 'Teach and heal from wholeness, not depletion.',
  },
}

export function meaningForNumber(n: number): NumerologyMeaning {
  const meaning = NUMEROLOGY_MEANINGS[n]
  if (!meaning) throw new Error(`No numerology meaning defined for number ${n}`)
  return meaning
}
