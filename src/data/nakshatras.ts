import type { PlanetId } from '@/astro-engine/types'

export interface Nakshatra {
  index: number
  name: string
  lord: PlanetId
  /** Start of the nakshatra in sidereal longitude, degrees. Span is always 13°20'. */
  startDegree: number
}

export const NAKSHATRA_SPAN = 360 / 27 // 13°20'
export const PADA_SPAN = NAKSHATRA_SPAN / 4 // 3°20'

/** The fixed 9-lord cycle that both nakshatra lordship and Vimshottari dasha order follow. */
export const VIMSHOTTARI_LORD_CYCLE: PlanetId[] = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
]

/**
 * The 27 nakshatras in zodiacal order. Lords cycle through the 9 Vimshottari
 * lords three times (Ketu→Venus→Sun→Moon→Mars→Rahu→Jupiter→Saturn→Mercury),
 * which is also what fixes each nakshatra's dasha starting lord.
 */
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
