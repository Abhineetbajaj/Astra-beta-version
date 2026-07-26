import { julianDay, julianCenturiesSinceJ2000 } from '@/astro-engine/time'

/**
 * Mean longitude of the Moon's ascending node (Rahu), Meeus/IAU polynomial,
 * referenced to the mean equinox of date. Vedic astrology uses the MEAN node
 * (not the "true"/osculating node), so no nutation correction is applied here —
 * that's consistent with the mean-node definition, not a simplification of it.
 */
export function meanLunarNodeLongitude(date: Date): number {
  const T = julianCenturiesSinceJ2000(julianDay(date))
  let omega =
    125.0445479 -
    1934.1362891 * T +
    0.0020754 * T * T +
    (T * T * T) / 467441 -
    (T * T * T * T) / 60616000
  omega = ((omega % 360) + 360) % 360
  return omega
}

export function rahuKetuLongitudes(date: Date): { rahu: number; ketu: number } {
  const rahu = meanLunarNodeLongitude(date)
  const ketu = (rahu + 180) % 360
  return { rahu, ketu }
}
