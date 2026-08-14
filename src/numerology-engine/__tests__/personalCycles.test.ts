import { describe, it, expect } from 'vitest'
import { computePersonalCycles } from '@/numerology-engine/personalCycles'

describe('computePersonalCycles', () => {
  // Hand-worked against the reference example (birthday Sept 12, target Oct 12 2026):
  //   Personal Year: base = birthMonth(9) + birthDay(12) = 21 → 2+1=3
  //                  personalYear = 3 + targetYear(2026) = 2029 → 2+0+2+9=13 → 1+3=4
  //   Personal Month: personalYear(4) + targetMonth(10) = 14 → 1+4=5
  //   Personal Day:   personalMonth(5) + targetDay(12) = 17 → 1+7=8
  const dateOfBirth = '1990-09-12'
  const targetDate = new Date('2026-10-12T00:00:00Z')

  it('computes Personal Year/Month/Day matching the hand-worked example', () => {
    const cycles = computePersonalCycles(dateOfBirth, targetDate)
    expect(cycles.personalYear.value).toBe(4)
    expect(cycles.personalMonth.value).toBe(5)
    expect(cycles.personalDay.value).toBe(8)
    expect(cycles.asOfDate).toBe('2026-10-12')
  })

  it('does not use the birth year at all', () => {
    const a = computePersonalCycles('1975-09-12', targetDate)
    const b = computePersonalCycles('2005-09-12', targetDate)
    expect(a.personalYear.value).toBe(b.personalYear.value)
  })
})
