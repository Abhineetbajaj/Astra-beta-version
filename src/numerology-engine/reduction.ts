function sumDigits(n: number): number {
  return String(Math.abs(n))
    .split('')
    .reduce((total, digit) => total + Number(digit), 0)
}

/**
 * The one shared reduction rule every calculator in this engine goes through — never
 * reimplemented per-number. Sums digits in passes, checking after EACH pass whether the
 * intermediate is a master number (11, 22, 33) and stopping there rather than only checking the
 * final total. This matters: an intermediate 29 reduces to 11 and stops — it does not continue on
 * to 2 just because 11 itself has more than one digit.
 */
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
