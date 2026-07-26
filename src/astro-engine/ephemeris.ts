import * as Astronomy from 'astronomy-engine'
import type { PlanetId } from '@/astro-engine/types'

/** The 7 classical grahas whose positions astronomy-engine computes directly (Rahu/Ketu are handled in meanNode.ts). */
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

/**
 * Apparent GEOCENTRIC tropical ecliptic longitude, true equinox of date, in degrees [0,360).
 *
 * IMPORTANT: astronomy-engine's own `EclipticLongitude()` function is HELIOCENTRIC despite
 * its generic name (it throws for the Sun and is wrong for everything else here) — confirmed
 * by reading its implementation. The correct geocentric path is SunPosition for the Sun,
 * EclipticGeoMoon for the Moon (both already geocentric + true-of-date), and GeoVector +
 * Ecliptic() for the remaining planets (EQJ vector converted to true-ecliptic-of-date).
 */
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

/** Greenwich Apparent Sidereal Time in degrees [0,360). */
export function greenwichSiderealTimeDeg(date: Date): number {
  return Astronomy.SiderealTime(date) * 15
}

/**
 * Direction of apparent motion, determined by sampling longitude ~1 day on either side
 * of the given instant. Sun and Moon are never retrograde from Earth.
 */
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
