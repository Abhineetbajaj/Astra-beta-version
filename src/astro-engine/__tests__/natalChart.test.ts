import { describe, it, expect } from 'vitest'
import { computeNatalChart } from '@/astro-engine/index'
import { NAKSHATRAS } from '@/data/nakshatras'
import { DASHA_LORD_ORDER, DASHA_YEARS_BY_LORD, TOTAL_DASHA_YEARS } from '@/data/dashaSequence'
import type { PlanetId } from '@/astro-engine/types'

/**
 * Independent reference chart: 2026-05-15 00:00 IST (= 2026-05-14T18:30:00Z),
 * sourced from jagannathhora.com's published May-2026 sidereal (Lahiri) ephemeris
 * table — not derived from this codebase. Positions converted from sign+degree to
 * absolute sidereal longitude. This validates ephemeris.ts + meanNode.ts +
 * ayanamsa.ts + nakshatra assignment end-to-end, independent of the ascendant/
 * house pipeline (which has no external location tied to this reference row).
 */
const REFERENCE_DATE = new Date('2026-05-14T18:30:00Z')

const REFERENCE_PLACEMENTS: { planet: PlanetId; siderealLongitude: number; nakshatra: string }[] = [
  { planet: 'Sun', siderealLongitude: 29 + 45 / 60, nakshatra: 'Krittika' },
  { planet: 'Moon', siderealLongitude: 0 + 52 / 60, nakshatra: 'Ashwini' },
  { planet: 'Mars', siderealLongitude: 2 + 38 / 60, nakshatra: 'Ashwini' },
  { planet: 'Mercury', siderealLongitude: 29 + 57 / 60, nakshatra: 'Krittika' },
  { planet: 'Jupiter', siderealLongitude: 60 + 26 + 47 / 60, nakshatra: 'Punarvasu' },
  { planet: 'Venus', siderealLongitude: 60 + 0 + 39 / 60, nakshatra: 'Mrigashira' },
  { planet: 'Saturn', siderealLongitude: 330 + 16 + 24 / 60, nakshatra: 'Uttara Bhadrapada' },
  { planet: 'Rahu', siderealLongitude: 300 + 10 + 52 / 60, nakshatra: 'Shatabhisha' },
  { planet: 'Ketu', siderealLongitude: 120 + 10 + 52 / 60, nakshatra: 'Magha' },
]

const TOLERANCE_DEG = 0.15

describe('computeNatalChart — ephemeris/ayanamsa/nakshatra pipeline', () => {
  // Location is irrelevant to these fields (tropical/sidereal longitude, nakshatra) —
  // use an arbitrary point for the parts of the chart this test doesn't check.
  const chart = computeNatalChart({
    dateTimeUTC: REFERENCE_DATE,
    lat: 28.6139,
    lon: 77.209,
    timeKnown: true,
  })

  for (const ref of REFERENCE_PLACEMENTS) {
    it(`places ${ref.planet} within ${TOLERANCE_DEG}° of the published reference`, () => {
      const placement = chart.placements.find((p) => p.planet === ref.planet)!
      let delta = Math.abs(placement.siderealLongitude - ref.siderealLongitude)
      if (delta > 180) delta = 360 - delta
      expect(delta).toBeLessThan(TOLERANCE_DEG)
    })

    it(`assigns ${ref.planet} to nakshatra ${ref.nakshatra}`, () => {
      const placement = chart.placements.find((p) => p.planet === ref.planet)!
      expect(NAKSHATRAS[placement.nakshatraIndex].name).toBe(ref.nakshatra)
    })
  }

  it('keeps Rahu and Ketu exactly 180° apart', () => {
    const rahu = chart.placements.find((p) => p.planet === 'Rahu')!
    const ketu = chart.placements.find((p) => p.planet === 'Ketu')!
    const diff = Math.abs(rahu.siderealLongitude - ketu.siderealLongitude)
    expect(Math.min(diff, 360 - diff)).toBeCloseTo(180, 1)
  })
})

describe('computeNatalChart — whole-sign houses', () => {
  const chart = computeNatalChart({
    dateTimeUTC: REFERENCE_DATE,
    lat: 28.6139,
    lon: 77.209,
    timeKnown: true,
  })

  it('places the sign containing the ascendant in house 1', () => {
    const inAscendantSign = chart.placements.filter((p) => p.rashiIndex === chart.ascendant!.rashiIndex)
    for (const p of inAscendantSign) {
      expect(p.houseIndex).toBe(1)
    }
  })

  it('assigns every planet a house between 1 and 12', () => {
    for (const p of chart.placements) {
      expect(p.houseIndex).toBeGreaterThanOrEqual(1)
      expect(p.houseIndex).toBeLessThanOrEqual(12)
    }
  })

  it('flags housesReliable=false when timeKnown=false, without crashing the pipeline', () => {
    const unknown = computeNatalChart({
      dateTimeUTC: REFERENCE_DATE,
      lat: 28.6139,
      lon: 77.209,
      timeKnown: false,
    })
    expect(unknown.housesReliable).toBe(false)
    expect(unknown.ascendant).not.toBeNull()
  })
})

describe('computeNatalChart — Vimshottari dasha', () => {
  const chart = computeNatalChart({
    dateTimeUTC: REFERENCE_DATE,
    lat: 28.6139,
    lon: 77.209,
    timeKnown: true,
  })

  it('starts the Mahadasha sequence with the Moon nakshatra lord', () => {
    const moon = chart.placements.find((p) => p.planet === 'Moon')!
    const moonNakshatraLord = NAKSHATRAS[moon.nakshatraIndex].lord
    expect(chart.dashas[0].lord).toBe(moonNakshatraLord)
  })

  it('follows the fixed 9-lord Vimshottari order with no gaps', () => {
    const startIdx = DASHA_LORD_ORDER.indexOf(chart.dashas[0].lord)
    for (let i = 0; i < 9; i++) {
      expect(chart.dashas[i].lord).toBe(DASHA_LORD_ORDER[(startIdx + i) % 9])
      if (i > 0) {
        expect(chart.dashas[i].startDate.getTime()).toBe(chart.dashas[i - 1].endDate.getTime())
      }
    }
  })

  it('spans 120 years minus the already-elapsed part of the birth nakshatra', () => {
    // The first Mahadasha is a partial "balance" period (birth falls partway through
    // the starting lord's nakshatra), so one full 9-lord cycle from birth spans
    // 120 years minus however much of the starting lord's dasha had already elapsed.
    const firstPeriodYears =
      (chart.dashas[0].endDate.getTime() - chart.dashas[0].startDate.getTime()) / (365.25 * 86400000)
    const fullStartingLordYears = DASHA_YEARS_BY_LORD[chart.dashas[0].lord]
    const alreadyElapsedYears = fullStartingLordYears - firstPeriodYears
    const expectedTotalYears = TOTAL_DASHA_YEARS - alreadyElapsedYears

    const actualTotalYears =
      (chart.dashas[8].endDate.getTime() - chart.dashas[0].startDate.getTime()) / (365.25 * 86400000)
    expect(actualTotalYears).toBeCloseTo(expectedTotalYears, 6)
  })

  it('subdivides each Mahadasha into 9 Antardashas summing to the parent duration', () => {
    for (const maha of chart.dashas) {
      expect(maha.children).toHaveLength(9)
      const childSpan =
        (maha.children![8].endDate.getTime() - maha.children![0].startDate.getTime()) / 86400000
      const parentSpan = (maha.endDate.getTime() - maha.startDate.getTime()) / 86400000
      expect(childSpan).toBeCloseTo(parentSpan, 3)
    }
  })
})
