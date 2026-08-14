import { describe, it, expect } from 'vitest'
import { computeNumerologyCompatibility } from '@/numerology-engine/compatibility'
import type { CoreNumbers, NumberResult } from '@/numerology-engine/types'

function num(value: number): NumberResult {
  return { value, isMaster: value === 11 || value === 22 || value === 33, system: 'pythagorean' }
}

function core(lifePath: number, expression: number, soulUrge: number): CoreNumbers {
  return {
    system: 'pythagorean',
    lifePath: num(lifePath),
    expression: num(expression),
    soulUrge: num(soulUrge),
    personality: num(4),
    birthday: num(4),
  }
}

describe('computeNumerologyCompatibility', () => {
  it('scores a harmonious pair per NUMEROLOGY_MEANINGS (Life Path 5 + 3, "mostHarmonious" includes 3)', () => {
    const a = core(5, 5, 5)
    const b = core(3, 3, 3)
    const result = computeNumerologyCompatibility(a, b)
    const lifePath = result.dimensions.find((d) => d.key === 'lifePath')!
    expect(lifePath.verdict).toBe('harmonious')
    expect(lifePath.points).toBe(2)
  })

  it('scores a challenging pair per NUMEROLOGY_MEANINGS (Life Path 1 + 1, "mostChallenging" includes 1)', () => {
    const a = core(1, 1, 1)
    const b = core(1, 1, 1)
    const result = computeNumerologyCompatibility(a, b)
    const lifePath = result.dimensions.find((d) => d.key === 'lifePath')!
    expect(lifePath.verdict).toBe('challenging')
    expect(lifePath.points).toBe(0)
  })

  it('totals points across all 3 dimensions, max 6', () => {
    const a = core(5, 5, 5)
    const b = core(3, 3, 3)
    const result = computeNumerologyCompatibility(a, b)
    expect(result.dimensions).toHaveLength(3)
    expect(result.max).toBe(6)
    expect(result.total).toBe(result.dimensions.reduce((sum, d) => sum + d.points, 0))
  })
})
