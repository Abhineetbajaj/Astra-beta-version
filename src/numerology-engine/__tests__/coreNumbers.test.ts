import { describe, it, expect } from 'vitest'
import { lifePathNumber, birthdayNumber } from '@/numerology-engine/coreNumbers'

describe('lifePathNumber', () => {
  it('reduces month/day/year separately, then combines — non-master final result', () => {
    // DOB 1990-11-29, hand-worked:
    //   month 11 (November) is itself a master number → kept as 11
    //   day   29 → 2+9=11, a master number → kept as 11
    //   year  1990 → 1+9+9+0=19 → 1+9=10 → 1+0=1 (no master along this path) → 1
    //   11 + 11 + 1 = 23 → 2+3=5
    // Two master intermediates (11 and 11) still collapse to a non-master final digit —
    // proving the master check happens per reduction pass, not "any master anywhere forces
    // the final result to stay a master."
    const result = lifePathNumber('1990-11-29')
    expect(result.value).toBe(5)
    expect(result.isMaster).toBe(false)
  })

  it('preserves a master number that survives all the way to the final total', () => {
    // DOB 1969-11-29, hand-worked:
    //   month 11 → kept as 11
    //   day   29 → 2+9=11 → kept as 11
    //   year  1969 → 1+9+6+9=25 → 2+5=7
    //   11 + 11 + 7 = 29 → 2+9=11, a master number → kept as 11
    const result = lifePathNumber('1969-11-29')
    expect(result.value).toBe(11)
    expect(result.isMaster).toBe(true)
  })
})

describe('birthdayNumber', () => {
  it('reduces an ordinary day of month to a single digit', () => {
    expect(birthdayNumber('1990-06-15').value).toBe(6) // 1+5=6
  })

  it('keeps a master day of month (11 or 22) unreduced', () => {
    expect(birthdayNumber('1990-06-22')).toMatchObject({ value: 22, isMaster: true })
    expect(birthdayNumber('1990-06-11')).toMatchObject({ value: 11, isMaster: true })
  })
})
