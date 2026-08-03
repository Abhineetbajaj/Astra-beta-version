// Deno copy of src/astro-engine/dignity.ts — keep in sync; do not diverge silently.

import type { Dignity, PlanetId } from './types.ts'

interface DignityRule {
  exaltedRashi: number
  debilitatedRashi: number
  ownRashis: number[]
}

const DIGNITY_RULES: Partial<Record<PlanetId, DignityRule>> = {
  Sun: { exaltedRashi: 0, debilitatedRashi: 6, ownRashis: [4] },
  Moon: { exaltedRashi: 1, debilitatedRashi: 7, ownRashis: [3] },
  Mars: { exaltedRashi: 9, debilitatedRashi: 3, ownRashis: [0, 7] },
  Mercury: { exaltedRashi: 5, debilitatedRashi: 11, ownRashis: [2, 5] },
  Jupiter: { exaltedRashi: 3, debilitatedRashi: 9, ownRashis: [8, 11] },
  Venus: { exaltedRashi: 11, debilitatedRashi: 5, ownRashis: [1, 6] },
  Saturn: { exaltedRashi: 6, debilitatedRashi: 0, ownRashis: [9, 10] },
}

export function dignityFor(planet: PlanetId, rashiIndex: number): Dignity {
  const rule = DIGNITY_RULES[planet]
  if (!rule) return 'neutral'
  if (rashiIndex === rule.exaltedRashi) return 'exalted'
  if (rashiIndex === rule.debilitatedRashi) return 'debilitated'
  if (rule.ownRashis.includes(rashiIndex)) return 'own'
  return 'neutral'
}
