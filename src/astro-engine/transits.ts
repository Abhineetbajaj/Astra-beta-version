import type { PlanetId } from '@/astro-engine/types'
import { tropicalLongitude, isRetrograde, type EphemerisBody } from '@/astro-engine/ephemeris'
import { rahuKetuLongitudes } from '@/astro-engine/meanNode'
import { lahiriAyanamsaDeg, toSidereal } from '@/astro-engine/ayanamsa'
import { wholeSignHouse } from '@/astro-engine/houses'
import { rashiForLongitude } from '@/data/rashis'

/**
 * Gochara (transits): where the 9 grahas actually are RIGHT NOW, mapped onto a specific natal
 * chart's houses. This is the one thing a generic LLM chat can't reliably produce — it requires
 * real ephemeris math, not astrology pattern-matching. Pure composition of the existing
 * ephemeris/ayanamsa/house pipeline (same approach as panchang.ts) — no new astronomy code.
 *
 * Deliberately not cached anywhere: unlike the natal chart (fixed forever), transits change
 * daily/weekly, so every caller computes fresh. It's cheap pure math, no LLM involved.
 */

const EPHEMERIS_BODIES: EphemerisBody[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']

export interface TransitPlacement {
  planet: PlanetId
  rashiIndex: number
  /** Whole-sign house from the natal ascendant — null when the natal ascendant is unknown/unreliable. */
  houseFromAscendant: number | null
  /** Whole-sign house counted from the natal Moon's sign — the classical Gochara basis, always available. */
  houseFromMoon: number
  retrograde: boolean
}

export interface Transits {
  computedAt: Date
  placements: TransitPlacement[]
  /**
   * Saturn transiting the 12th, 1st, or 2nd sign from natal Moon — the classical 7.5-year cycle.
   * "peak" = Saturn in the Moon's own sign (traditionally the most intense of the three phases),
   * "rising" = the sign before, "setting" = the sign after.
   */
  sadeSati: { active: boolean; phase: 'rising' | 'peak' | 'setting' | null }
  /** Guru Gochar — which sign, counted from natal Moon, transiting Jupiter currently occupies. */
  jupiterTransitHouseFromMoon: number
}

/** Whole-sign "Nth from X" distance, 1-12 (1 = same sign as X). */
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
      retrograde: true, // Rahu/Ketu are always retrograde by convention (mean node motion)
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
