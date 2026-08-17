// Deno copy of src/data/numerologyPlanets.ts — keep in sync; do not diverge silently.

export interface NumerologyPlanet {
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  planet: string
  blurb: string
}

export const NUMEROLOGY_PLANETS: NumerologyPlanet[] = [
  { number: 1, planet: 'Sun', blurb: 'Identity, authority, and how visible you\'re willing to be.' },
  { number: 2, planet: 'Moon', blurb: 'Emotional instinct and what actually makes you feel okay.' },
  { number: 3, planet: 'Jupiter', blurb: 'Growth, wisdom, and where things tend to expand.' },
  { number: 4, planet: 'Rahu', blurb: 'An obsessive pull toward the new — ambition without an easy off-switch.' },
  { number: 5, planet: 'Mercury', blurb: 'Communication, quick thinking, and adaptability.' },
  { number: 6, planet: 'Venus', blurb: 'Love, beauty, and what you find worth pursuing.' },
  { number: 7, planet: 'Ketu', blurb: 'Detachment and inward focus — mastery you no longer need to prove.' },
  { number: 8, planet: 'Saturn', blurb: 'Discipline, delay, and things built to actually last.' },
  { number: 9, planet: 'Mars', blurb: 'Drive and courage — where you act before you think it through.' },
]

export function planetForNumber(n: number): NumerologyPlanet | null {
  return NUMEROLOGY_PLANETS.find((p) => p.number === n) ?? null
}
