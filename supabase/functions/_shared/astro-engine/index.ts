// Deno copy of src/astro-engine/index.ts — keep in sync; do not diverge silently.

import type { AscendantInfo, NatalChart, NatalChartInput, PlanetId, PlanetPlacement } from './types.ts'
import { tropicalLongitude, isRetrograde, type EphemerisBody } from './ephemeris.ts'
import { rahuKetuLongitudes } from './meanNode.ts'
import { lahiriAyanamsaDeg, toSidereal } from './ayanamsa.ts'
import { ascendantTropicalLongitude, wholeSignHouse } from './houses.ts'
import { rashiForLongitude, degreeInRashi } from '../data/rashis.ts'
import { nakshatraForLongitude, padaForLongitude } from '../data/nakshatras.ts'
import { dignityFor } from './dignity.ts'
import { computeVimshottariDasha } from './dasha.ts'

const EPHEMERIS_BODIES: EphemerisBody[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']

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

export function localSolarNoonUTC(localDateISO: string, lonDeg: number): Date {
  const [y, m, d] = localDateISO.split('-').map(Number)
  const utcHourOffset = 12 - lonDeg / 15
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + utcHourOffset * 3600000)
}

export * from './types.ts'
export { lahiriAyanamsaDeg } from './ayanamsa.ts'
export { computeGunaScore } from './guna.ts'
export type { GunaBreakdown } from './guna.ts'
export { currentDashaLords } from './dasha.ts'
