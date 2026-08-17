import { describe, it, expect } from 'vitest'
import { bhagyankNumber, loShuGrid, missingNumbers, mulankNumber, namankNumber } from '@/numerology-engine/vedic'

describe('mulankNumber / bhagyankNumber', () => {
  it('Mulank is the day of birth alone, reduced (master days kept)', () => {
    expect(mulankNumber('1990-06-22')).toBe(22) // master, kept
    expect(mulankNumber('1990-06-15')).toBe(6) // 1+5=6
  })

  it('Bhagyank sums every digit of the date at once (not per-component like Life Path)', () => {
    // 1990-11-29 → digits 1,9,9,0,1,1,2,9 → sum 32 → 3+2=5
    expect(bhagyankNumber('1990-11-29')).toBe(5)
  })
})

describe('namankNumber', () => {
  it('uses Chaldean-style letter values, all letters summed (no vowel/consonant split)', () => {
    // ADA (Chaldean): A=1, D=4, A=1 → 6
    expect(namankNumber('ADA').value).toBe(6)
  })

  it('preserves a master number the same way every other calculator does', () => {
    // ANN (Chaldean): A=1, N=5, N=5 → 11, a master number
    const result = namankNumber('ANN')
    expect(result.value).toBe(11)
    expect(result.isMaster).toBe(true)
  })
})

describe('loShuGrid / missingNumbers', () => {
  it('builds a digit-frequency grid from the birth date and finds absent numbers', () => {
    // 1990-11-29 → digits 1,9,9,0,1,1,2,9 → 1 appears 3x, 2 appears 1x, 9 appears 3x, rest absent
    const grid = loShuGrid('1990-11-29')
    expect(grid[1]).toBe(3)
    expect(grid[2]).toBe(1)
    expect(grid[9]).toBe(3)
    expect(missingNumbers(grid)).toEqual([3, 4, 5, 6, 7, 8])
  })
})
