// Headline copy for the shareable compatibility card, keyed by score band — deterministic, not
// AI-generated, so the share flow stays instant and free (no Gemini call for a card that's meant
// to be generated and shared in the same tap).

export interface CompatibilityVerdict {
  headline: string
  blurb: string
}

/** `total`/`max` come straight from computeNumerologyCompatibility() — max is currently 6 (3 dimensions x 2 points). */
export function verdictForScore(total: number, max: number): CompatibilityVerdict {
  const ratio = total / max
  if (ratio >= 0.83) {
    return { headline: 'Rare alignment', blurb: 'Your numbers agree more often than not.' }
  }
  if (ratio >= 0.5) {
    return { headline: 'Real chemistry, real work', blurb: 'Strong where it counts, with edges worth navigating together.' }
  }
  return { headline: "Opposites — if you're both patient", blurb: 'Your numbers pull in different directions. That can still work.' }
}
