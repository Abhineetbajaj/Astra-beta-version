// Deno copy of src/numerology-engine/vedic.ts — keep in sync; do not diverge silently.

import { CHALDEAN_LETTER_VALUES } from './letterValues.ts'
import { isMasterNumber, reduceToSingleDigitOrMaster } from './reduction.ts'
import type { NumberResult } from './types.ts'

export function mulankNumber(dateOfBirth: string): number {
  const day = Number(dateOfBirth.split('-')[2])
  return reduceToSingleDigitOrMaster(day)
}

export function bhagyankNumber(dateOfBirth: string): number {
  const digits = dateOfBirth.replace(/-/g, '')
  const total = digits.split('').reduce((sum, d) => sum + Number(d), 0)
  return reduceToSingleDigitOrMaster(total)
}

export function namankNumber(fullName: string): NumberResult {
  const letters = fullName.toUpperCase().replace(/[^A-Z]/g, '')
  let total = 0
  for (const letter of letters) {
    total += CHALDEAN_LETTER_VALUES[letter] ?? 0
  }
  const value = reduceToSingleDigitOrMaster(total)
  return { value, isMaster: isMasterNumber(value), system: 'vedic' }
}

export function loShuGrid(dateOfBirth: string): Record<number, number> {
  const digits = dateOfBirth.replace(/-/g, '').split('').map(Number)
  const grid: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
  for (const d of digits) {
    if (d >= 1 && d <= 9) grid[d]++
  }
  return grid
}

export function missingNumbers(grid: Record<number, number>): number[] {
  return Object.entries(grid)
    .filter(([, count]) => count === 0)
    .map(([n]) => Number(n))
    .sort((a, b) => a - b)
}

const MISSING_NUMBER_NOTES: Record<number, string> = {
  1: 'Self-confidence and independence may need conscious building rather than coming naturally.',
  2: 'Diplomacy and emotional sensitivity are growth areas, not fixed weaknesses.',
  3: 'Creative self-expression may take deliberate practice to unlock.',
  4: 'Structure and follow-through benefit from extra scaffolding — routines, checklists, systems.',
  5: 'Adaptability to change may take conscious effort rather than coming instinctively.',
  6: 'Domestic responsibility and caretaking are learned skills here, not automatic ones.',
  7: 'Introspection and analytical depth may need deliberate quiet time carved out.',
  8: 'Financial and material discipline benefit from explicit planning rather than instinct.',
  9: 'Compassion for people outside your immediate circle may take conscious cultivation.',
}

export function noteForMissingNumber(n: number): string {
  return MISSING_NUMBER_NOTES[n] ?? ''
}
