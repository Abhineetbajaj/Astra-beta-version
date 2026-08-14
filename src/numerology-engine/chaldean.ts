// Phase 2 — not called by computeCoreNumbers yet. Scaffolded now so the `system` architecture
// (see types.ts) never needs a breaking change once this ships.
//
// Chaldean's distinctive layer beyond a root number: the compound (double-digit, 10-52) total of
// a name is never discarded — both the compound and its reduced root get read. Per Cheiro's
// canon (The Book of Numbers, 1926/1935), compound meanings are codified 10-52 only; totals above
// 52 are summed down, and digit-reversal shortcuts (treating 12 as equivalent to 21) are
// incorrect — each compound has its own distinct meaning.
import { CHALDEAN_LETTER_VALUES } from './letterValues'

export interface CompoundNumberMeaning {
  compound: number
  title: string
  summary: string
}

/** Seed shape only — the 10-52 meaning table itself is Phase 2 content work, not architecture. */
export const CHALDEAN_COMPOUND_MEANINGS: Record<number, CompoundNumberMeaning> = {}

export function chaldeanCompoundTotal(fullName: string): number {
  const letters = fullName.toUpperCase().replace(/[^A-Z]/g, '')
  let total = 0
  for (const letter of letters) {
    total += CHALDEAN_LETTER_VALUES[letter] ?? 0
  }
  return total
}
