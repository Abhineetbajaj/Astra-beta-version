import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Compass, Heart, Briefcase, Eye, Sparkles, Lock, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useNatalChart } from '@/lib/useNatalChart'
import { callEdgeFunction } from '@/lib/edgeFunctions'
import { currentDashaLords } from '@/astro-engine'
import { RASHIS } from '@/data/rashis'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import NorthIndianChartSVG from '@/components/chart/NorthIndianChartSVG'
import type { DailyReadingRow, WeeklyReportRow } from '@/types/db'

/** compute-chart failed at some point after the birth profile was saved (see loadChartFacts.ts). */
function isMissingChartError(message: string | null): boolean {
  return !!message && message.includes('No chart found')
}

const FOCUS_ICONS = [
  { key: 'focus_card', label: "Today's focus", Icon: Compass },
  { key: 'love_card', label: 'Love', Icon: Heart },
  { key: 'career_card', label: 'Career', Icon: Briefcase },
  { key: 'watch_card', label: 'Watch for', Icon: Eye },
] as const

export default function DashboardPage() {
  const profile = useAuthStore((s) => s.profile)
  const selfBirthProfile = useAuthStore((s) => s.selfBirthProfile)
  const isPremium = useAuthStore((s) => s.isPremium)
  const { chart } = useNatalChart('birth_profile', selfBirthProfile?.id)

  const [reading, setReading] = useState<DailyReadingRow | null>(null)
  const [loadingReading, setLoadingReading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [computingChart, setComputingChart] = useState(false)

  const [weeklyReport, setWeeklyReport] = useState<WeeklyReportRow | null>(null)
  const [loadingWeekly, setLoadingWeekly] = useState(false)
  const [weeklyError, setWeeklyError] = useState<string | null>(null)

  const loadReading = useCallback(() => {
    if (!selfBirthProfile) return
    let cancelled = false
    setLoadingReading(true)
    setError(null)
    callEdgeFunction<{ reading: DailyReadingRow }>('daily-reading', { birthProfileId: selfBirthProfile.id })
      .then(({ reading }) => {
        if (!cancelled) setReading(reading)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load today’s reading.')
      })
      .finally(() => {
        if (!cancelled) setLoadingReading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selfBirthProfile])

  useEffect(() => loadReading(), [loadReading])

  function handleComputeChart() {
    if (!selfBirthProfile) return
    setComputingChart(true)
    setError(null)
    callEdgeFunction('compute-chart', { subjectType: 'birth_profile', subjectId: selfBirthProfile.id })
      .then(() => loadReading())
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not compute the chart.'))
      .finally(() => setComputingChart(false))
  }

  function generateWeeklyReport() {
    if (!selfBirthProfile) return
    setLoadingWeekly(true)
    setWeeklyError(null)
    callEdgeFunction<{ report: WeeklyReportRow }>('weekly-report', { birthProfileId: selfBirthProfile.id })
      .then(({ report }) => setWeeklyReport(report))
      .catch((err) => setWeeklyError(err instanceof Error ? err.message : 'Could not load the weekly report.'))
      .finally(() => setLoadingWeekly(false))
  }

  if (!selfBirthProfile) return null

  const active = chart ? currentDashaLords(chart.dashas, new Date()) : null
  const moon = chart?.placements.find((p) => p.planet === 'Moon')
  const moonRashi = moon ? RASHIS[moon.rashiIndex] : null
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-10">
      <Card className="grid gap-8 lg:grid-cols-[1fr_200px] lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-faint">{today}</p>
          <h1 className="mt-2 font-display text-4xl">
            Hi <span className="italic text-accent">{profile?.display_name}</span>, here's your
            reading.
          </h1>

          {error && isMissingChartError(error) && (
            <div className="mt-4 max-w-lg rounded-xl border border-negative/30 bg-negative/5 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-negative" strokeWidth={1.75} />
                <p className="text-sm text-negative">
                  Your birth details are saved, but the chart itself was never computed — this can happen if
                  onboarding was interrupted.
                </p>
              </div>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleComputeChart} disabled={computingChart}>
                {computingChart ? 'Computing your chart…' : 'Compute my chart'}
              </Button>
            </div>
          )}
          {error && !isMissingChartError(error) && <p className="mt-4 text-sm text-negative">{error}</p>}
          {loadingReading && !reading && (
            <div className="mt-4 max-w-lg space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}
          {reading && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-4 max-w-lg text-ink-muted"
            >
              {reading.body}
            </motion.p>
          )}

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
            {moonRashi && (
              <>
                <span>
                  Moon in {moonRashi.symbol} {moonRashi.name}
                </span>
                <span>·</span>
              </>
            )}
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
          {chart && (
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
              <NorthIndianChartSVG
                placements={chart.placements}
                housesReliable={chart.housesReliable}
                activeDashaLord={active?.maha}
                size={180}
              />
            </motion.div>
          )}
        </div>
      </Card>

      {loadingReading && !reading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {FOCUS_ICONS.map(({ key }) => (
            <Card key={key}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-1.5 h-4 w-3/4" />
            </Card>
          ))}
        </div>
      )}

      {reading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {FOCUS_ICONS.map(({ key, label, Icon }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
            >
              <Card>
                <div className="flex items-center gap-2 text-ink-muted">
                  <Icon className="size-4" strokeWidth={1.75} />
                  <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
                </div>
                <p className="mt-3 text-ink">{reading[key]}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link to="/chart" className="rounded-full border border-line-strong px-4 py-2 text-sm hover:bg-paper-raised">
          View full chart →
        </Link>
        <Link to="/chat" className="rounded-full border border-line-strong px-4 py-2 text-sm hover:bg-paper-raised">
          Ask Astra a question →
        </Link>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" strokeWidth={1.75} />
            <h2 className="font-display text-lg">Weekly deep-dive</h2>
          </div>
          {!isPremium && (
            <Link to="/pricing" className="flex items-center gap-1 text-xs text-ink-faint hover:text-ink">
              <Lock className="size-3" strokeWidth={2} />
              Premium
            </Link>
          )}
        </div>

        {!isPremium && (
          <p className="mt-2 text-sm text-ink-muted">
            A longer weekly synthesis — throughline, relationships, work, and one honest growth edge — is part of
            Astra Premium.
          </p>
        )}

        {isPremium && !weeklyReport && (
          <div className="mt-3">
            <p className="text-sm text-ink-muted">Four grounded paragraphs for the week ahead, generated once and cached until next Monday.</p>
            <Button variant="accent" className="mt-4" onClick={generateWeeklyReport} disabled={loadingWeekly}>
              {loadingWeekly ? 'Reading the week…' : 'Generate this week\'s report'}
            </Button>
            {weeklyError && <p className="mt-3 text-sm text-negative">{weeklyError}</p>}
          </div>
        )}

        {weeklyReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="mt-4 space-y-3">
            {weeklyReport.body.split('\n').filter(Boolean).map((paragraph, i) => (
              <p key={i} className="text-ink-muted">
                {paragraph}
              </p>
            ))}
          </motion.div>
        )}
      </Card>
    </div>
  )
}
