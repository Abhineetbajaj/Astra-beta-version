import { useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useChartStore } from '@/store/chartStore'
import { generateDailyReading } from '@/mocks/contentGenerator'
import { RASHIS } from '@/data/rashis'
import { Card } from '@/components/ui/Card'

const DAYS_TO_SHOW = 10

export default function HistoryPage() {
  const user = useAuthStore((s) => s.user)
  const ensureChart = useChartStore((s) => s.ensureChart)
  const chart = useMemo(() => (user?.birthData ? ensureChart(user.birthData) : null), [user, ensureChart])

  const entries = useMemo(() => {
    if (!chart) return []
    const moon = chart.placements.find((p) => p.planet === 'Moon')!
    const sun = chart.placements.find((p) => p.planet === 'Sun')!
    const asc = chart.ascendant

    return Array.from({ length: DAYS_TO_SHOW }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const reading = generateDailyReading(chart, date)
      return { date, reading, moon, sun, asc }
    })
  }, [chart])

  if (!chart) return null

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs uppercase tracking-wide text-ink-faint">History</p>
      <h1 className="mt-1 font-display text-4xl">Your reading history</h1>
      <p className="mt-2 text-ink-muted">Every daily reading, in one place.</p>

      <div className="mt-8 space-y-3">
        {entries.map(({ date, reading, moon, sun, asc }, i) => (
          <Card key={i}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-muted">
                {date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
              <p className="text-xs text-ink-faint">
                {RASHIS[sun.rashiIndex].name} · {RASHIS[moon.rashiIndex].name}
                {chart.housesReliable && asc ? ` · ${RASHIS[asc.rashiIndex].name}` : ''}
              </p>
            </div>
            <p className="mt-2 text-ink">{reading.focus}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
