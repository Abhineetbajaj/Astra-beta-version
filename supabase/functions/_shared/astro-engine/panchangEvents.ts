// Deno copy of src/astro-engine/panchangEvents.ts — keep in sync; do not diverge silently.

import { tropicalLongitude } from './ephemeris.ts'
import { lahiriAyanamsaDeg, toSidereal } from './ayanamsa.ts'
import { rashiForLongitude } from '../data/rashis.ts'
import { computePanchang } from './panchang.ts'

export type PanchangEventName = 'Ekadashi' | 'Amavasya' | 'Purnima' | 'Sankranti' | 'Navratri'

export interface PanchangEvent {
  event: PanchangEventName
  date: Date
}

function sunSiderealRashiIndex(date: Date): number {
  const ayanamsa = lahiriAyanamsaDeg(date)
  const sidereal = toSidereal(tropicalLongitude('Sun', date), ayanamsa)
  return rashiForLongitude(sidereal).index
}

export function detectPanchangEvents(fromDate: Date, days: number): PanchangEvent[] {
  const events: PanchangEvent[] = []

  for (let i = 0; i < days; i++) {
    const date = new Date(fromDate.getTime() + i * 86_400_000)
    const panchang = computePanchang(date)

    if (panchang.tithi.name === 'Ekadashi') events.push({ event: 'Ekadashi', date })
    if (panchang.tithi.name === 'Amavasya') events.push({ event: 'Amavasya', date })
    if (panchang.tithi.name === 'Purnima') events.push({ event: 'Purnima', date })

    const prevDate = new Date(date.getTime() - 86_400_000)
    if (sunSiderealRashiIndex(date) !== sunSiderealRashiIndex(prevDate)) {
      events.push({ event: 'Sankranti', date })
    }

    const month = date.getUTCMonth() + 1 // 1-12
    if (panchang.tithi.index === 0 && [3, 4, 9, 10].includes(month)) {
      events.push({ event: 'Navratri', date })
    }
  }

  return events
}
