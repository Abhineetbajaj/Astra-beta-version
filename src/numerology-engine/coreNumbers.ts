import { expressionNumber, personalityNumber, soulUrgeNumber } from './nameNumbers'
import { isMasterNumber, reduceToSingleDigitOrMaster } from './reduction'
import type { CoreNumbers, NumberResult, NumerologySystem } from './types'

function parseDateParts(dateOfBirth: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateOfBirth.split('-').map(Number)
  return { year, month, day }
}

/**
 * Reduce month, day, and year each separately (preserving a master number if the raw
 * calendar value or an intermediate digit-sum lands on 11/22/33), then add the three
 * reduced parts and reduce once more. This is the standard Pythagorean formula — not a
 * simpler "sum every digit of the date at once" shortcut, which can disagree with this
 * method whenever a component would otherwise pass through a master number.
 */
export function lifePathNumber(dateOfBirth: string, system: NumerologySystem = 'pythagorean'): NumberResult {
  const { year, month, day } = parseDateParts(dateOfBirth)
  const reducedMonth = reduceToSingleDigitOrMaster(month)
  const reducedDay = reduceToSingleDigitOrMaster(day)
  const reducedYear = reduceToSingleDigitOrMaster(year)
  const value = reduceToSingleDigitOrMaster(reducedMonth + reducedDay + reducedYear)
  return { value, isMaster: isMasterNumber(value), system }
}

/** The day of the month you were born, reduced (11/22 kept as master since both are valid days). */
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
