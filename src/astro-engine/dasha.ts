import type { DashaPeriod, PlanetId } from '@/astro-engine/types'
import { DASHA_LORD_ORDER, DASHA_YEARS_BY_LORD, TOTAL_DASHA_YEARS } from '@/data/dashaSequence'
import { NAKSHATRA_SPAN, nakshatraForLongitude } from '@/data/nakshatras'

const DAYS_PER_YEAR = 365.25

function addYears(date: Date, years: number): Date {
  return new Date(date.getTime() + years * DAYS_PER_YEAR * 86400000)
}

/**
 * Subdivides a period of `totalDurationYears` starting at `startDate` into a 9-lord
 * sub-cycle beginning at `startLord`, with each sub-period proportional to that lord's
 * share of the classical 120-year cycle (lordYears/120) — the standard Vimshottari
 * Antardasha/Pratyantardasha rule, applied recursively via `depth`.
 *
 * Simplification: for the birth Mahadasha (a partial "balance" period), classical
 * software computes exactly where birth falls within the full antardasha sequence.
 * Here we instead treat the balance period itself as a fresh 9-cycle, proportionally
 * scaled — internally consistent and Vimshottari-correct for all later (full) periods,
 * but not bit-for-bit identical to reference software for the very first Antardasha.
 */
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

/**
 * Full Vimshottari Mahadasha timeline (one 120-year cycle from birth), each with its
 * Antardasha children. Starting lord = birth Moon's nakshatra lord; the first Mahadasha
 * is a partial "balance" period based on how far the Moon has moved through that nakshatra.
 */
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

/** Finds the innermost (Antardasha-level) period active at `at`, walking into children. */
export function currentDashaLords(dashas: DashaPeriod[], at: Date): { maha: PlanetId; antar: PlanetId | null } | null {
  const maha = dashas.find((d) => at >= d.startDate && at < d.endDate)
  if (!maha) return null
  const antar = maha.children?.find((d) => at >= d.startDate && at < d.endDate)
  return { maha: maha.lord, antar: antar?.lord ?? null }
}
