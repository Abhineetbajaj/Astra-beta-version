/** Pythagorean letter-value table — A-Z mapped 1-9 sequentially, wrapping every 9 letters. A
 * fixed mathematical constant (not "content"), so it's hard-coded explicitly rather than derived,
 * matching the table as commonly published (A/J/S=1 … H/Q/Z=8). */
export const PYTHAGOREAN_LETTER_VALUES: Record<string, number> = {
  A: 1, J: 1, S: 1,
  B: 2, K: 2, T: 2,
  C: 3, L: 3, U: 3,
  D: 4, M: 4, V: 4,
  E: 5, N: 5, W: 5,
  F: 6, O: 6, X: 6,
  G: 7, P: 7, Y: 7,
  H: 8, Q: 8, Z: 8,
  I: 9, R: 9,
}

/**
 * Phase 2 — not wired into computeCoreNumbers yet. Chaldean assigns letters by sound vibration,
 * 1-8 only; 9 is held sacred and never assigned to a letter. Scaffolded now so the `system`
 * architecture (see types.ts) never needs a breaking change once Chaldean support is built.
 */
export const CHALDEAN_LETTER_VALUES: Record<string, number> = {
  A: 1, I: 1, J: 1, Q: 1, Y: 1,
  B: 2, K: 2, R: 2,
  C: 3, G: 3, L: 3, S: 3,
  D: 4, M: 4, T: 4,
  E: 5, H: 5, N: 5, X: 5,
  U: 6, V: 6, W: 6,
  O: 7, Z: 7,
  F: 8, P: 8,
}
