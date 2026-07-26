import { useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useChartStore } from '@/store/chartStore'
import { currentDashaLords } from '@/astro-engine'
import { RASHIS } from '@/data/rashis'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import ZodiacWheelSVG from '@/components/chart/ZodiacWheelSVG'
import PlacementsTable from '@/components/chart/PlacementsTable'
import DashaTimeline from '@/components/chart/DashaTimeline'

export default function NatalChartPage() {
  const user = useAuthStore((s) => s.user)
  const ensureChart = useChartStore((s) => s.ensureChart)

  const chart = useMemo(() => (user?.birthData ? ensureChart(user.birthData) : null), [user, ensureChart])

  if (!chart || !user?.birthData) return null

  const active = currentDashaLords(chart.dashas, new Date())
  const ascendantRashi = chart.ascendant ? RASHIS[chart.ascendant.rashiIndex] : null

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-faint">Full natal chart</p>
        <h1 className="mt-1 font-display text-4xl">Your Vedic birth chart</h1>
        <p className="mt-2 max-w-xl text-ink-muted">
          Calculated from {user.birthData.placeLabel}, {user.birthData.date} —
          Lahiri ayanamsa, whole-sign houses.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[400px_1fr]">
        <Card className="flex flex-col items-center justify-center py-8">
          <ZodiacWheelSVG
            placements={chart.placements}
            ascendant={chart.ascendant}
            activeDashaLord={active?.maha}
            size={340}
          />
          <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-faint">Ascendant</p>
              <p className="mt-0.5">
                {chart.housesReliable
                  ? `${ascendantRashi?.symbol} ${ascendantRashi?.name}`
                  : 'Unavailable'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-faint">Current Mahadasha</p>
              <p className="mt-0.5">{active?.maha ?? '—'}</p>
            </div>
          </div>
          {!chart.housesReliable && (
            <p className="mt-4 max-w-[280px] text-center text-xs text-ink-faint">
              Birth time is approximate, so the ascendant and houses are hidden — everything
              else is unaffected.
            </p>
          )}
        </Card>

        <div className="min-w-0 space-y-6">
          <Card>
            <h2 className="font-display text-lg">Planetary placements</h2>
            <div className="mt-4">
              <PlacementsTable placements={chart.placements} housesReliable={chart.housesReliable} />
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Vimshottari dasha timeline</h2>
          <Badge variant="neutral">120-year cycle</Badge>
        </div>
        <div className="mt-5">
          <DashaTimeline dashas={chart.dashas} />
        </div>
      </Card>
    </div>
  )
}
