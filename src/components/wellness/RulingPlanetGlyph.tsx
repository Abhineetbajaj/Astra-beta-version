import { PLANET_GLYPH } from '@/components/chart/glyphs'
import type { PlanetId } from '@/astro-engine/types'

/**
 * A ring + centered glyph anchor for the active Mahadasha lord — same "orbit ring around a large
 * display character" language as NumberOrb (numerals) and MoonPhaseGlyph (lunar phase), applied to
 * the one signal that already drives both Wellness pillars' top personalized picks (Mind's "For You
 * Today", Spirit's "Prescribed for you"). Sized entirely through `className` (e.g. `size-16` or
 * `sm:size-20`) — the glyph is drawn as SVG text inside a fixed viewBox, so it scales cleanly with
 * whatever box the caller gives it instead of needing a separate pixel prop kept in sync.
 */
export default function RulingPlanetGlyph({ planet, className }: { planet: PlanetId; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g className="orbit-medium" style={{ transformOrigin: '50px 50px' }}>
        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-line-strong)" strokeWidth="1" />
        <circle
          cx="50"
          cy="50"
          r="36"
          fill="none"
          stroke="var(--color-spirit)"
          strokeWidth="1"
          strokeOpacity="0.35"
          strokeDasharray="2 8"
        />
        <circle cx="50" cy="5" r="2.4" fill="var(--color-spirit)" />
      </g>
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="34"
        className="fill-ink font-display"
      >
        {PLANET_GLYPH[planet]}
      </text>
    </svg>
  )
}
