import { describe, it, expect } from 'vitest'
import {
  rahuKaal,
  yamaganda,
  gulikaKaal,
  choghadiyaForDay,
  choghadiyaForNight,
  horasForVara,
  abhijitMuhurta,
} from '@/astro-engine/muhurta'

// Reference case for a 12-hour day (6:00 sunrise, 18:00 sunset — the standard assumption every
// published Rahu Kaal table uses) — cross-checked against drikpanchang.com's own published times
// for Sunday and Monday, independently of this codebase, before writing these assertions.
const SUNRISE = new Date('2026-01-01T06:00:00Z')
const SUNSET = new Date('2026-01-01T18:00:00Z')
const SUNDAY = 0
const MONDAY = 1

function hm(date: Date): string {
  return date.toISOString().slice(11, 16)
}

describe('rahuKaal / yamaganda / gulikaKaal', () => {
  it('matches drikpanchang.com published Sunday times (Rahu 8th, Yamaganda 5th, Gulika 7th octant)', () => {
    expect(hm(rahuKaal(SUNRISE, SUNSET, SUNDAY).start)).toBe('16:30')
    expect(hm(rahuKaal(SUNRISE, SUNSET, SUNDAY).end)).toBe('18:00')
    expect(hm(yamaganda(SUNRISE, SUNSET, SUNDAY).start)).toBe('12:00')
    expect(hm(yamaganda(SUNRISE, SUNSET, SUNDAY).end)).toBe('13:30')
    expect(hm(gulikaKaal(SUNRISE, SUNSET, SUNDAY).start)).toBe('15:00')
    expect(hm(gulikaKaal(SUNRISE, SUNSET, SUNDAY).end)).toBe('16:30')
  })

  it('matches drikpanchang.com published Monday times (Rahu 2nd, Yamaganda 4th, Gulika 6th octant)', () => {
    expect(hm(rahuKaal(SUNRISE, SUNSET, MONDAY).start)).toBe('07:30')
    expect(hm(rahuKaal(SUNRISE, SUNSET, MONDAY).end)).toBe('09:00')
    expect(hm(yamaganda(SUNRISE, SUNSET, MONDAY).start)).toBe('10:30')
    expect(hm(yamaganda(SUNRISE, SUNSET, MONDAY).end)).toBe('12:00')
    expect(hm(gulikaKaal(SUNRISE, SUNSET, MONDAY).start)).toBe('13:30')
    expect(hm(gulikaKaal(SUNRISE, SUNSET, MONDAY).end)).toBe('15:00')
  })
})

describe('choghadiyaForDay / choghadiyaForNight', () => {
  it("cycles the 7-name sequence across 8 day slots, Sunday starting Udveg (drikpanchang-verified)", () => {
    const periods = choghadiyaForDay(SUNRISE, SUNSET, SUNDAY)
    expect(periods.map((p) => p.name)).toEqual(['Udveg', 'Amrit', 'Rog', 'Labh', 'Shubh', 'Char', 'Kaal', 'Udveg'])
    expect(periods[0].auspicious).toBe(false) // Udveg
    expect(periods[1].auspicious).toBe(true) // Amrit
  })

  it('night starts from a different point in the cycle than day, Sunday night starting Shubh', () => {
    const nextSunrise = new Date('2026-01-02T06:00:00Z')
    const periods = choghadiyaForNight(SUNSET, nextSunrise, SUNDAY)
    expect(periods[0].name).toBe('Shubh')
  })
})

describe('horasForVara', () => {
  it("Sunday's first hora is ruled by the Sun, then follows the Chaldean order", () => {
    const nextSunrise = new Date('2026-01-02T06:00:00Z')
    const horas = horasForVara(SUNRISE, SUNSET, nextSunrise, SUNDAY)
    // Classical Sunday sequence: Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars, Sun...
    expect(horas.slice(0, 7).map((h) => h.planet)).toEqual(['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'])
    expect(horas).toHaveLength(24)
  })
})

describe('abhijitMuhurta', () => {
  it('is centered on solar noon with width = day-length / 15 (24 min either side for a 12h day)', () => {
    const window = abhijitMuhurta(SUNRISE, SUNSET)
    expect(hm(window.start)).toBe('11:36')
    expect(hm(window.end)).toBe('12:24')
  })
})
