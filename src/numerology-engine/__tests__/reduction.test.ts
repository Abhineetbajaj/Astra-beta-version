import { describe, it, expect } from 'vitest'
import { reduceToSingleDigitOrMaster } from '@/numerology-engine/reduction'

describe('reduceToSingleDigitOrMaster', () => {
  it('stops at an intermediate master number rather than reducing further', () => {
    // 3+8=11 — a master number — so this stops at 11, it does not continue on to 1+1=2.
    expect(reduceToSingleDigitOrMaster(38)).toBe(11)
    // 2+9=11 — same case via a different starting total.
    expect(reduceToSingleDigitOrMaster(29)).toBe(11)
  })

  it('reduces all the way to a single digit when no master appears along the way', () => {
    // 2+4=6, single digit, done.
    expect(reduceToSingleDigitOrMaster(24)).toBe(6)
  })

  it('passes an already-master number straight through', () => {
    expect(reduceToSingleDigitOrMaster(11)).toBe(11)
    expect(reduceToSingleDigitOrMaster(22)).toBe(22)
    expect(reduceToSingleDigitOrMaster(33)).toBe(33)
  })

  it('leaves a single digit unchanged', () => {
    expect(reduceToSingleDigitOrMaster(7)).toBe(7)
  })
})
