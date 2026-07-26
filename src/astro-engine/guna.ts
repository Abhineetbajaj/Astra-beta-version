import { nakshatraForLongitude } from '@/data/nakshatras'
import { rashiForLongitude } from '@/data/rashis'

/**
 * Simplified, symmetric compatibility scoring loosely inspired by the classical
 * Ashtakoot ("8-fold") system used in Vedic matchmaking. This intentionally covers
 * 3 of the 8 classical kutas (Bhakoot, Gana, Nadi) — the ones expressible as clean,
 * undisputed rules — rather than claiming full 36-point classical precision. The
 * other 5 kutas (Varna, Vashya, Tara, Yoni, Graha Maitri) rely on lookup tables and
 * conventions that vary across traditions/sources, so they're left out rather than
 * risking a subtly wrong table. Max score is 21, not 36 — always label it as such
 * in the UI ("simplified Ashtakoot-style score").
 */

const GANA: Record<string, 'Deva' | 'Manushya' | 'Rakshasa'> = {
  Ashwini: 'Deva', Mrigashira: 'Deva', Punarvasu: 'Deva', Pushya: 'Deva', Hasta: 'Deva',
  Swati: 'Deva', Anuradha: 'Deva', Shravana: 'Deva', Revati: 'Deva',
  Bharani: 'Manushya', Rohini: 'Manushya', Ardra: 'Manushya', 'Purva Phalguni': 'Manushya',
  'Uttara Phalguni': 'Manushya', 'Purva Ashadha': 'Manushya', 'Uttara Ashadha': 'Manushya',
  'Purva Bhadrapada': 'Manushya', 'Uttara Bhadrapada': 'Manushya',
  Krittika: 'Rakshasa', Ashlesha: 'Rakshasa', Magha: 'Rakshasa', Chitra: 'Rakshasa',
  Vishakha: 'Rakshasa', Jyeshtha: 'Rakshasa', Mula: 'Rakshasa', Dhanishta: 'Rakshasa',
  Shatabhisha: 'Rakshasa',
}

const NADI: Record<string, 'Aadi' | 'Madhya' | 'Antya'> = {
  Ashwini: 'Aadi', Ardra: 'Aadi', Punarvasu: 'Aadi', 'Uttara Phalguni': 'Aadi', Hasta: 'Aadi',
  Jyeshtha: 'Aadi', Mula: 'Aadi', Shatabhisha: 'Aadi', 'Purva Bhadrapada': 'Aadi',
  Bharani: 'Madhya', Mrigashira: 'Madhya', Pushya: 'Madhya', 'Purva Phalguni': 'Madhya',
  Chitra: 'Madhya', Anuradha: 'Madhya', 'Purva Ashadha': 'Madhya', Dhanishta: 'Madhya',
  'Uttara Bhadrapada': 'Madhya',
  Krittika: 'Antya', Rohini: 'Antya', Ashlesha: 'Antya', Magha: 'Antya', Swati: 'Antya',
  Vishakha: 'Antya', 'Uttara Ashadha': 'Antya', Shravana: 'Antya', Revati: 'Antya',
}

export interface GunaBreakdown {
  bhakoot: { points: number; max: 7 }
  gana: { points: number; max: 6 }
  nadi: { points: number; max: 8 }
  total: number
  max: 21
}

function bhakootPoints(rashiA: number, rashiB: number): number {
  const distance = ((rashiB - rashiA + 12) % 12) + 1 // 1-12
  const inauspicious = [2, 12, 6, 8, 5, 7].includes(distance)
  return inauspicious ? 0 : 7
}

function ganaPoints(nameA: string, nameB: string): number {
  const a = GANA[nameA]
  const b = GANA[nameB]
  if (a === b) return 6
  const opposite = (a === 'Deva' && b === 'Rakshasa') || (a === 'Rakshasa' && b === 'Deva')
  return opposite ? 0 : 4
}

function nadiPoints(nameA: string, nameB: string): number {
  return NADI[nameA] === NADI[nameB] ? 0 : 8
}

export function computeGunaScore(moonSiderealLonA: number, moonSiderealLonB: number): GunaBreakdown {
  const rashiA = rashiForLongitude(moonSiderealLonA).index
  const rashiB = rashiForLongitude(moonSiderealLonB).index
  const nakA = nakshatraForLongitude(moonSiderealLonA).name
  const nakB = nakshatraForLongitude(moonSiderealLonB).name

  const bhakoot = bhakootPoints(rashiA, rashiB)
  const gana = ganaPoints(nakA, nakB)
  const nadi = nadiPoints(nakA, nakB)

  return {
    bhakoot: { points: bhakoot, max: 7 },
    gana: { points: gana, max: 6 },
    nadi: { points: nadi, max: 8 },
    total: bhakoot + gana + nadi,
    max: 21,
  }
}
