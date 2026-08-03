// Deno copy of src/astro-engine/time.ts — keep in sync; do not diverge silently.

export function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

export function julianCenturiesSinceJ2000(jd: number): number {
  return (jd - 2451545.0) / 36525
}

export function julianYearsSinceJ2000(date: Date): number {
  return (julianDay(date) - 2451545.0) / 365.25
}
