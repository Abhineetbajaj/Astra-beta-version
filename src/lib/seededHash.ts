/** Deterministic string hash (djb2-ish) — used to pick "random-looking" but stable content. */
export function seededHash(seed: string): number {
  let hash = 5381
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33) ^ seed.charCodeAt(i)
  }
  return Math.abs(hash)
}

export function pick<T>(items: readonly T[], seed: string): T {
  return items[seededHash(seed) % items.length]
}

/** YYYY-MM-DD in the local timezone — used so "today" is stable across a single day. */
export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
