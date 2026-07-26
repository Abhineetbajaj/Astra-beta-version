import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { PlanetPlacement, AscendantInfo } from '@/astro-engine/types'
import { RASHIS } from '@/data/rashis'
import { PLANET_GLYPH } from '@/components/chart/glyphs'

interface ZodiacWheelProps {
  placements: PlanetPlacement[]
  ascendant: AscendantInfo | null
  activeDashaLord?: string | null
  size?: number
  className?: string
}

const CENTER = 200
const OUTER_R = 188
const SIGN_LABEL_R = 165
const PLANET_R = 128
const INNER_R = 100

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

/** Spreads out planets that land within a few degrees of each other so glyphs don't overlap. */
function declutter(longitudes: number[], minSeparation = 9): number[] {
  const indexed = longitudes.map((lon, i) => ({ lon, i })).sort((a, b) => a.lon - b.lon)
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < indexed.length; i++) {
      const diff = indexed[i].lon - indexed[i - 1].lon
      if (diff < minSeparation && diff >= 0) {
        const push = (minSeparation - diff) / 2
        indexed[i - 1].lon -= push
        indexed[i].lon += push
      }
    }
  }
  const out = new Array(longitudes.length)
  indexed.forEach(({ lon, i }) => (out[i] = lon))
  return out
}

export default function ZodiacWheelSVG({
  placements,
  ascendant,
  activeDashaLord,
  size = 400,
  className,
}: ZodiacWheelProps) {
  const displayLongitudes = useMemo(
    () => declutter(placements.map((p) => p.siderealLongitude)),
    [placements],
  )

  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Zodiac wheel showing planetary placements"
    >
      <motion.circle
        cx={CENTER}
        cy={CENTER}
        r={OUTER_R}
        fill="none"
        stroke="var(--color-line)"
        strokeWidth={1}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      />
      <motion.circle
        cx={CENTER}
        cy={CENTER}
        r={INNER_R}
        fill="none"
        stroke="var(--color-line)"
        strokeWidth={1}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.1, ease: 'easeInOut' }}
      />

      {RASHIS.map((rashi) => {
        const startAngle = rashi.index * 30
        const p1 = polar(CENTER, CENTER, INNER_R, startAngle)
        const p2 = polar(CENTER, CENTER, OUTER_R, startAngle)
        const labelPos = polar(CENTER, CENTER, SIGN_LABEL_R, startAngle + 15)
        const isAscSign = ascendant?.rashiIndex === rashi.index

        return (
          <g key={rashi.index}>
            <line
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="var(--color-line)"
              strokeWidth={1}
            />
            {isAscSign && (
              <path
                d={describeArc(CENTER, CENTER, OUTER_R, startAngle, startAngle + 30)}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2.5}
              />
            )}
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="select-none fill-ink-muted font-body"
              fontSize={13}
            >
              {rashi.symbol}
            </text>
          </g>
        )
      })}

      {ascendant && (
        <line
          x1={CENTER}
          y1={CENTER}
          x2={polar(CENTER, CENTER, OUTER_R, ascendant.siderealLongitude).x}
          y2={polar(CENTER, CENTER, OUTER_R, ascendant.siderealLongitude).y}
          stroke="var(--color-accent)"
          strokeWidth={1.5}
          strokeDasharray="2 3"
        />
      )}

      {placements.map((p, i) => {
        const pos = polar(CENTER, CENTER, PLANET_R, displayLongitudes[i])
        const isActive = activeDashaLord === p.planet
        return (
          <motion.g
            key={p.planet}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 + i * 0.05, ease: 'easeOut' }}
            style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
          >
            <circle
              cx={pos.x}
              cy={pos.y}
              r={isActive ? 14 : 12}
              fill={isActive ? 'var(--color-accent)' : 'var(--color-paper)'}
              stroke={isActive ? 'var(--color-accent)' : 'var(--color-line-strong)'}
              strokeWidth={1}
            />
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={13}
              className="select-none font-body"
              fill={isActive ? 'var(--color-accent-ink)' : 'var(--color-ink)'}
            >
              {PLANET_GLYPH[p.planet]}
              {p.retrograde && (
                <tspan dx={1} dy={-4} fontSize={7}>
                  R
                </tspan>
              )}
            </text>
          </motion.g>
        )
      })}

      <circle cx={CENTER} cy={CENTER} r={2} fill="var(--color-ink-faint)" />
    </svg>
  )
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polar(cx, cy, r, startAngle)
  const end = polar(cx, cy, r, endAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
}
