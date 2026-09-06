// A small schematic moon-phase glyph driven by the real, already-computed Tithi index (0-29,
// one full lunar month — see astro-engine/panchang.ts) rather than a decorative crescent picked
// for looks. Illumination is a standard cosine approximation over the lunar cycle: 0 at new moon
// (index 0), 1 at full moon (index ~15), back to 0 at the next new moon (index ~29/30).
//
// This is a simplified editorial icon, not a hemisphere-accurate rendering — the two-overlapping-
// circles technique is the common lightweight approach for a small UI glyph, not a claim of
// optical precision.
const SIZE = 22
const R = SIZE / 2 - 1

export default function MoonPhaseGlyph({ tithiIndex, className }: { tithiIndex: number; className?: string }) {
  const illumination = (1 - Math.cos((2 * Math.PI * tithiIndex) / 30)) / 2
  const shadowOffset = 2 * R * illumination
  const cx = SIZE / 2
  const cy = SIZE / 2
  const clipId = 'moon-clip'

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" className={className}>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={R} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="var(--color-ink)" opacity="0.9" />
      <g clipPath={`url(#${clipId})`}>
        <circle cx={cx - shadowOffset} cy={cy} r={R} fill="var(--color-paper-raised)" />
      </g>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--color-line-strong)" strokeWidth="0.75" />
    </svg>
  )
}
