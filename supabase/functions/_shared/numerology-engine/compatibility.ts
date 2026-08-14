// Deno copy of src/numerology-engine/compatibility.ts — keep in sync; do not diverge silently.

import { meaningForNumber } from '../data/numerologyMeanings.ts'
import type { CoreNumbers } from './types.ts'

export type CompatibilityVerdict = 'harmonious' | 'neutral' | 'challenging'

const POINTS: Record<CompatibilityVerdict, number> = { harmonious: 2, neutral: 1, challenging: 0 }
const MAX_PER_DIMENSION = 2

function classifyPair(a: number, b: number): CompatibilityVerdict {
  const meaningA = meaningForNumber(a)
  if (meaningA.compatibility.mostHarmonious.includes(b)) return 'harmonious'
  if (meaningA.compatibility.mostChallenging.includes(b)) return 'challenging'
  const meaningB = meaningForNumber(b)
  if (meaningB.compatibility.mostHarmonious.includes(a)) return 'harmonious'
  if (meaningB.compatibility.mostChallenging.includes(a)) return 'challenging'
  return 'neutral'
}

export interface CompatibilityDimension {
  key: 'lifePath' | 'expression' | 'soulUrge'
  label: string
  valueA: number
  valueB: number
  verdict: CompatibilityVerdict
  points: number
  max: number
}

export interface NumerologyCompatibility {
  dimensions: CompatibilityDimension[]
  total: number
  max: number
}

const DIMENSIONS: { key: CompatibilityDimension['key']; label: string }[] = [
  { key: 'lifePath', label: 'Life Path' },
  { key: 'expression', label: 'Expression' },
  { key: 'soulUrge', label: 'Soul Urge' },
]

export function computeNumerologyCompatibility(a: CoreNumbers, b: CoreNumbers): NumerologyCompatibility {
  const dimensions = DIMENSIONS.map(({ key, label }) => {
    const valueA = a[key].value
    const valueB = b[key].value
    const verdict = classifyPair(valueA, valueB)
    return { key, label, valueA, valueB, verdict, points: POINTS[verdict], max: MAX_PER_DIMENSION }
  })
  return {
    dimensions,
    total: dimensions.reduce((sum, d) => sum + d.points, 0),
    max: dimensions.reduce((sum, d) => sum + d.max, 0),
  }
}
