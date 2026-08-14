import { describe, it, expect } from 'vitest'
import { expressionNumber, personalityNumber, soulUrgeNumber } from '@/numerology-engine/nameNumbers'

describe('name numbers (Pythagorean)', () => {
  it('computes Expression/Soul Urge/Personality for a simple name', () => {
    // ADA: A=1, D=4, A=1
    expect(expressionNumber('ADA').value).toBe(6) // 1+4+1=6
    expect(soulUrgeNumber('ADA').value).toBe(2) // vowels A,A: 1+1=2
    expect(personalityNumber('ADA').value).toBe(4) // consonant D: 4
  })

  it('preserves a master number produced by a name sum', () => {
    // ANN: A=1, N=5, N=5 → 11, a master number, no Y-ambiguity to complicate it.
    const result = expressionNumber('ANN')
    expect(result.value).toBe(11)
    expect(result.isMaster).toBe(true)
  })
})

describe('Y vowel/consonant heuristic', () => {
  it('treats Y as a vowel when it has no adjacent vowel letter', () => {
    // Bryn: B-R-Y-N — Y is flanked by consonants on both sides, so it supplies the vowel sound.
    expect(soulUrgeNumber('BRYN').value).not.toBe(0)
    // Direct check via Personality (consonants only) excluding Y confirms Y was classified as a vowel:
    // B(2)+R(9)+N(5)=16→7, vs Expression B+R+Y+N = 2+9+7+5=23→5. If Y were a consonant instead,
    // Personality would include it and no longer equal 7.
    expect(personalityNumber('BRYN').value).toBe(7)
  })

  it('treats Y as a consonant when adjacent to another vowel', () => {
    // "DYE": Y sits between D and E — E is an adjacent vowel, so Y is a consonant here.
    // Soul Urge (vowels only) should be just E=5.
    expect(soulUrgeNumber('DYE').value).toBe(5)
  })
})
