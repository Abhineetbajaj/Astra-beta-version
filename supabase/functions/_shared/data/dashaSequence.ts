// Deno copy of src/data/dashaSequence.ts — keep in sync; do not diverge silently.

import type { PlanetId } from '../astro-engine/types.ts'
import { VIMSHOTTARI_LORD_CYCLE } from './nakshatras.ts'

export interface DashaLordYears {
  lord: PlanetId
  years: number
}

export const DASHA_SEQUENCE: DashaLordYears[] = [
  { lord: 'Ketu', years: 7 },
  { lord: 'Venus', years: 20 },
  { lord: 'Sun', years: 6 },
  { lord: 'Moon', years: 10 },
  { lord: 'Mars', years: 7 },
  { lord: 'Rahu', years: 18 },
  { lord: 'Jupiter', years: 16 },
  { lord: 'Saturn', years: 19 },
  { lord: 'Mercury', years: 17 },
]

export const TOTAL_DASHA_YEARS = DASHA_SEQUENCE.reduce((sum, d) => sum + d.years, 0)

export const DASHA_YEARS_BY_LORD: Record<PlanetId, number> = Object.fromEntries(
  DASHA_SEQUENCE.map((d) => [d.lord, d.years]),
) as Record<PlanetId, number>

export const DASHA_LORD_ORDER: PlanetId[] = VIMSHOTTARI_LORD_CYCLE
