// Deno copy of src/astro-engine/transits.ts — keep in sync; do not diverge silently.

import type { PlanetId } from './types.ts'
import { tropicalLongitude, isRetrograde, type EphemerisBody } from './ephemeris.ts'
import { rahuKetuLongitudes } from './meanNode.ts'
import { lahiriAyanamsaDeg, toSidereal } from './ayanamsa.ts'
import { wholeSignHouse } from './houses.ts'
import { rashiForLongitude } from '../data/rashis.ts'

const EPHEMERIS_BODIES: EphemerisBody[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']

export interface TransitPlacement {
  planet: PlanetId
  rashiIndex: number
  houseFromAscendant: number | null
  houseFromMoon: number
  retrograde: boolean
}

export interface Transits {
  computedAt: Date
  placements: TransitPlacement[]
  sadeSati: { active: boolean; phase: 'rising' | 'peak' | 'setting' | null }
  jupiterTransitHouseFromMoon: number
}

function houseDistance(fromRashiIndex: number, toRashiIndex: number): number {
  return ((toRashiIndex - fromRashiIndex + 12) % 12) + 1
}

export function computeTransits(
  natalAscendantRashiIndex: number | null,
  natalMoonRashiIndex: number,
  asOf: Date,
): Transits {
  const ayanamsaDeg = lahiriAyanamsaDeg(asOf)

  const placements: TransitPlacement[] = EPHEMERIS_BODIES.map((body) => {
    const tropical = tropicalLongitude(body, asOf)
    const sidereal = toSidereal(tropical, ayanamsaDeg)
    const rashiIndex = rashiForLongitude(sidereal).index
    return {
      planet: body,
      rashiIndex,
      houseFromAscendant: natalAscendantRashiIndex != null ? wholeSignHouse(rashiIndex, natalAscendantRashiIndex) : null,
      houseFromMoon: houseDistance(natalMoonRashiIndex, rashiIndex),
      retrograde: isRetrograde(body, asOf),
    }
  })

  const { rahu, ketu } = rahuKetuLongitudes(asOf)
  for (const [planet, tropicalLon] of [['Rahu', rahu] as const, ['Ketu', ketu] as const]) {
    const sidereal = toSidereal(tropicalLon, ayanamsaDeg)
    const rashiIndex = rashiForLongitude(sidereal).index
    placements.push({
      planet,
      rashiIndex,
      houseFromAscendant: natalAscendantRashiIndex != null ? wholeSignHouse(rashiIndex, natalAscendantRashiIndex) : null,
      houseFromMoon: houseDistance(natalMoonRashiIndex, rashiIndex),
      retrograde: true,
    })
  }

  const saturn = placements.find((p) => p.planet === 'Saturn')!
  const sadeSatiPhase =
    saturn.houseFromMoon === 12 ? 'rising' : saturn.houseFromMoon === 1 ? 'peak' : saturn.houseFromMoon === 2 ? 'setting' : null

  const jupiter = placements.find((p) => p.planet === 'Jupiter')!

  return {
    computedAt: asOf,
    placements,
    sadeSati: { active: sadeSatiPhase != null, phase: sadeSatiPhase },
    jupiterTransitHouseFromMoon: jupiter.houseFromMoon,
  }
}
