import type {
  AscendantInfo,
  NatalChart,
  NatalChartInput,
  PlanetId,
  PlanetPlacement,
} from '@/astro-engine/types'
import { tropicalLongitude, isRetrograde, type EphemerisBody } from '@/astro-engine/ephemeris'
import { rahuKetuLongitudes } from '@/astro-engine/meanNode'
import { lahiriAyanamsaDeg, toSidereal } from '@/astro-engine/ayanamsa'
import { ascendantTropicalLongitude, wholeSignHouse } from '@/astro-engine/houses'
import { rashiForLongitude, degreeInRashi } from '@/data/rashis'
import { nakshatraForLongitude, padaForLongitude } from '@/data/nakshatras'
import { dignityFor } from '@/astro-engine/dignity'
import { computeVimshottariDasha } from '@/astro-engine/dasha'

const EPHEMERIS_BODIES: EphemerisBody[] = [
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn',
]

function buildPlacement(
  planet: PlanetId,
  tropicalLon: number,
  siderealLon: number,
  retrograde: boolean,
): PlanetPlacement {
  const rashi = rashiForLongitude(siderealLon)
  const nakshatra = nakshatraForLongitude(siderealLon)
  return {
    planet,
    tropicalLongitude: tropicalLon,
    siderealLongitude: siderealLon,
    rashiIndex: rashi.index,
    degreeInRashi: degreeInRashi(siderealLon),
    nakshatraIndex: nakshatra.index,
    nakshatraPada: padaForLongitude(siderealLon),
    houseIndex: null,
    retrograde,
    dignity: dignityFor(planet, rashi.index),
  }
}

export function computeNatalChart(input: NatalChartInput): NatalChart {
  const { dateTimeUTC, lat, lon, timeKnown } = input
  const ayanamsaDeg = lahiriAyanamsaDeg(dateTimeUTC)

  const placements: PlanetPlacement[] = EPHEMERIS_BODIES.map((body) => {
    const tropical = tropicalLongitude(body, dateTimeUTC)
    const sidereal = toSidereal(tropical, ayanamsaDeg)
    return buildPlacement(body, tropical, sidereal, isRetrograde(body, dateTimeUTC))
  })

  const { rahu, ketu } = rahuKetuLongitudes(dateTimeUTC)
  placements.push(buildPlacement('Rahu', rahu, toSidereal(rahu, ayanamsaDeg), true))
  placements.push(buildPlacement('Ketu', ketu, toSidereal(ketu, ayanamsaDeg), true))

  const ascTropical = ascendantTropicalLongitude(dateTimeUTC, lat, lon)
  const ascSidereal = toSidereal(ascTropical, ayanamsaDeg)
  const ascRashi = rashiForLongitude(ascSidereal)
  const ascendant: AscendantInfo = {
    siderealLongitude: ascSidereal,
    rashiIndex: ascRashi.index,
    degreeInRashi: degreeInRashi(ascSidereal),
  }

  const placementsWithHouses = placements.map((p) => ({
    ...p,
    houseIndex: wholeSignHouse(p.rashiIndex, ascendant.rashiIndex),
  }))

  const moon = placementsWithHouses.find((p) => p.planet === 'Moon')!
  const dashas = computeVimshottariDasha(moon.siderealLongitude, dateTimeUTC)

  return {
    birthMoment: dateTimeUTC,
    lat,
    lon,
    ayanamsaDeg,
    placements: placementsWithHouses,
    ascendant,
    housesReliable: timeKnown,
    dashas,
  }
}

/**
 * Approximate local solar noon in UTC for a given calendar date and longitude — used when
 * birth time is unknown. Ignores the equation of time (±16 min worst case), which is
 * negligible against the fact that houses are already flagged unreliable in this case.
 */
export function localSolarNoonUTC(localDateISO: string, lonDeg: number): Date {
  const [y, m, d] = localDateISO.split('-').map(Number)
  const utcHourOffset = 12 - lonDeg / 15
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + utcHourOffset * 3600000)
}

export * from '@/astro-engine/types'
export { lahiriAyanamsaDeg } from '@/astro-engine/ayanamsa'
export { computeGunaScore } from '@/astro-engine/guna'
export type { GunaBreakdown } from '@/astro-engine/guna'
export { currentDashaLords } from '@/astro-engine/dasha'
