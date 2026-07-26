import { greenwichSiderealTimeDeg } from '@/astro-engine/ephemeris'
import { meanObliquityDeg } from '@/astro-engine/obliquity'

const DEG2RAD = Math.PI / 180
const RAD2DEG = 180 / Math.PI

/** Right Ascension of the Meridian: Local Apparent Sidereal Time in degrees. Longitude is east-positive. */
export function ramcDeg(date: Date, lonDeg: number): number {
  const ramc = greenwichSiderealTimeDeg(date) + lonDeg
  return ((ramc % 360) + 360) % 360
}

/**
 * Tropical ecliptic longitude of the Ascendant (Lagna), true equinox of date, degrees [0,360).
 * Standard spherical-astronomy formula: tan(Asc) = -cos(RAMC) / (sin ε·tan(lat) + cos ε·sin RAMC),
 * solved with atan2 for correct quadrant. Uses mean obliquity rather than true (nutation-corrected)
 * obliquity — the difference is at most ~9 arcsec, far below astrology-grade tolerance.
 */
export function ascendantTropicalLongitude(date: Date, latDeg: number, lonDeg: number): number {
  const ramc = ramcDeg(date, lonDeg) * DEG2RAD
  const eps = meanObliquityDeg(date) * DEG2RAD
  const lat = latDeg * DEG2RAD

  const y = -Math.cos(ramc)
  const x = Math.sin(eps) * Math.tan(lat) + Math.cos(eps) * Math.sin(ramc)

  const asc = Math.atan2(y, x) * RAD2DEG
  return ((asc % 360) + 360) % 360
}

/**
 * Whole-sign house number (1-12) for a planet, given the ascendant's sidereal rashi index.
 * House 1 = the sign containing the ascendant; house N = N-1 signs further around the zodiac.
 */
export function wholeSignHouse(planetRashiIndex: number, ascendantRashiIndex: number): number {
  return ((planetRashiIndex - ascendantRashiIndex + 12) % 12) + 1
}
