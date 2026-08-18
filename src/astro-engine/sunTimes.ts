import * as Astronomy from 'astronomy-engine'

/**
 * Real sunrise/sunset via astronomy-engine's SearchRiseSet — the dependency this whole engine is
 * built on already ships this; nothing new to derive. Search starts at UTC midnight of the given
 * date's UTC calendar day, same "UTC calendar date" convention panchang.ts's Vara already uses
 * (documented there as off-by-one-risk only very close to midnight at far-from-UTC longitudes —
 * same tolerance applies here, not a new gap).
 */

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
