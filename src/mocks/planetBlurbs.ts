import type { PlanetId } from '@/astro-engine/types'

/** Short, planet-specific framing used by the chat mock when a question names a planet. */
export const PLANET_BLURB: Record<PlanetId, string> = {
  Sun: 'your sense of identity and where you want to be visible',
  Moon: 'your emotional baseline — what actually makes you feel steady',
  Mars: 'how you assert yourself and where your energy wants to go first',
  Mercury: 'how you think, decide, and communicate under pressure',
  Jupiter: 'where you naturally expand, and where you overextend',
  Venus: 'what you value, and how you show up in closeness',
  Saturn: 'where you are asked for patience, and where discipline actually pays off',
  Rahu: 'what you are reaching for that isn’t fully familiar yet',
  Ketu: 'what you are quietly done needing to prove',
}
