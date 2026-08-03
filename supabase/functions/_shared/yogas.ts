// Deterministic wealth-yoga detection against the seeded ref_yoga_definitions table. Covers 6
// classical combinations that are computable from placement math alone, without needing full
// graha-drishti (aspect) rules — same honesty stance as guna.ts's "3 of 8 kutas": documented
// scope, not claiming exhaustive classical coverage. Never invents a yoga; every result traces to
// placement math, and every rule choice (where classical sources disagree, e.g. Kubera Yoga) is
// documented inline so the specific formulation used is auditable.

import { RASHI_LORD } from './data/rashis.ts'
import type { PlanetPlacement } from './astro-engine/types.ts'

export type YogaKey =
  | 'dhana_yoga'
  | 'lakshmi_yoga'
  | 'guru_mangala_yoga'
  | 'kubera_yoga'
  | 'chandra_mangal_yoga'
  | 'gajakesari_yoga'

export interface DetectedYoga {
  key: YogaKey
  notes: string
}

const KENDRA_TRIKONA_HOUSES = new Set([1, 4, 5, 7, 9, 10])
/** Houses whose lords are classically checked for Dhana (wealth-combination) yogas. */
const DHANA_HOUSES = [2, 5, 9, 11]

function placementOf(placements: PlanetPlacement[], planet: string) {
  return placements.find((p) => p.planet === planet)
}

function lordOfHouse(ascendantRashiIndex: number, houseNumber: number): string {
  return RASHI_LORD[(ascendantRashiIndex + houseNumber - 1) % 12]
}

export function detectWealthYogas(placements: PlanetPlacement[], ascendantRashiIndex: number): DetectedYoga[] {
  const yogas: DetectedYoga[] = []

  // Dhana Yoga: any two of the 2nd/5th/9th/11th lords (wealth, speculation, fortune, gains)
  // conjunct in the same sign, or in mutual exchange (each sitting in the other's sign).
  const dhanaLords = DHANA_HOUSES.map((house) => ({
    house,
    sign: (ascendantRashiIndex + house - 1) % 12,
    lord: lordOfHouse(ascendantRashiIndex, house),
  }))
  for (let i = 0; i < dhanaLords.length; i++) {
    for (let j = i + 1; j < dhanaLords.length; j++) {
      const a = dhanaLords[i]
      const b = dhanaLords[j]
      if (a.lord === b.lord) continue // same planet rules two houses — not a conjunction of two different lords
      const pa = placementOf(placements, a.lord)
      const pb = placementOf(placements, b.lord)
      if (!pa || !pb) continue
      const conjunct = pa.rashiIndex === pb.rashiIndex
      const exchange = pa.rashiIndex === b.sign && pb.rashiIndex === a.sign
      if (conjunct || exchange) {
        yogas.push({
          key: 'dhana_yoga',
          notes: conjunct
            ? `${a.house}${ordinalSuffix(a.house)} lord (${a.lord}) and ${b.house}${ordinalSuffix(b.house)} lord (${b.lord}) conjunct in the same sign.`
            : `${a.house}${ordinalSuffix(a.house)} lord (${a.lord}) and ${b.house}${ordinalSuffix(b.house)} lord (${b.lord}) exchange signs.`,
        })
        break // one Dhana Yoga finding is enough signal; avoid near-duplicate entries from every pair
      }
    }
    if (yogas.some((y) => y.key === 'dhana_yoga')) break
  }

  const venus = placementOf(placements, 'Venus')
  if (venus && (venus.dignity === 'own' || venus.dignity === 'exalted') && venus.houseIndex && KENDRA_TRIKONA_HOUSES.has(venus.houseIndex)) {
    yogas.push({
      key: 'lakshmi_yoga',
      notes: `Venus ${venus.dignity} in house ${venus.houseIndex}.`,
    })
  }

  const jupiter = placementOf(placements, 'Jupiter')
  const mars = placementOf(placements, 'Mars')
  if (jupiter && mars && jupiter.rashiIndex === mars.rashiIndex) {
    yogas.push({
      key: 'guru_mangala_yoga',
      notes: `Jupiter and Mars conjunct in house ${jupiter.houseIndex ?? '?'}.`,
    })
  }

  // Kubera Yoga: classical sources give several distinct formulations (unlike Gajakesari below,
  // which is settled). This uses one commonly-cited version — 11th lord (gains) strong (own sign
  // or exalted) and placed in a kendra/trikona — and is deliberately not claimed as the only one.
  const eleventhLord = lordOfHouse(ascendantRashiIndex, 11)
  const eleventhLordPlacement = placementOf(placements, eleventhLord)
  if (
    eleventhLordPlacement &&
    (eleventhLordPlacement.dignity === 'own' || eleventhLordPlacement.dignity === 'exalted') &&
    eleventhLordPlacement.houseIndex &&
    KENDRA_TRIKONA_HOUSES.has(eleventhLordPlacement.houseIndex)
  ) {
    yogas.push({
      key: 'kubera_yoga',
      notes: `11th lord (${eleventhLord}) ${eleventhLordPlacement.dignity} in house ${eleventhLordPlacement.houseIndex}.`,
    })
  }

  // Chandra-Mangal Yoga: Moon and Mars conjunct in the same sign.
  const moon = placementOf(placements, 'Moon')
  if (moon && mars && moon.rashiIndex === mars.rashiIndex) {
    yogas.push({
      key: 'chandra_mangal_yoga',
      notes: `Moon and Mars conjunct in house ${moon.houseIndex ?? '?'}.`,
    })
  }

  // Gajakesari Yoga: Jupiter in a kendra (1st/4th/7th/10th) counted FROM THE MOON, not from the
  // ascendant — the standard, single classical formulation (unlike Kubera above).
  if (jupiter && moon) {
    const distanceFromMoon = ((jupiter.rashiIndex - moon.rashiIndex + 12) % 12) + 1
    if ([1, 4, 7, 10].includes(distanceFromMoon)) {
      yogas.push({
        key: 'gajakesari_yoga',
        notes: `Jupiter is ${distanceFromMoon}${ordinalSuffix(distanceFromMoon)} from natal Moon.`,
      })
    }
  }

  return yogas
}

function ordinalSuffix(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'st'
  if (n % 10 === 2 && n % 100 !== 12) return 'nd'
  if (n % 10 === 3 && n % 100 !== 13) return 'rd'
  return 'th'
}
