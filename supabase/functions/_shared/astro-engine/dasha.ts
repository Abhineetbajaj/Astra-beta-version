// Deno copy of src/astro-engine/dasha.ts — keep in sync; do not diverge silently.

import type { DashaPeriod, PlanetId } from './types.ts'
import { DASHA_LORD_ORDER, DASHA_YEARS_BY_LORD, TOTAL_DASHA_YEARS } from '../data/dashaSequence.ts'
import { NAKSHATRA_SPAN, nakshatraForLongitude } from '../data/nakshatras.ts'

const DAYS_PER_YEAR = 365.25

function addYears(date: Date, years: number): Date {
  return new Date(date.getTime() + years * DAYS_PER_YEAR * 86400000)
}

function subdividePeriod(
  startLord: PlanetId,
  totalDurationYears: number,
  startDate: Date,
  level: DashaPeriod['level'],
): DashaPeriod[] {
  const startIdx = DASHA_LORD_ORDER.indexOf(startLord)
  let cursor = startDate
  const periods: DashaPeriod[] = []

  for (let i = 0; i < 9; i++) {
    const lord = DASHA_LORD_ORDER[(startIdx + i) % 9]
    const years = (totalDurationYears * DASHA_YEARS_BY_LORD[lord]) / TOTAL_DASHA_YEARS
    const endDate = addYears(cursor, years)
    periods.push({ lord, level, startDate: cursor, endDate })
    cursor = endDate
  }
  return periods
}

export function computeVimshottariDasha(moonSiderealLongitude: number, birthDate: Date): DashaPeriod[] {
  const nakshatra = nakshatraForLongitude(moonSiderealLongitude)
  const elapsedFraction =
    (((moonSiderealLongitude % NAKSHATRA_SPAN) + NAKSHATRA_SPAN) % NAKSHATRA_SPAN) / NAKSHATRA_SPAN
  const startingLord = nakshatra.lord
  const balanceYears = DASHA_YEARS_BY_LORD[startingLord] * (1 - elapsedFraction)

  const startIdx = DASHA_LORD_ORDER.indexOf(startingLord)
  const mahadashas: DashaPeriod[] = []
  let cursor = birthDate

  for (let i = 0; i < 9; i++) {
    const lord = DASHA_LORD_ORDER[(startIdx + i) % 9]
    const years = i === 0 ? balanceYears : DASHA_YEARS_BY_LORD[lord]
    const endDate = addYears(cursor, years)
    const antardashas = subdividePeriod(lord, years, cursor, 'antar')

    mahadashas.push({
      lord,
      level: 'maha',
      startDate: cursor,
      endDate,
      children: antardashas,
    })
    cursor = endDate
  }

  return mahadashas
}

export function currentDashaLords(dashas: DashaPeriod[], at: Date): { maha: PlanetId; antar: PlanetId | null } | null {
  const maha = dashas.find((d) => at >= d.startDate && at < d.endDate)
  if (!maha) return null
  const antar = maha.children?.find((d) => at >= d.startDate && at < d.endDate)
  return { maha: maha.lord, antar: antar?.lord ?? null }
}
