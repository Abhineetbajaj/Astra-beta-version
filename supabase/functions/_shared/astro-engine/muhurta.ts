// Deno copy of src/astro-engine/muhurta.ts — keep in sync; do not diverge silently.

import type { PlanetId } from './types.ts'

export interface TimeWindow {
  start: Date
  end: Date
}

function isWithin(now: Date, window: TimeWindow): boolean {
  return now >= window.start && now < window.end
}

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

export type ChoghadiyaName = 'Udveg' | 'Amrit' | 'Rog' | 'Labh' | 'Shubh' | 'Char' | 'Kaal'

export interface ChoghadiyaPeriod extends TimeWindow {
  name: ChoghadiyaName
  auspicious: boolean
}

const CHOGHADIYA_CYCLE: ChoghadiyaName[] = ['Udveg', 'Amrit', 'Rog', 'Labh', 'Shubh', 'Char', 'Kaal']
const AUSPICIOUS_CHOGHADIYA = new Set<ChoghadiyaName>(['Amrit', 'Labh', 'Shubh', 'Char'])

const DAY_START_BY_WEEKDAY: ChoghadiyaName[] = ['Udveg', 'Amrit', 'Rog', 'Labh', 'Shubh', 'Char', 'Kaal']
const NIGHT_START_BY_WEEKDAY: ChoghadiyaName[] = ['Shubh', 'Char', 'Kaal', 'Udveg', 'Amrit', 'Rog', 'Labh']

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

const HORA_WEEKDAY_RULER: PlanetId[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
const CHALDEAN_ORDER: PlanetId[] = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon']

export interface HoraPeriod extends TimeWindow {
  planet: PlanetId
}

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

export function abhijitMuhurta(sunrise: Date, sunset: Date): TimeWindow {
  const dayMs = sunset.getTime() - sunrise.getTime()
  const noon = sunrise.getTime() + dayMs / 2
  const halfWidth = dayMs / 30
  return { start: new Date(noon - halfWidth), end: new Date(noon + halfWidth) }
}
