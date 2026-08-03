// Deno copy of src/astro-engine/obliquity.ts — keep in sync; do not diverge silently.

import { julianCenturiesSinceJ2000, julianDay } from './time.ts'

export function meanObliquityDeg(date: Date): number {
  const T = julianCenturiesSinceJ2000(julianDay(date))
  const arcsec = 21.448 - 46.815 * T - 0.00059 * T * T + 0.001813 * T * T * T
  return 23 + 26 / 60 + arcsec / 3600
}
