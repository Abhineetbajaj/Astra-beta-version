// Deno copy of src/numerology-engine/reduction.ts — keep in sync; do not diverge silently.

function sumDigits(n: number): number {
  return String(Math.abs(n))
    .split('')
    .reduce((total, digit) => total + Number(digit), 0)
}

export function reduceToSingleDigitOrMaster(n: number): number {
  let value = n
  while (value > 9 && value !== 11 && value !== 22 && value !== 33) {
    value = sumDigits(value)
  }
  return value
}

export function isMasterNumber(n: number): boolean {
  return n === 11 || n === 22 || n === 33
}
