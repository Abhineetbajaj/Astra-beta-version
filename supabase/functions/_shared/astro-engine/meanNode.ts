// Deno copy of src/astro-engine/meanNode.ts — keep in sync; do not diverge silently.

import { julianCenturiesSinceJ2000, julianDay } from './time.ts'

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
