// Deno copy of src/numerology-engine/coreNumbers.ts — keep in sync; do not diverge silently.

import { expressionNumber, personalityNumber, soulUrgeNumber } from './nameNumbers.ts'
import { isMasterNumber, reduceToSingleDigitOrMaster } from './reduction.ts'
import type { CoreNumbers, NumberResult, NumerologySystem } from './types.ts'

function parseDateParts(dateOfBirth: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateOfBirth.split('-').map(Number)
  return { year, month, day }
}

export function lifePathNumber(dateOfBirth: string, system: NumerologySystem = 'pythagorean'): NumberResult {
  const { year, month, day } = parseDateParts(dateOfBirth)
  const reducedMonth = reduceToSingleDigitOrMaster(month)
  const reducedDay = reduceToSingleDigitOrMaster(day)
  const reducedYear = reduceToSingleDigitOrMaster(year)
  const value = reduceToSingleDigitOrMaster(reducedMonth + reducedDay + reducedYear)
  return { value, isMaster: isMasterNumber(value), system }
}

export function birthdayNumber(dateOfBirth: string, system: NumerologySystem = 'pythagorean'): NumberResult {
  const { day } = parseDateParts(dateOfBirth)
  const value = reduceToSingleDigitOrMaster(day)
  return { value, isMaster: isMasterNumber(value), system }
}

export function computeCoreNumbers(input: {
  fullName: string
  dateOfBirth: string
  system?: NumerologySystem
}): CoreNumbers {
  const system = input.system ?? 'pythagorean'
  return {
    system,
    lifePath: lifePathNumber(input.dateOfBirth, system),
    expression: expressionNumber(input.fullName, system),
    soulUrge: soulUrgeNumber(input.fullName, system),
    personality: personalityNumber(input.fullName, system),
    birthday: birthdayNumber(input.dateOfBirth, system),
  }
}
