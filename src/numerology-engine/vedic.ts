// Phase 2 — not called by computeCoreNumbers yet. Scaffolded now so the `system` architecture
// (see types.ts) never needs a breaking change once this ships.
//
// Vedic/Indian numerology ties Mulank (birth-day reduced — the "psychic"/driver number) and
// Bhagyank (full date-of-birth reduced — the "destiny"/conductor number, equivalent to a
// Pythagorean-style Life Path) to the Navagraha (nine planets), and reads a Lo Shu grid built
// from the digit-frequency of the birth date across a fixed 3x3 layout.
import { reduceToSingleDigitOrMaster } from './reduction'

/** Mulank (Moolank) — the day of birth alone, reduced. Also called the Psychic/Driver number. */
export function mulankNumber(dateOfBirth: string): number {
  const day = Number(dateOfBirth.split('-')[2])
  return reduceToSingleDigitOrMaster(day)
}

/** Bhagyank — the full birth date reduced. Also called the Destiny/Conductor number. */
export function bhagyankNumber(dateOfBirth: string): number {
  const digits = dateOfBirth.replace(/-/g, '')
  const total = digits.split('').reduce((sum, d) => sum + Number(d), 0)
  return reduceToSingleDigitOrMaster(total)
}

/** Digit-frequency grid from the birth date, positioned per the fixed Lo Shu 3x3 layout (1-9). */
export function loShuGrid(dateOfBirth: string): Record<number, number> {
  const digits = dateOfBirth.replace(/-/g, '').split('').map(Number)
  const grid: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
  for (const d of digits) {
    if (d >= 1 && d <= 9) grid[d]++
  }
  return grid
}
