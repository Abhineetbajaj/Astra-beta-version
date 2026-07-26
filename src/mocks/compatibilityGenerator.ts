import type { NatalChart } from '@/astro-engine/types'
import { computeGunaScore, type GunaBreakdown } from '@/astro-engine'
import { pick } from '@/lib/seededHash'
import {
  SCORE_TIER_OPENING,
  BHAKOOT_NOTE,
  GANA_NOTE,
  NADI_NOTE,
  CLOSING_LINES,
} from '@/mocks/compatibilityTemplates'

export interface CompatibilityReading {
  breakdown: GunaBreakdown
  opening: string
  bhakootNote: string
  ganaNote: string
  nadiNote: string
  closing: string
}

function scoreTier(breakdown: GunaBreakdown): 'high' | 'medium' | 'low' {
  const ratio = breakdown.total / breakdown.max
  if (ratio >= 0.7) return 'high'
  if (ratio >= 0.4) return 'medium'
  return 'low'
}

export function generateCompatibilityReading(chartA: NatalChart, chartB: NatalChart): CompatibilityReading {
  const moonA = chartA.placements.find((p) => p.planet === 'Moon')!
  const moonB = chartB.placements.find((p) => p.planet === 'Moon')!

  const breakdown = computeGunaScore(moonA.siderealLongitude, moonB.siderealLongitude)
  const seed = `${chartA.birthMoment.getTime()}|${chartB.birthMoment.getTime()}`

  const ganaKey = breakdown.gana.points === 6 ? 'same' : breakdown.gana.points === 4 ? 'adjacent' : 'opposite'

  return {
    breakdown,
    opening: pick(SCORE_TIER_OPENING[scoreTier(breakdown)], `${seed}|opening`),
    bhakootNote: BHAKOOT_NOTE[breakdown.bhakoot.points > 0 ? 'full' : 'zero'],
    ganaNote: GANA_NOTE[ganaKey],
    nadiNote: NADI_NOTE[breakdown.nadi.points > 0 ? 'different' : 'same'],
    closing: pick(CLOSING_LINES, `${seed}|closing`),
  }
}
