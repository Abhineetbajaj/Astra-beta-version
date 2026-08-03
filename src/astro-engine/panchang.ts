import { tropicalLongitude } from '@/astro-engine/ephemeris'
import { lahiriAyanamsaDeg, toSidereal } from '@/astro-engine/ayanamsa'
import { nakshatraForLongitude } from '@/data/nakshatras'

/**
 * Panchang ("five limbs") — Tithi, Vara, Nakshatra, Yoga, Karana are the classical set; this
 * computes the four that don't require a specific location's sunrise time (Karana is a simple
 * half-tithi derivative of Tithi and is a reasonable v1 omission — see note below). All four use
 * the same real ephemeris + Lahiri ayanamsa pipeline as the natal chart engine, not templated data.
 *
 * Simplification, documented rather than hidden: Vara (weekday) traditionally runs sunrise-to-
 * sunrise at a specific location; this uses the UTC calendar date's weekday instead, which can be
 * off by one for date/times close to midnight at far-from-UTC longitudes. Tithi/Nakshatra/Yoga are
 * geocentric and unaffected by location.
 */

const TITHI_NAMES = [
  'Pratipada', 'Dvitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami',
  'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
]

const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti',
  'Shula', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata',
  'Variyana', 'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
]

const VARA_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export interface Panchang {
  date: Date
  vara: string
  tithi: { index: number; name: string; paksha: 'Shukla' | 'Krishna' }
  nakshatra: { index: number; name: string }
  yoga: { index: number; name: string }
}

export function computePanchang(date: Date): Panchang {
  const sunTropical = tropicalLongitude('Sun', date)
  const moonTropical = tropicalLongitude('Moon', date)
  const ayanamsa = lahiriAyanamsaDeg(date)
  const sunSidereal = toSidereal(sunTropical, ayanamsa)
  const moonSidereal = toSidereal(moonTropical, ayanamsa)

  const tithiRaw = (((moonSidereal - sunSidereal) % 360) + 360) % 360
  const tithiNumber = Math.floor(tithiRaw / 12) // 0-29, one lunar month
  const paksha: 'Shukla' | 'Krishna' = tithiNumber < 15 ? 'Shukla' : 'Krishna'
  const tithiInPaksha = tithiNumber % 15 // 0-14
  const tithiName = tithiInPaksha === 14 ? (paksha === 'Shukla' ? 'Purnima' : 'Amavasya') : TITHI_NAMES[tithiInPaksha]

  const nakshatra = nakshatraForLongitude(moonSidereal)

  const yogaRaw = ((sunSidereal + moonSidereal) % 360 + 360) % 360
  const yogaIndex = Math.min(Math.floor(yogaRaw / (360 / 27)), 26)

  return {
    date,
    vara: VARA_NAMES[date.getUTCDay()],
    tithi: { index: tithiNumber, name: tithiName, paksha },
    nakshatra: { index: nakshatra.index, name: nakshatra.name },
    yoga: { index: yogaIndex, name: YOGA_NAMES[yogaIndex] },
  }
}
