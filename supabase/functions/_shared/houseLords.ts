import { RASHI_LORD } from './data/rashis.ts'

/** Whole-sign house-lord: the ruler of the sign that falls in `houseNumber` (1-12) from the ascendant. */
export function lordOfHouse(ascendantRashiIndex: number, houseNumber: number): string {
  const signIndex = (ascendantRashiIndex + houseNumber - 1) % 12
  return RASHI_LORD[signIndex]
}
