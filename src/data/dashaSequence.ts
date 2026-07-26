import type { PlanetId } from '@/astro-engine/types'
import { VIMSHOTTARI_LORD_CYCLE } from '@/data/nakshatras'

export interface DashaLordYears {
  lord: PlanetId
  years: number
}

/** Fixed Vimshottari Mahadasha sequence and lengths, totaling 120 years. */
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

export const TOTAL_DASHA_YEARS = DASHA_SEQUENCE.reduce((sum, d) => sum + d.years, 0) // 120

export const DASHA_YEARS_BY_LORD: Record<PlanetId, number> = Object.fromEntries(
  DASHA_SEQUENCE.map((d) => [d.lord, d.years]),
) as Record<PlanetId, number>

/** Order-preserving lord cycle, kept in sync with nakshatra lordship. */
export const DASHA_LORD_ORDER: PlanetId[] = VIMSHOTTARI_LORD_CYCLE
