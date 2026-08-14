// Deno copy of src/numerology-engine/personalCycles.ts — keep in sync; do not diverge silently.

import { isMasterNumber, reduceToSingleDigitOrMaster } from './reduction.ts'
import type { NumberResult, NumerologySystem, PersonalCycles } from './types.ts'

function toResult(value: number, system: NumerologySystem): NumberResult {
  return { value, isMaster: isMasterNumber(value), system }
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function personalYearNumber(
  dateOfBirth: string,
  targetDate: Date,
  system: NumerologySystem = 'pythagorean',
): NumberResult {
  const [, birthMonth, birthDay] = dateOfBirth.split('-').map(Number)
  const base = reduceToSingleDigitOrMaster(birthMonth + birthDay)
  const value = reduceToSingleDigitOrMaster(base + targetDate.getUTCFullYear())
  return toResult(value, system)
}

export function personalMonthNumber(
  dateOfBirth: string,
  targetDate: Date,
  system: NumerologySystem = 'pythagorean',
): NumberResult {
  const personalYear = personalYearNumber(dateOfBirth, targetDate, system)
  const value = reduceToSingleDigitOrMaster(personalYear.value + (targetDate.getUTCMonth() + 1))
  return toResult(value, system)
}

export function personalDayNumber(
  dateOfBirth: string,
  targetDate: Date,
  system: NumerologySystem = 'pythagorean',
): NumberResult {
  const personalMonth = personalMonthNumber(dateOfBirth, targetDate, system)
  const value = reduceToSingleDigitOrMaster(personalMonth.value + targetDate.getUTCDate())
  return toResult(value, system)
}

export function computePersonalCycles(
  dateOfBirth: string,
  targetDate: Date,
  system: NumerologySystem = 'pythagorean',
): PersonalCycles {
  return {
    personalYear: personalYearNumber(dateOfBirth, targetDate, system),
    personalMonth: personalMonthNumber(dateOfBirth, targetDate, system),
    personalDay: personalDayNumber(dateOfBirth, targetDate, system),
    asOfDate: toISODate(targetDate),
  }
}
