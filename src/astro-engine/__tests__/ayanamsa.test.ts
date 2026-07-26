import { describe, it, expect } from 'vitest'
import { lahiriAyanamsaDeg } from '@/astro-engine/ayanamsa'

/**
 * Reference values: published historical Lahiri (Chitrapaksha) ayanamsa table,
 * Swiss-Ephemeris-derived, at 00:00 UT on Jan 1 of each year (jagannathhora.com,
 * "Historical Lahiri Ayanamsa Values" reference tables 1900-2050).
 * True precession is non-linear (~50.0"/yr to ~50.6"/yr across this span); our
 * linear model anchored at J2000 stays within the tolerance below at every point.
 */
const REFERENCE_POINTS: { iso: string; dms: [number, number, number] }[] = [
  { iso: '1900-01-01T00:00:00Z', dms: [22, 27, 55] },
  { iso: '1950-01-01T00:00:00Z', dms: [23, 9, 28] },
  { iso: '1980-01-01T00:00:00Z', dms: [23, 34, 32] },
  { iso: '2000-01-01T00:00:00Z', dms: [23, 51, 12] },
  { iso: '2020-01-01T00:00:00Z', dms: [24, 7, 55] },
  { iso: '2024-01-01T00:00:00Z', dms: [24, 11, 27] },
]

function dmsToDeg([d, m, s]: [number, number, number]): number {
  return d + m / 60 + s / 3600
}

const TOLERANCE_DEG = 0.02 // ~72 arcsec — comfortably astrology-grade

describe('lahiriAyanamsaDeg', () => {
  for (const point of REFERENCE_POINTS) {
    it(`matches published value at ${point.iso} within ${TOLERANCE_DEG}°`, () => {
      const expected = dmsToDeg(point.dms)
      const actual = lahiriAyanamsaDeg(new Date(point.iso))
      expect(Math.abs(actual - expected)).toBeLessThan(TOLERANCE_DEG)
    })
  }

  it('increases monotonically over time', () => {
    const a = lahiriAyanamsaDeg(new Date('2000-01-01T00:00:00Z'))
    const b = lahiriAyanamsaDeg(new Date('2020-01-01T00:00:00Z'))
    expect(b).toBeGreaterThan(a)
  })
})
