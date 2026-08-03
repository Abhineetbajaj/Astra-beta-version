// Deno copy of src/astro-engine/ephemeris.ts — keep in sync; do not diverge silently.
// Only the import specifier for astronomy-engine differs from the frontend copy (npm: vs bare).

import * as Astronomy from 'npm:astronomy-engine@^2.1.19'
import type { PlanetId } from './types.ts'

export type EphemerisBody = Exclude<PlanetId, 'Rahu' | 'Ketu'>

const BODY_MAP: Record<EphemerisBody, Astronomy.Body> = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mars: Astronomy.Body.Mars,
  Mercury: Astronomy.Body.Mercury,
  Jupiter: Astronomy.Body.Jupiter,
  Venus: Astronomy.Body.Venus,
  Saturn: Astronomy.Body.Saturn,
}

export function tropicalLongitude(body: EphemerisBody, date: Date): number {
  if (body === 'Sun') {
    return Astronomy.SunPosition(date).elon
  }
  if (body === 'Moon') {
    return Astronomy.EclipticGeoMoon(date).lon
  }
  const geoVector = Astronomy.GeoVector(BODY_MAP[body], date, true)
  return Astronomy.Ecliptic(geoVector).elon
}

export function greenwichSiderealTimeDeg(date: Date): number {
  return Astronomy.SiderealTime(date) * 15
}

export function isRetrograde(body: EphemerisBody, date: Date): boolean {
  if (body === 'Sun' || body === 'Moon') return false

  const dayMs = 24 * 60 * 60 * 1000
  const before = tropicalLongitude(body, new Date(date.getTime() - dayMs))
  const after = tropicalLongitude(body, new Date(date.getTime() + dayMs))

  let delta = after - before
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  return delta < 0
}
