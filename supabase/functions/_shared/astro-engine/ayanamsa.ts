// Deno copy of src/astro-engine/ayanamsa.ts — keep in sync; do not diverge silently.

import { julianYearsSinceJ2000 } from './time.ts'

const LAHIRI_AT_J2000_DEG = 23.853333
const PRECESSION_ARCSEC_PER_YEAR = 50.29

export function lahiriAyanamsaDeg(date: Date): number {
  const yearsSinceJ2000 = julianYearsSinceJ2000(date)
  const drift = (yearsSinceJ2000 * PRECESSION_ARCSEC_PER_YEAR) / 3600
  return LAHIRI_AT_J2000_DEG + drift
}

export function toSidereal(tropicalLongitudeDeg: number, ayanamsaDeg: number): number {
  const sidereal = tropicalLongitudeDeg - ayanamsaDeg
  return ((sidereal % 360) + 360) % 360
}
