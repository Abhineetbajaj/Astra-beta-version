import { PYTHAGOREAN_LETTER_VALUES } from './letterValues'
import { isMasterNumber, reduceToSingleDigitOrMaster } from './reduction'
import type { NumberResult, NumerologySystem } from './types'

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U'])

function normalizeLetters(fullName: string): string {
  return fullName.toUpperCase().replace(/[^A-Z]/g, '')
}

/**
 * Y counts as a vowel only when it isn't adjacent to another vowel letter (immediately before or
 * after) in the name — the standard heuristic most Pythagorean calculators use to approximate "Y
 * supplies the vowel sound in this syllable" without a real syllable parser. Classifies the
 * report's own reference examples correctly (Bryn, Kylie, Gypsy) but is a genuine simplification,
 * documented rather than silently assumed — same honesty convention as the astro-engine's guna.ts.
 */
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

/** All letters of the full name — how you present yourself to the world. */
export function expressionNumber(fullName: string, system: NumerologySystem = 'pythagorean'): NumberResult {
  const letters = normalizeLetters(fullName)
  return toResult(sumLetters(letters, system, () => true), system)
}

/** Vowels only — your inner motivation, what you want at your core. */
export function soulUrgeNumber(fullName: string, system: NumerologySystem = 'pythagorean'): NumberResult {
  const letters = normalizeLetters(fullName)
  return toResult(sumLetters(letters, system, isVowel), system)
}

/** Consonants only — the personality you present before anyone knows you well. */
export function personalityNumber(fullName: string, system: NumerologySystem = 'pythagorean'): NumberResult {
  const letters = normalizeLetters(fullName)
  return toResult(sumLetters(letters, system, (l, i) => !isVowel(l, i)), system)
}
