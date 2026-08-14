/** Which numerology system produced a result. Only 'pythagorean' is wired up so far — 'chaldean'
 * and 'vedic' exist in the type now so the UI/DB never need a breaking change once those ship.
 * The three systems disagree on letter values and outputs, so every result carries its own
 * `system` — never render a bare number without saying which system produced it. */
export type NumerologySystem = 'pythagorean' | 'chaldean' | 'vedic'

export interface NumberResult {
  value: number
  isMaster: boolean
  system: NumerologySystem
}

export interface CoreNumbers {
  system: NumerologySystem
  lifePath: NumberResult
  expression: NumberResult
  soulUrge: NumberResult
  personality: NumberResult
  birthday: NumberResult
}

export interface PersonalCycles {
  personalYear: NumberResult
  personalMonth: NumberResult
  personalDay: NumberResult
  /** ISO date (YYYY-MM-DD) the cycles were computed for. */
  asOfDate: string
}
