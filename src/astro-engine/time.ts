/** Julian Day (UT) for a JS Date. */
export function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

/** Julian centuries elapsed since J2000.0 (JD 2451545.0), the standard T used in Meeus-style polynomials. */
export function julianCenturiesSinceJ2000(jd: number): number {
  return (jd - 2451545.0) / 36525
}

/** Fractional Julian years elapsed since J2000.0 — used by the (slower-varying) ayanamsa formula. */
export function julianYearsSinceJ2000(date: Date): number {
  return (julianDay(date) - 2451545.0) / 365.25
}
