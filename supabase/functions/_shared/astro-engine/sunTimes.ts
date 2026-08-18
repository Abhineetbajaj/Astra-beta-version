// Deno copy of src/astro-engine/sunTimes.ts — keep in sync; do not diverge silently.
// Only the import specifier for astronomy-engine differs from the frontend copy (npm: vs bare).

import * as Astronomy from 'npm:astronomy-engine@^2.1.19'

export function sunriseUTC(date: Date, latDeg: number, lonDeg: number): Date | null {
  const observer = new Astronomy.Observer(latDeg, lonDeg, 0)
  const searchStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const result = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, searchStart, 1)
  return result ? result.date : null
}

export function sunsetUTC(date: Date, latDeg: number, lonDeg: number): Date | null {
  const observer = new Astronomy.Observer(latDeg, lonDeg, 0)
  const searchStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const result = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, searchStart, 1)
  return result ? result.date : null
}
