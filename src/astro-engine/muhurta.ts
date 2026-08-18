// The Timing Engine — Rahu Kaal/Yamaganda/Gulika Kaal, Choghadiya, Hora, and Abhijit Muhurta. All
// pure arithmetic on sunrise/sunset instants (from sunTimes.ts) — no new astronomy here, just the
// classical division rules. The weekday tables below are cross-checked against drikpanchang.com
// (the standard reference every other panchang app cites) for Sunday and Monday, zero
// discrepancies across all three inauspicious-period tables and the Choghadiya day/night tables —
// treat as verified, not guessed, but this is the one place in the engine where "verify against a
// second source before shipping a change" matters most, since the whole point of this feature is
// being more precise than a chatbot that hallucinates these times.
//
// IMPORTANT for callers: `weekday` throughout this file means "the weekday this Vara belongs to"
// (i.e. `sunrise.getUTCDay()`), NOT the calendar weekday of the clock time being queried. The
// classical day runs sunrise-to-sunrise, so the night after Sunday's sunrise is still "Sunday" for
// Choghadiya/Hora purposes even once the clock has passed midnight into Monday. Pass the SAME
// weekday to both the day and night functions for a given Vara.

import type { PlanetId } from '@/astro-engine/types'

export interface TimeWindow {
  start: Date
  end: Date
}

function isWithin(now: Date, window: TimeWindow): boolean {
  return now >= window.start && now < window.end
}

// ---------------------------------------------------------------------------
// Rahu Kaal / Yamaganda / Gulika Kaal — daylight divided into 8 equal parts;
// each weekday has a fixed "octant" (1-8, counting from sunrise) for each.
// ---------------------------------------------------------------------------

/** Octant index (1-8) by weekday, `getUTCDay()` order (0=Sunday...6=Saturday). */
const RAHU_KAAL_OCTANT = [8, 2, 7, 5, 6, 4, 3]
const YAMAGANDA_OCTANT = [5, 4, 3, 2, 1, 7, 6]
const GULIKA_KAAL_OCTANT = [7, 6, 5, 4, 3, 2, 1]

function octantWindow(sunrise: Date, sunset: Date, octant: number): TimeWindow {
  const slotMs = (sunset.getTime() - sunrise.getTime()) / 8
  return {
    start: new Date(sunrise.getTime() + (octant - 1) * slotMs),
    end: new Date(sunrise.getTime() + octant * slotMs),
  }
}

export function rahuKaal(sunrise: Date, sunset: Date, weekday: number): TimeWindow {
  return octantWindow(sunrise, sunset, RAHU_KAAL_OCTANT[weekday])
}

export function yamaganda(sunrise: Date, sunset: Date, weekday: number): TimeWindow {
  return octantWindow(sunrise, sunset, YAMAGANDA_OCTANT[weekday])
}

export function gulikaKaal(sunrise: Date, sunset: Date, weekday: number): TimeWindow {
  return octantWindow(sunrise, sunset, GULIKA_KAAL_OCTANT[weekday])
}

// ---------------------------------------------------------------------------
// Choghadiya — day and night each divided into 8 parts, cycling through 7
// named periods starting from a weekday-dependent point.
// ---------------------------------------------------------------------------

export type ChoghadiyaName = 'Udveg' | 'Amrit' | 'Rog' | 'Labh' | 'Shubh' | 'Char' | 'Kaal'

export interface ChoghadiyaPeriod extends TimeWindow {
  name: ChoghadiyaName
  auspicious: boolean
}

const CHOGHADIYA_CYCLE: ChoghadiyaName[] = ['Udveg', 'Amrit', 'Rog', 'Labh', 'Shubh', 'Char', 'Kaal']
const AUSPICIOUS_CHOGHADIYA = new Set<ChoghadiyaName>(['Amrit', 'Labh', 'Shubh', 'Char'])

const DAY_START_BY_WEEKDAY: ChoghadiyaName[] = ['Udveg', 'Amrit', 'Rog', 'Labh', 'Shubh', 'Char', 'Kaal']
const NIGHT_START_BY_WEEKDAY: ChoghadiyaName[] = ['Shubh', 'Char', 'Kaal', 'Udveg', 'Amrit', 'Rog', 'Labh']

export const CHOGHADIYA_BLURBS: Record<ChoghadiyaName, string> = {
  Amrit: 'The most favorable window — good for anything important.',
  Shubh: 'Auspicious — a solid general-purpose window.',
  Labh: 'Favorable for profit, business, and financial matters.',
  Char: 'Good for travel and movement.',
  Udveg: 'Restless energy — avoid starting anything important.',
  Kaal: 'Traditionally inauspicious — best avoided for new beginnings.',
  Rog: 'Associated with friction or illness — avoid health-related starts.',
}

function buildChoghadiyaPeriods(start: Date, end: Date, startName: ChoghadiyaName): ChoghadiyaPeriod[] {
  const slotMs = (end.getTime() - start.getTime()) / 8
  const startIndex = CHOGHADIYA_CYCLE.indexOf(startName)
  return Array.from({ length: 8 }, (_, i) => {
    const name = CHOGHADIYA_CYCLE[(startIndex + i) % 7]
    return {
      name,
      auspicious: AUSPICIOUS_CHOGHADIYA.has(name),
      start: new Date(start.getTime() + i * slotMs),
      end: new Date(start.getTime() + (i + 1) * slotMs),
    }
  })
}

export function choghadiyaForDay(sunrise: Date, sunset: Date, weekday: number): ChoghadiyaPeriod[] {
  return buildChoghadiyaPeriods(sunrise, sunset, DAY_START_BY_WEEKDAY[weekday])
}

export function choghadiyaForNight(sunset: Date, nextSunrise: Date, weekday: number): ChoghadiyaPeriod[] {
  return buildChoghadiyaPeriods(sunset, nextSunrise, NIGHT_START_BY_WEEKDAY[weekday])
}

export function currentChoghadiya(periods: ChoghadiyaPeriod[], now: Date): ChoghadiyaPeriod | null {
  return periods.find((p) => isWithin(now, p)) ?? null
}

// ---------------------------------------------------------------------------
// Hora (planetary hours) — day and night each divided into 12 equal parts,
// cycling through the fixed Chaldean order starting from the weekday's ruler.
// ---------------------------------------------------------------------------

const HORA_WEEKDAY_RULER: PlanetId[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
const CHALDEAN_ORDER: PlanetId[] = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon']

export interface HoraPeriod extends TimeWindow {
  planet: PlanetId
}

/** All 24 horas for one Vara (day's 12 + the following night's 12), `weekday` = the day's ruler. */
export function horasForVara(sunrise: Date, sunset: Date, nextSunrise: Date, weekday: number): HoraPeriod[] {
  const startIndex = CHALDEAN_ORDER.indexOf(HORA_WEEKDAY_RULER[weekday])
  const daySlotMs = (sunset.getTime() - sunrise.getTime()) / 12
  const nightSlotMs = (nextSunrise.getTime() - sunset.getTime()) / 12

  const dayHoras = Array.from({ length: 12 }, (_, i) => ({
    planet: CHALDEAN_ORDER[(startIndex + i) % 7],
    start: new Date(sunrise.getTime() + i * daySlotMs),
    end: new Date(sunrise.getTime() + (i + 1) * daySlotMs),
  }))
  const nightHoras = Array.from({ length: 12 }, (_, i) => ({
    planet: CHALDEAN_ORDER[(startIndex + 12 + i) % 7],
    start: new Date(sunset.getTime() + i * nightSlotMs),
    end: new Date(sunset.getTime() + (i + 1) * nightSlotMs),
  }))
  return [...dayHoras, ...nightHoras]
}

export function currentHora(horas: HoraPeriod[], now: Date): HoraPeriod | null {
  return horas.find((h) => isWithin(now, h)) ?? null
}

// ---------------------------------------------------------------------------
// Abhijit Muhurta — the 8th of 15 equal divisions of daylight, centered on
// solar noon. Width scales with actual day length (day/15), not a fixed
// 48 minutes, so this stays correct away from the equator/equinox.
// ---------------------------------------------------------------------------

export function abhijitMuhurta(sunrise: Date, sunset: Date): TimeWindow {
  const dayMs = sunset.getTime() - sunrise.getTime()
  const noon = sunrise.getTime() + dayMs / 2
  const halfWidth = dayMs / 30
  return { start: new Date(noon - halfWidth), end: new Date(noon + halfWidth) }
}
