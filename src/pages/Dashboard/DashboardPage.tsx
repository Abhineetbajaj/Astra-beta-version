import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Compass, Heart, Briefcase, Eye } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useChartStore } from '@/store/chartStore'
import { currentDashaLords } from '@/astro-engine'
import { generateDailyReading } from '@/mocks/contentGenerator'
import { RASHIS } from '@/data/rashis'
import { Card } from '@/components/ui/Card'
import ZodiacWheelSVG from '@/components/chart/ZodiacWheelSVG'

const FOCUS_ICONS = [
  { key: 'focus', label: "Today's focus", Icon: Compass },
  { key: 'love', label: 'Love', Icon: Heart },
  { key: 'career', label: 'Career', Icon: Briefcase },
  { key: 'watchFor', label: 'Watch for', Icon: Eye },
] as const

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const ensureChart = useChartStore((s) => s.ensureChart)

  const chart = useMemo(() => (user?.birthData ? ensureChart(user.birthData) : null), [user, ensureChart])
  const reading = useMemo(() => (chart ? generateDailyReading(chart) : null), [chart])

  if (!chart || !user?.birthData || !reading) return null

  const active = currentDashaLords(chart.dashas, new Date())
  const moon = chart.placements.find((p) => p.planet === 'Moon')!
  const moonRashi = RASHIS[moon.rashiIndex]
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="space-y-10">
      <Card className="grid gap-8 lg:grid-cols-[1fr_200px] lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-faint">{today}</p>
          <h1 className="mt-2 font-display text-4xl">
            Hi <span className="italic text-accent">{user.displayName}</span>, here's your
            reading.
          </h1>
          <p className="mt-4 max-w-lg text-ink-muted">{reading.headline}</p>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
            <span>
              Moon in {moonRashi.symbol} {moonRashi.name}
            </span>
            <span>·</span>
            <span>{active?.maha} Mahadasha</span>
            {active?.antar && (
              <>
                <span>·</span>
                <span>{active.antar} Antardasha</span>
              </>
            )}
          </div>
        </div>
        <div className="hidden justify-self-end lg:block">
          <ZodiacWheelSVG
            placements={chart.placements}
            ascendant={chart.ascendant}
            activeDashaLord={active?.maha}
            size={180}
          />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {FOCUS_ICONS.map(({ key, label, Icon }) => (
          <Card key={key}>
            <div className="flex items-center gap-2 text-ink-muted">
              <Icon className="size-4" strokeWidth={1.75} />
              <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
            </div>
            <p className="mt-3 text-ink">{reading[key]}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/chart"
          className="rounded-full border border-line-strong px-4 py-2 text-sm hover:bg-paper-raised"
        >
          View full chart →
        </Link>
        <Link
          to="/chat"
          className="rounded-full border border-line-strong px-4 py-2 text-sm hover:bg-paper-raised"
        >
          Ask Astra a question →
        </Link>
      </div>
    </div>
  )
}
