// Deno copy of src/data/nakshatras.ts — keep in sync; do not diverge silently.

import type { PlanetId } from '../astro-engine/types.ts'

export interface Nakshatra {
  index: number
  name: string
  lord: PlanetId
  startDegree: number
}

export const NAKSHATRA_SPAN = 360 / 27
export const PADA_SPAN = NAKSHATRA_SPAN / 4

export const VIMSHOTTARI_LORD_CYCLE: PlanetId[] = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
]

export const NAKSHATRAS: Nakshatra[] = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
].map((name, index) => ({
  index,
  name,
  lord: VIMSHOTTARI_LORD_CYCLE[index % 9],
  startDegree: index * NAKSHATRA_SPAN,
}))

export function nakshatraForLongitude(siderealLongitude: number): Nakshatra {
  const normalized = ((siderealLongitude % 360) + 360) % 360
  const index = Math.floor(normalized / NAKSHATRA_SPAN)
  return NAKSHATRAS[Math.min(index, 26)]
}

export function padaForLongitude(siderealLongitude: number): 1 | 2 | 3 | 4 {
  const normalized = ((siderealLongitude % 360) + 360) % 360
  const withinNakshatra = normalized % NAKSHATRA_SPAN
  const pada = Math.floor(withinNakshatra / PADA_SPAN) + 1
  return Math.min(pada, 4) as 1 | 2 | 3 | 4
}
