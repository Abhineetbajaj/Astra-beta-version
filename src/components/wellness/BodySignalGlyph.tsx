/**
 * A ring + centre form reflecting the real three-state vitality signal derived from classical
 * dignity (exalted/own -> supported, neutral -> steady, debilitated -> gentle). Same "orbit ring
 * around a real-data-driven centre" language as NumberOrb, MoonPhaseGlyph and RulingPlanetGlyph —
 * keyed on a derived state rather than a raw planet or numeral, but driven by the same real chart
 * data, not decoration. Sized entirely through `className` (e.g. `size-16 sm:size-[84px]`).
 *
 * The tone only changes colour and centre weight — it never encodes information the surrounding
 * text doesn't already state, so nothing is lost for anyone who can't distinguish the colours.
 */
export type VitalityTone = 'supported' | 'steady' | 'gentle'

const TONE_COLOR: Record<VitalityTone, string> = {
  supported: 'var(--color-positive)',
  steady: 'var(--color-accent)',
  gentle: 'var(--color-body)',
}

export default function BodySignalGlyph({ tone, className }: { tone: VitalityTone; className?: string }) {
  const color = TONE_COLOR[tone]

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g className="orbit-medium" style={{ transformOrigin: '50px 50px' }}>
        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-line-strong)" strokeWidth="1" />
        <circle
          cx="50"
          cy="50"
          r="36"
          fill="none"
          stroke={color}
          strokeWidth="1"
          strokeOpacity="0.35"
          strokeDasharray="2 8"
        />
        <circle cx="50" cy="5" r="2.4" fill={color} />
      </g>
      <circle cx="50" cy="50" r="20" fill={color} fillOpacity="0.18" />
      <circle cx="50" cy="50" r="20" fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.7" />
    </svg>
  )
}
