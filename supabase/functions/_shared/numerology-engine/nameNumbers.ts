// Deno copy of src/numerology-engine/nameNumbers.ts — keep in sync; do not diverge silently.

import { PYTHAGOREAN_LETTER_VALUES } from './letterValues.ts'
import { isMasterNumber, reduceToSingleDigitOrMaster } from './reduction.ts'
import type { NumberResult, NumerologySystem } from './types.ts'

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U'])

function normalizeLetters(fullName: string): string {
  return fullName.toUpperCase().replace(/[^A-Z]/g, '')
}

function isVowel(letters: string, index: number): boolean {
  const ch = letters[index]
  if (VOWELS.has(ch)) return true
  if (ch !== 'Y') return false
  const prev = letters[index - 1]
  const next = letters[index + 1]
  const adjacentVowel = (prev !== undefined && VOWELS.has(prev)) || (next !== undefined && VOWELS.has(next))
  return !adjacentVowel
}

function valueFor(letter: string, system: NumerologySystem): number {
  if (system !== 'pythagorean') throw new Error(`Numerology system '${system}' is not yet supported.`)
  const value = PYTHAGOREAN_LETTER_VALUES[letter]
  if (value === undefined) throw new Error(`No Pythagorean value for letter '${letter}'`)
  return value
}

function sumLetters(
  letters: string,
  system: NumerologySystem,
  include: (letters: string, index: number) => boolean,
): number {
  let total = 0
  for (let i = 0; i < letters.length; i++) {
    if (include(letters, i)) total += valueFor(letters[i], system)
  }
  return total
}

function toResult(total: number, system: NumerologySystem): NumberResult {
  const value = reduceToSingleDigitOrMaster(total)
  return { value, isMaster: isMasterNumber(value), system }
}

export function expressionNumber(fullName: string, system: NumerologySystem = 'pythagorean'): NumberResult {
  const letters = normalizeLetters(fullName)
  return toResult(sumLetters(letters, system, () => true), system)
}

export function soulUrgeNumber(fullName: string, system: NumerologySystem = 'pythagorean'): NumberResult {
  const letters = normalizeLetters(fullName)
  return toResult(sumLetters(letters, system, isVowel), system)
}

export function personalityNumber(fullName: string, system: NumerologySystem = 'pythagorean'): NumberResult {
  const letters = normalizeLetters(fullName)
  return toResult(sumLetters(letters, system, (l, i) => !isVowel(l, i)), system)
}
