import { julianYearsSinceJ2000 } from '@/astro-engine/time'

/**
 * Lahiri (Chitrapaksha) ayanamsa, degrees, as a linear precession model anchored at J2000.0.
 *
 * This is the single highest-risk formula in the engine (see project plan, M1 validation gate).
 * Constants were verified against a published historical Lahiri-ayanamsa table (Swiss Ephemeris
 * derived, Jan 1 00:00 UT of each year) rather than taken from memory alone:
 *
 *   1900: 22°27'55"   1950: 23°09'28"   1980: 23°34'32"
 *   2000: 23°51'12"   2020: 24°07'55"   2024: 24°11'27"
 *
 * The true precession rate is non-linear (drifts from ~50.0"/yr to ~50.6"/yr over that span),
 * but a single linear model anchored at J2000 with the IAU 2000 mean rate (50.29"/yr) stays
 * within ~32" of every one of those published points across the full 1900–2024 range —
 * comfortably inside astrology-grade tolerance (see __tests__/ayanamsa.test.ts).
 */
const LAHIRI_AT_J2000_DEG = 23.853333 // 23°51'12", Jan 1 2000 00:00 UT
const PRECESSION_ARCSEC_PER_YEAR = 50.29

export function lahiriAyanamsaDeg(date: Date): number {
  const yearsSinceJ2000 = julianYearsSinceJ2000(date)
  const drift = (yearsSinceJ2000 * PRECESSION_ARCSEC_PER_YEAR) / 3600
  return LAHIRI_AT_J2000_DEG + drift
}

/** Subtracts the ayanamsa from a tropical longitude and normalizes to [0,360). */
export function toSidereal(tropicalLongitudeDeg: number, ayanamsaDeg: number): number {
  const sidereal = tropicalLongitudeDeg - ayanamsaDeg
  return ((sidereal % 360) + 360) % 360
}
