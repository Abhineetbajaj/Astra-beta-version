import { describe, it, expect } from 'vitest'
import { expressionNumber, personalityNumber, soulUrgeNumber } from '@/numerology-engine/nameNumbers'
import { chaldeanCompoundExpressionNumber, meaningForCompound } from '@/numerology-engine/chaldean'

describe('name numbers (Chaldean)', () => {
  it('computes Expression/Soul Urge/Personality using Chaldean letter values', () => {
    // ADA (Chaldean): A=1, D=4, A=1
    expect(expressionNumber('ADA', 'chaldean').value).toBe(6) // 1+4+1=6
    expect(soulUrgeNumber('ADA', 'chaldean').value).toBe(2) // vowels A,A: 1+1=2
    expect(personalityNumber('ADA', 'chaldean').value).toBe(4) // consonant D: 4
  })
})

describe('chaldeanCompoundExpressionNumber', () => {
  it('keeps a compound total that already falls in the 10-52 range', () => {
    // JOHN (Chaldean): J=1, O=7, H=5, N=5 → 18, already within 10-52, no sum-down needed.
    const result = chaldeanCompoundExpressionNumber('JOHN')
    expect(result.compound).toBe(18)
    expect(result.root.value).toBe(9) // 1+8=9
    expect(meaningForCompound(18)?.title).toBe('Discord')
  })

  it('sums a total above 52 down, per Cheiro\'s canon (10-52 only)', () => {
    // "CHRISTOPHER WONDERFUL" (Chaldean, spaces stripped):
    //   CHRISTOPHER: C3 H5 R2 I1 S3 T4 O7 P8 H5 E5 R2 = 45
    //   WONDERFUL:   W6 O7 N5 D4 E5 R2 F8 U6 L3 = 46
    //   total = 91 → above 52 → digit-summed once: 9+1=10 (lands in the compound range)
    const result = chaldeanCompoundExpressionNumber('CHRISTOPHER WONDERFUL')
    expect(result.compound).toBe(10)
    expect(result.root.value).toBe(1) // 1+0=1
    expect(meaningForCompound(10)?.title).toBe('The Wheel of Fortune')
  })
})
