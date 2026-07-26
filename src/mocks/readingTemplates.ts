import type { PlanetId } from '@/astro-engine/types'
import type { Rashi } from '@/data/rashis'

/**
 * Deterministic, templated "reading" prose — NOT a live LLM call. Every fragment is
 * selected from these pools using a seeded hash of real chart facts (dasha lord, moon
 * sign element, date), so the same chart + date always produces the same reading, and
 * different charts/days produce different combinations. See mocks/contentGenerator.ts.
 */

export const DASHA_LORD_THEME: Record<PlanetId, string[]> = {
  Sun: [
    'a Sun period — visibility, recognition, and the pull to lead rather than wait',
    'solar energy — clarity about what you actually want to be known for',
  ],
  Moon: [
    'a Moon period — emotional tides run close to the surface, and instinct is unusually reliable',
    'lunar energy — home, comfort, and the people you don’t perform for take priority',
  ],
  Mars: [
    'a Mars period — momentum, directness, and low patience for stalling',
    'martial energy — the itch to act before you’ve fully thought it through',
  ],
  Mercury: [
    'a Mercury period — conversations, small decisions, and paperwork all move faster',
    'mercurial energy — your mind wants to compare notes before committing',
  ],
  Jupiter: [
    'a Jupiter period — expansion, generosity, and a wider view than usual',
    'Jupiter’s influence — growth that looks like more responsibility before it looks like more reward',
  ],
  Venus: [
    'a Venus period — relationships, aesthetics, and what actually feels good take the wheel',
    'Venusian energy — a pull toward ease, beauty, and closeness',
  ],
  Saturn: [
    'a Saturn period — structure, patience, and the slow kind of progress that compounds',
    'Saturn’s discipline — less noise, more repetition, results that arrive later than you’d like',
  ],
  Rahu: [
    'a Rahu period — appetite outpaces comfort, and the unfamiliar looks more interesting than it should',
    'Rahu’s pull — ambition without a fully drawn map yet',
  ],
  Ketu: [
    'a Ketu period — detachment from things you thought mattered, and unexpected clarity because of it',
    'Ketu’s quiet — less interest in performing, more interest in what’s actually true',
  ],
}

export const ELEMENT_MOOD: Record<Rashi['element'], string[]> = {
  Fire: ['restless in a productive way', 'quick to decide, slower to sit still'],
  Earth: ['grounded but a little stubborn', 'more interested in the practical than the theoretical'],
  Air: ['talkative and a bit scattered', 'drawn to ideas more than to finishing them'],
  Water: ['reading the room before saying anything', 'more sensitive to tone than to content today'],
}

export const FOCUS_LINES = [
  'Notice which conversations feel like alignment and which feel like effort.',
  'Momentum favors quiet, deliberate steps — skip the grand gesture, the small one lands harder.',
  'A slow-burn day for clarity. Don’t force a decision that isn’t ready yet.',
  'The obvious move probably is the right one — resist overthinking it.',
  'Something you’ve been avoiding is smaller than it looks from here.',
  'Good day to finish, not start. Close a loop you’ve been carrying.',
] as const

export const LOVE_LINES = [
  'Say the direct thing instead of the polite version of it.',
  'Closeness today comes from doing something ordinary together, not from a big conversation.',
  'If something’s been unspoken, this is a reasonable day to name it.',
  'Give someone the benefit of the doubt you’d want extended to you.',
] as const

export const CAREER_LINES = [
  'Progress is more visible in retrospect than it feels right now — keep going.',
  'A short, direct message will do more than a long, careful one.',
  'Say no to the thing that isn’t actually a priority, even politely.',
  'Someone is more receptive to your idea than you expect — ask.',
] as const

export const WATCH_LINES = [
  'a tendency to over-explain something that didn’t need it',
  'the urge to commit to something before you’ve actually decided',
  'taking a neutral comment more personally than it was meant',
  'spending energy on a problem that will resolve itself by next week',
] as const
