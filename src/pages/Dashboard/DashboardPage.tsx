import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Compass, Heart, Briefcase, Eye, Sparkles, Lock, AlertCircle, Orbit, ThumbsUp, ThumbsDown, Hash, Share2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import { useNatalChart } from '@/lib/useNatalChart'
import { callEdgeFunction } from '@/lib/edgeFunctions'
import { currentDashaLords } from '@/astro-engine'
import { computePanchang } from '@/astro-engine/panchang'
import { computeTransits } from '@/astro-engine/transits'
import { computePersonalCycles } from '@/numerology-engine'
import { meaningForNumber } from '@/data/numerologyMeanings'
import { RASHIS } from '@/data/rashis'
import { highlightGlossaryTerms } from '@/lib/highlightGlossaryTerms'
import GlossaryTerm from '@/components/GlossaryTerm'
import ShareCard from '@/components/share/ShareCard'
import { shareCardImage } from '@/lib/shareCardImage'
import TimingCard from '@/components/muhurta/TimingCard'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import CosmicLoader from '@/components/ui/CosmicLoader'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import NorthIndianChartSVG from '@/components/chart/NorthIndianChartSVG'
import ChartAtmosphere from '@/components/chart/ChartAtmosphere'
import NumberOrb from '@/components/numerology/NumberOrb'
import MoonPhaseGlyph from '@/components/dashboard/MoonPhaseGlyph'
import Reveal from '@/components/motion/Reveal'
import TiltCard from '@/components/motion/TiltCard'
import type { DailyReadingRow, WeeklyReportRow } from '@/types/db'

/** compute-chart failed at some point after the birth profile was saved (see loadChartFacts.ts). */
function isMissingChartError(message: string | null): boolean {
  return !!message && message.includes('No chart found')
}

function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`
}

const SADE_SATI_LABEL = { rising: 'Rising phase', peak: 'Peak phase', setting: 'Setting phase' } as const

const FOCUS_ICONS = [
  { key: 'focus_card', label: "Today's focus", Icon: Compass, tint: 'text-accent', halo: 'bg-accent/10' },
  { key: 'love_card', label: 'Love', Icon: Heart, tint: 'text-body', halo: 'bg-body/10' },
  { key: 'career_card', label: 'Career', Icon: Briefcase, tint: 'text-spirit', halo: 'bg-spirit/10' },
  { key: 'watch_card', label: 'Watch for', Icon: Eye, tint: 'text-ink-muted', halo: 'bg-ink/5' },
] as const

// Today's Focus gets the primary/larger treatment in the guidance grid; the rest stay secondary.
// Split once here rather than filtering on every render.
const [PRIMARY_FOCUS, ...SECONDARY_FOCUS] = FOCUS_ICONS

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

  // Load an already-generated weekly report rather than always showing the "Generate" button —
  // regenerating costs a Gemini call from a budget shared across every feature and user.
  useEffect(() => {
    if (!selfBirthProfile) return
    let cancelled = false
    supabase
      .from('weekly_reports')
      .select('*')
      .eq('birth_profile_id', selfBirthProfile.id)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setWeeklyReport(data as WeeklyReportRow)
      })
    return () => {
      cancelled = true
    }
  }, [selfBirthProfile])

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

  const panchang = useMemo(() => computePanchang(new Date()), [])

  // Deterministic, client-side only — no Gemini call from Dashboard. The AI-narrated Personal Day
  // blurb only loads once the user clicks through to /numerology; Dashboard already fires
  // daily-reading (and conditionally weekly-report), and the shared 20-req/day Gemini budget
  // shouldn't take a third hit just for a teaser card.
  const personalDay = useMemo(() => {
    if (!selfBirthProfile) return null
    return computePersonalCycles(selfBirthProfile.date_of_birth, new Date()).personalDay
  }, [selfBirthProfile])
  const personalDayMeaning = personalDay ? meaningForNumber(personalDay.value) : null

  const [dailyCardStatus, setDailyCardStatus] = useState<'idle' | 'working' | 'downloaded'>('idle')
  const dailyCardRef = useRef<HTMLDivElement>(null)

  async function shareDailyCard(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!dailyCardRef.current) return
    setDailyCardStatus('working')
    const result = await shareCardImage(dailyCardRef.current, {
      fileName: 'astra-personal-day.png',
      shareText: "My Astra numerology Personal Day — check yours.",
    })
    setDailyCardStatus(result === 'downloaded' ? 'downloaded' : 'idle')
    if (result === 'downloaded') setTimeout(() => setDailyCardStatus('idle'), 2000)
  }

  const transits = useMemo(() => {
    if (!chart) return null
    const natalMoon = chart.placements.find((p) => p.planet === 'Moon')
    if (!natalMoon) return null
    return computeTransits(chart.ascendant?.rashiIndex ?? null, natalMoon.rashiIndex, new Date())
  }, [chart])

  if (!selfBirthProfile) return null

  const active = chart ? currentDashaLords(chart.dashas, new Date()) : null
  const moon = chart?.placements.find((p) => p.planet === 'Moon')
  const moonRashi = moon ? RASHIS[moon.rashiIndex] : null
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-10">
      <Card interactive className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-stretch">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-ink-faint">{today}</p>
          <h1 className="mt-2 font-display text-4xl leading-tight">
            {greeting},
            <br />
            <span className="italic text-accent">{profile?.display_name}</span>
          </h1>
          <p className="mt-2 text-ink-muted">Here's what the cosmos has prepared for you today.</p>

          {error && isMissingChartError(error) && (
            <div className="mt-4 max-w-lg rounded-xl border border-negative/30 bg-negative/5 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-negative" strokeWidth={1.75} />
                <p className="text-sm text-negative">
                  Your birth details are saved, but the chart itself was never computed — this can happen if
                  onboarding was interrupted.
                </p>
              </div>
              {computingChart ? (
                <CosmicLoader label="Computing your chart…" className="items-start py-6" />
              ) : (
                <Button variant="outline" size="sm" className="mt-3" onClick={handleComputeChart}>
                  Compute my chart
                </Button>
              )}
            </div>
          )}
          {error && !isMissingChartError(error) && <p className="mt-4 text-sm text-negative">{error}</p>}

          {(reading || loadingReading) && (
            <div className="mt-7 flex items-center gap-2">
              {/* Driven by the real Tithi index already computed below for the panchang grid —
                  not a decorative crescent, the actual lunar phase for today. */}
              <MoonPhaseGlyph tithiIndex={panchang.tithi.index} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  Today's cosmic overview
                </p>
                <p className="text-[11px] text-ink-faint">
                  {panchang.tithi.name} · {panchang.tithi.paksha === 'Shukla' ? 'waxing' : 'waning'} moon
                </p>
              </div>
            </div>
          )}
          {loadingReading && !reading && (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          )}
          {reading && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-muted"
            >
              {highlightGlossaryTerms(reading.body)}
            </motion.p>
          )}

          {/* Moon sign + active dasha as chips rather than dot-separated inline text — the same
              real values as before, just given the visual weight of "current astrology context"
              rather than a footnote. underline={false} on GlossaryTerm per its own documented
              guidance for content that already has its own affordance (the chip itself). */}
          <div className="mt-5 flex flex-wrap gap-2">
            {moonRashi && (
              <span className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-paper-raised/60 px-3 py-1.5 text-xs font-medium text-ink">
                Moon in {moonRashi.symbol} {moonRashi.name}
              </span>
            )}
            {active?.maha && (
              <GlossaryTerm term="mahadasha" underline={false}>
                <span className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent-strong">
                  {active.maha} Mahadasha
                </span>
              </GlossaryTerm>
            )}
            {active?.antar && (
              <GlossaryTerm term="antardasha" underline={false}>
                <span className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-paper-raised/60 px-3 py-1.5 text-xs font-medium text-ink">
                  {active.antar} Antardasha
                </span>
              </GlossaryTerm>
            )}
          </div>
        </div>

        {/* Right column intentionally ~40% of the card, not a narrow afterthought — the chart
            gets its own tinted panel and a caption so it reads as part of the reading, not a
            disconnected decoration next to it. relative + overflow-hidden so the celestial
            atmosphere layer clips to these rounded corners instead of spilling past them. */}
        <div className="relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-line-strong bg-paper-raised/40 p-7 shadow-[0_18px_44px_-28px_rgba(0,0,0,0.55)]">
          {chart ? (
            <>
              <ChartAtmosphere />
              {/* A separate glow BEHIND the chart, not applied to the chart itself — the chart is
                  the one thing on this page that must stay fully readable at all times, so only
                  this decorative element pulses, never the actual astrology data. (Previously
                  glow-breathe was applied directly to the chart's own wrapper, which meant the
                  real chart was continuously fading between 45-75% opacity — fixed here.) */}
              <div
                aria-hidden="true"
                className="glow-breathe pointer-events-none absolute inset-0 m-auto size-[160px] rounded-full bg-accent/20 blur-[50px]"
              />
              <TiltCard maxTilt={4}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <NorthIndianChartSVG
                    placements={chart.placements}
                    housesReliable={chart.housesReliable}
                    activeDashaLord={active?.maha}
                    size={200}
                  />
                </motion.div>
              </TiltCard>
              <p className="relative text-center text-xs text-ink-faint">Your current cosmic map</p>
            </>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-xs text-ink-faint">
              {computingChart ? 'Computing your chart…' : 'Chart unavailable'}
            </div>
          )}
        </div>
      </Card>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
          Today at a glance
        </p>
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-line-strong bg-paper-raised/20 p-3 sm:grid-cols-4">
          {[
            { label: 'Vara', value: panchang.vara },
            { label: 'Tithi', value: `${panchang.tithi.name} (${panchang.tithi.paksha})` },
            { label: 'Nakshatra', value: panchang.nakshatra.name },
            { label: 'Yoga', value: panchang.yoga.name },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-line bg-paper px-3 py-2.5 transition-colors duration-200 hover:border-line-strong hover:bg-paper-raised/60"
            >
              <p className="text-[10px] uppercase tracking-wide text-ink-faint">{item.label}</p>
              <p className="mt-0.5 truncate text-sm text-ink" title={item.value}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <TimingCard lat={selfBirthProfile.lat} lon={selfBirthProfile.lon} />

      {personalDay && personalDayMeaning && (
        <Link to="/numerology" className="block">
          <Card interactive>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-ink-muted">
                <Hash className="size-4 text-accent" strokeWidth={1.75} />
                <span className="text-xs font-semibold uppercase tracking-[0.08em]">Personal Day</span>
              </div>
              <button
                onClick={shareDailyCard}
                disabled={dailyCardStatus === 'working'}
                className="flex items-center gap-1 text-xs text-ink-faint hover:text-ink"
              >
                <Share2 className="size-3.5" strokeWidth={1.75} />
                {dailyCardStatus === 'working' ? 'Preparing…' : dailyCardStatus === 'downloaded' ? 'Downloaded!' : 'Share'}
              </button>
            </div>
            {/* NumberOrb reused as-is from the Numerology page redesign — same "restrained warm
                glow + orbit ring" geometry the brief asks for, not a new visual language. */}
            <div className="mt-3 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <NumberOrb value={personalDay.value} isMaster={personalDay.isMaster} size="lg" />
              <div className="min-w-0">
                <p className="font-display text-xl text-ink">{personalDayMeaning.title}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {personalDayMeaning.positiveTraits[0]}. See your full numerology reading →
                </p>
              </div>
            </div>
          </Card>

          <div className="pointer-events-none fixed left-[-9999px] top-0" aria-hidden="true">
            <ShareCard
              ref={dailyCardRef}
              variant="personalDay"
              data={{
                dateLabel: today,
                value: personalDay.value,
                isMaster: personalDay.isMaster,
                title: personalDayMeaning.title,
                blurb: personalDayMeaning.positiveTraits[0] ?? '',
              }}
            />
          </div>
        </Link>
      )}

      {transits && (
        <Card interactive>
          <div className="flex items-center gap-2 text-ink-muted">
            <Orbit className="size-4 text-accent" strokeWidth={1.75} />
            <span className="text-xs font-semibold uppercase tracking-[0.08em]">Today's Sky</span>
          </div>
          <p className="mt-1 text-sm text-ink-muted">Current cosmic atmosphere</p>

          {transits.sadeSati.active && transits.sadeSati.phase && (
            <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-ink">
              <GlossaryTerm term="sade sati">Sade Sati</GlossaryTerm> — Saturn transiting{' '}
              {SADE_SATI_LABEL[transits.sadeSati.phase]} from your natal Moon.
            </div>
          )}

          {/* Editorial row per planet — Planet -> Sign -> context — instead of three boxed cells. */}
          <div className="mt-4 divide-y divide-line">
            {(['Moon', 'Jupiter', 'Saturn'] as const).map((planet) => {
              const p = transits.placements.find((t) => t.planet === planet)
              if (!p) return null
              const rashi = RASHIS[p.rashiIndex]
              return (
                <div
                  key={planet}
                  className="group flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm first:pt-0 last:pb-0"
                >
                  <span className="shrink-0 whitespace-nowrap font-medium text-ink">Transiting {planet}</span>
                  <span className="text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5">
                    →
                  </span>
                  <span className="text-ink">
                    {rashi.symbol} {rashi.name}
                    {p.retrograde && (
                      <span className="ml-1 text-ink-faint">
                        (<GlossaryTerm term="retrograde">retrograde</GlossaryTerm>)
                      </span>
                    )}
                  </span>
                  <span className="text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5">
                    →
                  </span>
                  <span className="text-ink-muted">{ordinal(p.houseFromMoon)} from your Moon</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {(loadingReading || reading) && (
        <div>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
            Your day, decoded
          </p>

          {loadingReading && !reading && (
            <div className="space-y-4">
              <Card>
                <Skeleton className="h-3 w-28" />
                <Skeleton className="mt-4 h-5 w-full" />
                <Skeleton className="mt-2 h-5 w-4/5" />
              </Card>
              <div className="grid gap-4 sm:grid-cols-3">
                {SECONDARY_FOCUS.map(({ key }) => (
                  <Card key={key}>
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="mt-3 h-4 w-full" />
                    <Skeleton className="mt-1.5 h-4 w-3/4" />
                  </Card>
                ))}
              </div>
            </div>
          )}

          {reading && (
            <div className="space-y-4">
              {/* Primary: Today's Focus gets the visual weight — bigger icon chip, larger serif
                  text, full-width — everything else in the brief's "occupy more visual space if
                  appropriate" instruction. */}
              <Reveal>
                <Card interactive className="group">
                  <div className="flex items-center gap-3">
                    <span className={cn('flex size-9 items-center justify-center rounded-full', PRIMARY_FOCUS.halo)}>
                      <PRIMARY_FOCUS.Icon
                        className={cn('size-4 transition-transform duration-300 group-hover:scale-110', PRIMARY_FOCUS.tint)}
                        strokeWidth={1.75}
                      />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">
                      {PRIMARY_FOCUS.label}
                    </span>
                  </div>
                  <p className="mt-4 max-w-2xl font-display text-xl leading-snug text-ink">
                    {highlightGlossaryTerms(reading[PRIMARY_FOCUS.key])}
                  </p>
                </Card>
              </Reveal>

              <div className="grid gap-4 sm:grid-cols-3">
                {SECONDARY_FOCUS.map(({ key, label, Icon, tint, halo }, i) => (
                  <Reveal key={key} delay={0.08 + i * 0.06}>
                    <Card interactive className="group h-full">
                      <div className="flex items-center gap-2.5">
                        <span className={cn('flex size-7 items-center justify-center rounded-full', halo)}>
                          <Icon
                            className={cn('size-3.5 transition-transform duration-300 group-hover:scale-110', tint)}
                            strokeWidth={1.75}
                          />
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                          {label}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-ink">{highlightGlossaryTerms(reading[key])}</p>
                    </Card>
                  </Reveal>
                ))}
              </div>
            </div>
          )}
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

      <Card interactive>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" strokeWidth={1.75} />
            <h2 className="font-display text-lg">Weekly Deep-Dive</h2>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="mt-5">
            {/* Editorial reading width, not a full-bleed dashboard card — and the opening
                paragraph (this report's own throughline/theme) gets a larger serif treatment
                rather than reading as identical body text to the three that follow it. No new
                section labels invented here: there's no distinct "theme" vs "influences" field
                in the data, just four paragraphs, so only real structure (first vs. rest) is used. */}
            <div className="max-w-2xl space-y-4">
              {weeklyReport.body.split('\n').filter(Boolean).map((paragraph, i) => (
                <Fragment key={i}>
                  <p
                    className={
                      i === 0 ? 'font-display text-lg leading-snug text-ink' : 'text-[15px] leading-relaxed text-ink-muted'
                    }
                  >
                    {highlightGlossaryTerms(paragraph)}
                  </p>
                  {/* A real pull-quote, not decoration for its own sake: the week's first
                      highlight, already-generated real data, given the visual weight of an
                      editorial callout instead of only appearing lower in a bulleted list. */}
                  {i === 1 && weeklyReport.highlights[0] && (
                    <p className="my-2 border-l-2 border-accent/40 pl-4 font-display text-xl italic leading-snug text-ink">
                      <span aria-hidden="true" className="mr-0.5 text-accent">
                        "
                      </span>
                      {weeklyReport.highlights[0]}
                      <span aria-hidden="true" className="text-accent">
                        "
                      </span>
                    </p>
                  )}
                </Fragment>
              ))}
            </div>

            {(weeklyReport.highlights.length > 1 || weeklyReport.watch_outs.length > 0) && (
              <div className="mt-6 grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
                {weeklyReport.highlights.length > 1 && (
                  <div>
                    <div className="flex items-center gap-2 text-positive">
                      <ThumbsUp className="size-4" strokeWidth={1.75} />
                      <span className="text-xs font-semibold uppercase tracking-[0.08em]">Good for you this week</span>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {weeklyReport.highlights.slice(1).map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm text-ink">
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-positive" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {weeklyReport.watch_outs.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-ink-faint">
                      <ThumbsDown className="size-4" strokeWidth={1.75} />
                      <span className="text-xs font-semibold uppercase tracking-[0.08em]">Better to avoid</span>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {weeklyReport.watch_outs.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm text-ink">
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-faint" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </Card>
    </div>
  )
}
