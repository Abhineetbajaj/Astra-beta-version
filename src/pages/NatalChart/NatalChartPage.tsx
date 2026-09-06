import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useChartDisplayStore } from '@/store/chartDisplayStore'
import { useNatalChart } from '@/lib/useNatalChart'
import { supabase } from '@/lib/supabaseClient'
import { callEdgeFunction } from '@/lib/edgeFunctions'
import { currentDashaLords } from '@/astro-engine'
import { RASHIS } from '@/data/rashis'
import { Card } from '@/components/ui/Card'
import PageHero from '@/components/layout/PageHero'
import { Compass } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import NorthIndianChartSVG from '@/components/chart/NorthIndianChartSVG'
import ChartAtmosphere from '@/components/chart/ChartAtmosphere'
import PlacementsTable from '@/components/chart/PlacementsTable'
import DashaTimeline from '@/components/chart/DashaTimeline'
import TiltCard from '@/components/motion/TiltCard'
import Reveal from '@/components/motion/Reveal'

export default function NatalChartPage() {
  const selfBirthProfile = useAuthStore((s) => s.selfBirthProfile)
  const { chart, loading, refetch } = useNatalChart('birth_profile', selfBirthProfile?.id)
  const namingStyle = useChartDisplayStore((s) => s.namingStyle)
  const setNamingStyle = useChartDisplayStore((s) => s.setNamingStyle)
  const [computationBasis, setComputationBasis] = useState<string | null>(null)
  const [computing, setComputing] = useState(false)
  const [computeError, setComputeError] = useState<string | null>(null)

  function handleComputeChart() {
    if (!selfBirthProfile) return
    setComputing(true)
    setComputeError(null)
    callEdgeFunction('compute-chart', { subjectType: 'birth_profile', subjectId: selfBirthProfile.id })
      .then(() => refetch())
      .catch((err) => setComputeError(err instanceof Error ? err.message : 'Could not compute the chart.'))
      .finally(() => setComputing(false))
  }

  useEffect(() => {
    if (!selfBirthProfile) return
    supabase
      .from('natal_charts')
      .select('computation_basis')
      .eq('birth_profile_id', selfBirthProfile.id)
      .maybeSingle()
      .then(({ data }) => setComputationBasis(data?.computation_basis ?? null))
  }, [selfBirthProfile])

  if (!selfBirthProfile) return null
  if (loading) {
    return (
      <div className="space-y-10">
        <div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-2 h-9 w-72" />
          <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        </div>
        <div className="grid gap-10 lg:grid-cols-[400px_1fr]">
          <Card className="flex items-center justify-center py-16">
            <Skeleton className="size-64 rounded-full" />
          </Card>
          <Card>
            <Skeleton className="h-5 w-40" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    )
  }
  if (!chart) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <p className="text-ink-muted">
          Your birth details are saved, but the chart itself was never computed — this can happen if onboarding
          was interrupted.
        </p>
        <Button variant="accent" className="mt-4" onClick={handleComputeChart} disabled={computing}>
          {computing ? 'Computing your chart…' : 'Compute my chart'}
        </Button>
        {computeError && <p className="mt-3 text-sm text-negative">{computeError}</p>}
      </Card>
    )
  }

  const active = currentDashaLords(chart.dashas, new Date())
  const ascendantRashi = chart.ascendant ? RASHIS[chart.ascendant.rashiIndex] : null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHero
          Icon={Compass}
          eyebrow="Full natal chart"
          title="Your Vedic birth chart"
          subtitle={computationBasis || undefined}
        />

        <div className="flex items-center gap-1 rounded-full border border-line-strong p-1 text-sm">
          <button
            onClick={() => setNamingStyle('western')}
            className={cn(
              'rounded-full px-3 py-1.5 transition-colors',
              namingStyle === 'western' ? 'bg-paper-raised text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            Western
          </button>
          <button
            onClick={() => setNamingStyle('vedic')}
            className={cn(
              'rounded-full px-3 py-1.5 transition-colors',
              namingStyle === 'vedic' ? 'bg-paper-raised text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            Vedic
          </button>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[400px_1fr]">
        <Reveal>
          <Card className="flex min-w-0 flex-col items-center py-10">
            {/* The chart gets its own atmospheric footprint — same restrained orbit-arc +
                breathing glow treatment already established for the Dashboard's mini chart in
                Step 4 — rather than sitting flat on the card background like plain content.
                relative + overflow-hidden clips the atmosphere to this footprint only, so it
                never reaches the Ascendant/Mahadasha text below. */}
            <div className="relative flex aspect-square w-[340px] max-w-full items-center justify-center overflow-hidden rounded-2xl">
              <ChartAtmosphere />
              <div
                aria-hidden="true"
                className="glow-breathe pointer-events-none absolute inset-0 m-auto size-[220px] rounded-full bg-accent/20 blur-[56px]"
              />
              <TiltCard maxTilt={4}>
                <NorthIndianChartSVG
                  placements={chart.placements}
                  housesReliable={chart.housesReliable}
                  activeDashaLord={active?.maha}
                  size={340}
                />
              </TiltCard>
            </div>

            <div className="mt-8 grid w-full grid-cols-2 gap-x-8 gap-y-2 border-t border-line pt-6 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-faint">Ascendant</p>
                <p className="mt-0.5 font-medium text-ink">
                  {chart.housesReliable
                    ? `${ascendantRashi?.symbol} ${namingStyle === 'vedic' ? ascendantRashi?.sanskrit : ascendantRashi?.name}`
                    : 'Unavailable'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-faint">Current Mahadasha</p>
                <p className="mt-0.5 font-medium text-ink">{active?.maha ?? '—'}</p>
              </div>
            </div>
            {!chart.housesReliable && (
              <p className="mt-4 max-w-[280px] text-center text-xs text-ink-faint">
                Birth time is approximate, so the ascendant and houses are hidden — everything
                else is unaffected.
              </p>
            )}
          </Card>
        </Reveal>

        <div className="min-w-0 space-y-6">
          <Card>
            <h2 className="font-display text-lg">Planetary placements</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Each graha's sign, degree, nakshatra, and house for this chart.
            </p>
            <div className="mt-5">
              <PlacementsTable placements={chart.placements} housesReliable={chart.housesReliable} namingStyle={namingStyle} />
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
    </motion.div>
  )
}
