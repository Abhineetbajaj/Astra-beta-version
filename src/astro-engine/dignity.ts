import type { Dignity, PlanetId } from '@/astro-engine/types'

interface DignityRule {
  exaltedRashi: number
  debilitatedRashi: number
  ownRashis: number[]
}

/**
 * Classical exaltation/debilitation/own-sign rules for the 7 grahas with settled,
 * cross-tradition-agreed dignities. Rahu/Ketu dignity is disputed across schools
 * (varies by tradition), so it's deliberately left out rather than asserting a
 * contested rule — they always classify as 'neutral'.
 */
const DIGNITY_RULES: Partial<Record<PlanetId, DignityRule>> = {
  Sun: { exaltedRashi: 0, debilitatedRashi: 6, ownRashis: [4] }, // Aries / Libra / Leo
  Moon: { exaltedRashi: 1, debilitatedRashi: 7, ownRashis: [3] }, // Taurus / Scorpio / Cancer
  Mars: { exaltedRashi: 9, debilitatedRashi: 3, ownRashis: [0, 7] }, // Capricorn / Cancer / Aries+Scorpio
  Mercury: { exaltedRashi: 5, debilitatedRashi: 11, ownRashis: [2, 5] }, // Virgo / Pisces / Gemini+Virgo
  Jupiter: { exaltedRashi: 3, debilitatedRashi: 9, ownRashis: [8, 11] }, // Cancer / Capricorn / Sag+Pisces
  Venus: { exaltedRashi: 11, debilitatedRashi: 5, ownRashis: [1, 6] }, // Pisces / Virgo / Taurus+Libra
  Saturn: { exaltedRashi: 6, debilitatedRashi: 0, ownRashis: [9, 10] }, // Libra / Aries / Capricorn+Aquarius
}

export function dignityFor(planet: PlanetId, rashiIndex: number): Dignity {
  const rule = DIGNITY_RULES[planet]
  if (!rule) return 'neutral'
  if (rashiIndex === rule.exaltedRashi) return 'exalted'
  if (rashiIndex === rule.debilitatedRashi) return 'debilitated'
  if (rule.ownRashis.includes(rashiIndex)) return 'own'
  return 'neutral'
}
