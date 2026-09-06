import { motion } from 'framer-motion'
import type { PlanetPlacement } from '@/astro-engine/types'
import { PLANET_ABBR } from '@/components/chart/glyphs'
import { cn } from '@/lib/cn'

// Defensive: the astro-engine only ever computes these 9 classical grahas (see EPHEMERIS_BODIES in
// astro-engine/index.ts — Uranus/Neptune/Pluto have no code path into PlanetPlacement at all), but
// filter explicitly anyway so this component can never render something that isn't a real graha.
const KNOWN_GRAHAS = new Set(Object.keys(PLANET_ABBR))

interface NorthIndianChartProps {
  placements: PlanetPlacement[]
  /** Whole-sign houses (and therefore this entire chart style) are only meaningful with a known
   * birth time. When false, render a placeholder instead of a house layout built on a
   * local-solar-noon approximation — that would misrepresent the chart as more precise than it is. */
  housesReliable: boolean
  activeDashaLord?: string | null
  size?: number
  className?: string
}

// Diamond Kundli layout: outer square + both corner-to-corner diagonals + the diamond connecting
// the four edge midpoints. This yields exactly 12 regions — four kite-shaped kendra houses
// (each pointing to one edge midpoint) and eight corner triangles. House 1 (Lagna) is always the
// fixed top kite, regardless of the actual ascendant sign. Per project preference, houses are
// numbered anti-clockwise from there (house 2 immediately counter-clockwise of house 1), and each
// box displays its own fixed house number (1-12) rather than the rotating sign number — this is a
// deliberate deviation from the standard clockwise/sign-number North Indian convention. Geometry
// is derived and cross-checked by hand; do not "simplify" without re-deriving — a wrong region
// here misrepresents a real chart, not just a cosmetic bug.
const A = { x: 0, y: 0 }
const B = { x: 400, y: 0 }
const C = { x: 400, y: 400 }
const D = { x: 0, y: 400 }
const M_AB = { x: 200, y: 0 }
const M_BC = { x: 400, y: 200 }
const M_CD = { x: 200, y: 400 }
const M_DA = { x: 0, y: 200 }
const O = { x: 200, y: 200 }
const X_TR = { x: 300, y: 100 }
const X_BR = { x: 300, y: 300 }
const X_BL = { x: 100, y: 300 }
const X_TL = { x: 100, y: 100 }

interface HouseShape {
  house: number
  points: { x: number; y: number }[]
  /** where to draw the small house-number label, near the shape's outermost point */
  labelPos: { x: number; y: number }
  /** centroid, where planet abbreviations stack */
  center: { x: number; y: number }
}

function centroid(points: { x: number; y: number }[]) {
  const x = points.reduce((s, p) => s + p.x, 0) / points.length
  const y = points.reduce((s, p) => s + p.y, 0) / points.length
  return { x, y }
}

/** Nudges the label position from centroid toward the outer vertex, so it doesn't collide with planet text. */
function labelToward(outer: { x: number; y: number }, center: { x: number; y: number }, t = 0.6) {
  return { x: center.x + (outer.x - center.x) * t, y: center.y + (outer.y - center.y) * t }
}

const HOUSES: HouseShape[] = (() => {
  // Listed in clockwise geometric order starting at the top — purely a convenient way to define
  // the 12 physical regions. House numbers are assigned separately, below, anti-clockwise.
  const clockwisePositions: { points: { x: number; y: number }[]; outer: { x: number; y: number } }[] = [
    { points: [M_AB, X_TR, O, X_TL], outer: M_AB }, // top kite
    { points: [M_AB, B, X_TR], outer: B },
    { points: [B, M_BC, X_TR], outer: B },
    { points: [M_BC, X_BR, O, X_TR], outer: M_BC }, // right kite
    { points: [M_BC, C, X_BR], outer: C },
    { points: [C, M_CD, X_BR], outer: C },
    { points: [M_CD, X_BL, O, X_BR], outer: M_CD }, // bottom kite
    { points: [M_CD, D, X_BL], outer: D },
    { points: [D, M_DA, X_BL], outer: D },
    { points: [M_DA, X_TL, O, X_BL], outer: M_DA }, // left kite
    { points: [M_DA, A, X_TL], outer: A },
    { points: [A, M_AB, X_TL], outer: A },
  ]
  return clockwisePositions.map(({ points, outer }, i) => {
    const clockwisePosition = i + 1 // 1-12, purely geometric, position 1 = top
    // House 1 stays fixed at the top; houses 2-12 read anti-clockwise from there, i.e. in the
    // reverse order of the clockwise geometric positions.
    const house = clockwisePosition === 1 ? 1 : 14 - clockwisePosition
    const center = centroid(points)
    return { house, points, center, labelPos: labelToward(outer, center) }
  })
})()

function polygonPath(points: { x: number; y: number }[]): string {
  return `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`
}

export default function NorthIndianChartSVG({
  placements,
  housesReliable,
  activeDashaLord,
  size = 400,
  className,
}: NorthIndianChartProps) {
  const grahaPlacements = placements.filter((p) => KNOWN_GRAHAS.has(p.planet))

  if (!housesReliable) {
    return (
      <svg
        viewBox="0 0 400 400"
        width={size}
        height={size}
        className={cn('max-w-full h-auto', className)}
        role="img"
        aria-label="House chart unavailable — birth time unknown"
      >
        <rect x={0} y={0} width={400} height={400} fill="none" stroke="var(--color-line-strong)" strokeWidth={1.5} />
        <text
          x={200}
          y={190}
          textAnchor="middle"
          className="select-none fill-ink-muted font-body"
          fontSize={14}
        >
          Houses unavailable
        </text>
        <text
          x={200}
          y={212}
          textAnchor="middle"
          className="select-none fill-ink-faint font-body"
          fontSize={11}
        >
          birth time unknown
        </text>
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className={cn('max-w-full h-auto', className)}
      role="img"
      aria-label="North Indian style Vedic birth chart"
    >
      <rect x={0} y={0} width={400} height={400} fill="none" stroke="var(--color-line-strong)" strokeWidth={1.5} />
      <line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="var(--color-line)" strokeWidth={1} />
      <line x1={B.x} y1={B.y} x2={D.x} y2={D.y} stroke="var(--color-line)" strokeWidth={1} />
      <path d={polygonPath([M_AB, M_BC, M_CD, M_DA])} fill="none" stroke="var(--color-line)" strokeWidth={1} />

      {HOUSES.map(({ house, points, labelPos, center }) => {
        const occupants = grahaPlacements.filter((p) => p.houseIndex === house)
        const lineHeight = 11
        const startDy = -((occupants.length - 1) * lineHeight) / 2

        return (
          <g key={house}>
            {house === 1 && (
              <motion.path
                d={polygonPath(points)}
                fill="var(--color-accent-soft)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ duration: 0.6 }}
              />
            )}

            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              className="select-none fill-ink-faint font-body"
            >
              {house}
            </text>

            <text x={center.x} y={center.y} textAnchor="middle" dominantBaseline="central" className="select-none font-body">
              {occupants.map((p, i) => {
                const isActive = activeDashaLord === p.planet
                return (
                  <tspan
                    key={p.planet}
                    x={center.x}
                    dy={i === 0 ? startDy : lineHeight}
                    fontSize={11}
                    fontWeight={isActive ? 600 : 400}
                    fill={isActive ? 'var(--color-accent-strong)' : 'var(--color-ink)'}
                  >
                    {PLANET_ABBR[p.planet]}
                    {p.retrograde ? '(R)' : ''}
                  </tspan>
                )
              })}
            </text>
          </g>
        )
      })}

      {HOUSES.map(({ house, points }) => (
        <path
          key={`line-${house}`}
          d={polygonPath(points)}
          fill="none"
          stroke={house === 1 ? 'var(--color-accent)' : 'var(--color-line)'}
          strokeWidth={house === 1 ? 1.75 : 1}
        />
      ))}
    </svg>
  )
}
