// Deno copy of src/numerology-engine/types.ts — keep in sync; do not diverge silently.

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
  asOfDate: string
}
