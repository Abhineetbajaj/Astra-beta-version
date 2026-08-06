import type { PlanetPlacement } from '@/astro-engine/types'
import { RASHIS } from '@/data/rashis'
import { NAKSHATRAS } from '@/data/nakshatras'
import { PLANET_GLYPH } from '@/components/chart/glyphs'
import { Badge } from '@/components/ui/Badge'
import GlossaryTerm from '@/components/GlossaryTerm'
import { cn } from '@/lib/cn'
import type { SignNamingStyle } from '@/store/chartDisplayStore'

interface PlacementsTableProps {
  placements: PlanetPlacement[]
  housesReliable: boolean
  namingStyle?: SignNamingStyle
}

function formatDegree(deg: number): string {
  const whole = Math.floor(deg)
  const minutes = Math.round((deg - whole) * 60)
  return `${whole}°${String(minutes).padStart(2, '0')}'`
}

const DIGNITY_LABEL: Record<PlanetPlacement['dignity'], string | null> = {
  exalted: 'Exalted',
  debilitated: 'Debilitated',
  own: 'Own sign',
  neutral: null,
}

export default function PlacementsTable({ placements, housesReliable, namingStyle = 'western' }: PlacementsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
            <th className="py-2 pr-4 font-medium">Planet</th>
            <th className="py-2 pr-4 font-medium">Sign</th>
            <th className="py-2 pr-4 font-medium nums-tabular">Degree</th>
            <th className="py-2 pr-4 font-medium">Nakshatra</th>
            <th className="py-2 pr-4 font-medium">House</th>
            <th className="py-2 font-medium">Dignity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {placements.map((p) => {
            const rashi = RASHIS[p.rashiIndex]
            const nakshatra = NAKSHATRAS[p.nakshatraIndex]
            const dignityLabel = DIGNITY_LABEL[p.dignity]
            return (
              <tr key={p.planet}>
                <td className="py-2.5 pr-4">
                  <span className="flex items-center gap-2">
                    <span className="text-base text-ink-muted">{PLANET_GLYPH[p.planet]}</span>
                    {p.planet}
                    {p.retrograde && <span className="text-xs text-negative">R</span>}
                  </span>
                </td>
                <td className="py-2.5 pr-4">
                  {rashi.symbol}{' '}
                  <GlossaryTerm term={rashi.name.toLowerCase()}>
                    {namingStyle === 'vedic' ? rashi.sanskrit : rashi.name}
                  </GlossaryTerm>
                </td>
                <td className="nums-tabular py-2.5 pr-4 text-ink-muted">
                  {formatDegree(p.degreeInRashi)}
                </td>
                <td className="py-2.5 pr-4 text-ink-muted">
                  {nakshatra.name} <span className="text-xs">· pada {p.nakshatraPada}</span>
                </td>
                <td className={cn('py-2.5 pr-4 nums-tabular', !housesReliable && 'text-ink-faint')}>
                  {housesReliable && p.houseIndex != null ? (
                    <GlossaryTerm term={`house-${p.houseIndex}`}>{p.houseIndex}</GlossaryTerm>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-2.5">
                  {dignityLabel ? (
                    <GlossaryTerm term={p.dignity} underline={false}>
                      <Badge variant={p.dignity === 'debilitated' ? 'neutral' : 'accent'}>
                        {dignityLabel}
                      </Badge>
                    </GlossaryTerm>
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {!housesReliable && (
        <p className="mt-3 text-xs text-ink-faint">
          Birth time wasn't exact, so house placements are hidden — sign and nakshatra
          positions are unaffected.
        </p>
      )}
    </div>
  )
}
