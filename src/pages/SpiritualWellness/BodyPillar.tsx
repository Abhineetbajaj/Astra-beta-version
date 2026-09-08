// Body pillar — medical/wellness astrology. The generation logic, edge function, table, disclaimers
// and long-form reading are all unchanged; what changed is presentation. Previously this was one AI
// paragraph and nothing else. Now the structured facts the `medical-reading` edge function already
// computes and stores (`indications`: ascendant-lord vitality, per-house afflicted/mitigated flags,
// rest-prone dasha classification) are surfaced as scannable signals instead of being written into
// prose and discarded, and a natal-dignity fallback means the leading signal works with no Premium
// and no generated reading at all.
//
// Everything here is either already-computed real data or a clearly-stated classical rule. Nothing
// is fabricated to fill space: each section below renders only when its real signal genuinely
// applies, and simply doesn't appear when it doesn't.
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { HeartPulse, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import { callEdgeFunction } from '@/lib/edgeFunctions'
import { highlightGlossaryTerms } from '@/lib/highlightGlossaryTerms'
import { currentDashaLords } from '@/astro-engine'
import { computeTransits } from '@/astro-engine/transits'
import { sunriseUTC, sunsetUTC } from '@/astro-engine/sunTimes'
import {
  rahuKaal,
  choghadiyaForDay,
  choghadiyaForNight,
  currentChoghadiya,
  CHOGHADIYA_BLURBS,
} from '@/astro-engine/muhurta'
import type { NatalChart } from '@/astro-engine/types'
import { RASHIS } from '@/data/rashis'
import { PLANET_COLORS } from '@/data/planetColors'
import { MANTRA_PLANETS } from '@/data/meditationCategories'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'
import Reveal from '@/components/motion/Reveal'
import BodySignalGlyph, { type VitalityTone } from '@/components/wellness/BodySignalGlyph'
import { cn } from '@/lib/cn'
import type { MedicalReadingRow } from '@/types/db'
import type { Pillar } from '@/pages/SpiritualWellness/SpiritualWellnessPage'
import type { MindAutoOpen } from '@/pages/SpiritualWellness/MindPillar'

const DISCLAIMER =
  'Not medical advice or diagnosis — a traditional astrological perspective only. Consult a healthcare professional for real health concerns.'

/** Soft, non-diagnostic themes for the three classical health houses. These describe pacing and
    attention, never a body part, condition, or outcome — the same limit the edge function's own
    prompt is held to. Keyed to the real `afflicted && !mitigated` flags already computed there. */
const HOUSE_WATCH_THEME: Record<number, string> = {
  6: 'Daily routine and workload may feel heavier than usual.',
  8: 'This may be a season for deeper rest, not just more sleep.',
  12: 'Worth watching for overextension — rest is doing real work right now.',
}

const VITALITY_COPY: Record<VitalityTone, { headline: string; support: string }> = {
  supported: {
    headline: 'A well-supported stretch',
    support: 'Traditionally a period that carries its own momentum — a good time to build consistency.',
  },
  steady: {
    headline: 'Steady',
    support: 'No strong push in either direction — routine and pacing matter more than intensity.',
  },
  gentle: {
    headline: 'A stretch to be gentler with yourself',
    support: 'Traditionally a period that asks for more recovery than usual — not a warning, a pacing cue.',
  },
}

function toneFromDignity(dignity: string): VitalityTone | null {
  if (dignity === 'exalted' || dignity === 'own') return 'supported'
  if (dignity === 'debilitated') return 'gentle'
  if (dignity === 'neutral') return 'steady'
  return null
}

/** The edge function's prompt explicitly asks the model to close with "one grounded, practical
    reflection PROMPT about pacing or self-care", and to end with the disclaimer verbatim on its own
    line. The disclaimer suffix is an exact, guaranteed match; the closing reflection is not formally
    delimited, so this takes the last sentence after stripping it — approximate by nature, with the
    whole remaining text as a safe fallback rather than risking an empty result. */
function extractClosingReflection(body: string, disclaimer: string): string | null {
  const withoutDisclaimer = body.endsWith(disclaimer) ? body.slice(0, body.length - disclaimer.length) : body
  const trimmed = withoutDisclaimer.trim()
  if (!trimmed) return null
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean)
  return sentences[sentences.length - 1] ?? trimmed
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{children}</h3>
}

function InsightChip({ label, value, swatch }: { label: string; value: string; swatch?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line px-3.5 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-ink">
        {swatch && (
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-full ring-1 ring-line-strong"
            style={{ backgroundColor: swatch }}
          />
        )}
        {value}
      </p>
    </div>
  )
}

interface BodyPillarProps {
  chart: NatalChart | null
  chartLoading: boolean
  onExplore: (pillar: Pillar, autoOpen?: MindAutoOpen) => void
}

export default function BodyPillar({ chart, chartLoading, onExplore }: BodyPillarProps) {
  const session = useAuthStore((s) => s.session)
  const isPremium = useAuthStore((s) => s.isPremium)
  const selfBirthProfile = useAuthStore((s) => s.selfBirthProfile)
  const [reading, setReading] = useState<MedicalReadingRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!session) return setLoadingExisting(false)
    let cancelled = false
    supabase
      .from('medical_readings')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (data) setReading(data as MedicalReadingRow)
        setLoadingExisting(false)
      })
    return () => {
      cancelled = true
    }
  }, [session])

  async function generate() {
    if (!selfBirthProfile) return
    setLoading(true)
    setError(null)
    try {
      const { reading } = await callEdgeFunction<{ reading: MedicalReadingRow }>('medical-reading', {
        birthProfileId: selfBirthProfile.id,
      })
      setReading(reading)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate a reading.')
    } finally {
      setLoading(false)
    }
  }

  // One `now` per mount, same pattern TimingCard already uses for the identical muhurta maths.
  const now = useMemo(() => new Date(), [])
  const maha = chart ? (currentDashaLords(chart.dashas, now)?.maha ?? null) : null

  // Prefer the richer signal the edge function already computed and stored; fall back to the current
  // dasha lord's own natal dignity so this works with no Premium and no generated reading.
  const vitality = useMemo((): VitalityTone | null => {
    const stored = reading?.indications?.ascendantLordVitality
    if (stored && 'dignity' in stored && typeof stored.dignity === 'string') {
      const tone = toneFromDignity(stored.dignity)
      if (tone) return tone
    }
    if (maha && chart) {
      const natal = chart.placements.find((p) => p.planet === maha)
      if (natal) return toneFromDignity(natal.dignity)
    }
    return null
  }, [reading, maha, chart])

  const moonElement = useMemo(() => {
    if (!chart) return null
    const natalMoon = chart.placements.find((p) => p.planet === 'Moon')
    if (!natalMoon) return null
    const transits = computeTransits(chart.ascendant?.rashiIndex ?? null, natalMoon.rashiIndex, now)
    const transitMoon = transits.placements.find((p) => p.planet === 'Moon')
    return transitMoon ? RASHIS[transitMoon.rashiIndex].element : null
  }, [chart, now])

  // Same functions, same inputs TimingCard uses on the Dashboard — one derived line here rather than
  // a second copy of the full timeline.
  const muhurta = useMemo(() => {
    if (!selfBirthProfile) return null
    const sunrise = sunriseUTC(now, selfBirthProfile.lat, selfBirthProfile.lon)
    const sunset = sunsetUTC(now, selfBirthProfile.lat, selfBirthProfile.lon)
    if (!sunrise || !sunset) return null
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const nextSunrise = sunriseUTC(tomorrow, selfBirthProfile.lat, selfBirthProfile.lon)
    if (!nextSunrise) return null
    const weekday = sunrise.getUTCDay()
    const dayPeriods = choghadiyaForDay(sunrise, sunset, weekday)
    const nightPeriods = choghadiyaForNight(sunset, nextSunrise, weekday)
    const rahu = rahuKaal(sunrise, sunset, weekday)
    return {
      current: currentChoghadiya([...dayPeriods, ...nightPeriods], now),
      inRahuKaal: now >= rahu.start && now < rahu.end,
    }
  }, [selfBirthProfile, now])

  const watchLines = (reading?.indications?.houseLords ?? [])
    .filter((l) => l.afflicted && !l.mitigated)
    .map((l) => HOUSE_WATCH_THEME[l.house])
    .filter((line): line is string => Boolean(line))

  const restProne =
    reading?.indications?.restProneperiods?.some(
      (p) => p.lord === reading.indications?.currentPeriodOutlook?.mahadashaLord && p.classification === 'rest-prone',
    ) ?? false

  const avoidLine = muhurta?.inRahuKaal
    ? "You're inside today's Rahu Kaal window — traditionally a time to avoid starting anything demanding."
    : muhurta?.current && !muhurta.current.auspicious
      ? CHOGHADIYA_BLURBS[muhurta.current.name]
      : null

  const smallWin = muhurta?.current?.auspicious ? CHOGHADIYA_BLURBS[muhurta.current.name] : null
  const closingReflection = reading ? extractClosingReflection(reading.body, reading.disclaimer) : null
  const colour = maha ? PLANET_COLORS[maha] : null
  const supportiveHabit = maha ? (MANTRA_PLANETS.find((m) => m.planet === maha)?.whenToUse ?? null) : null
  const resolvingSignal = chartLoading && !chart

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-body-soft px-5 py-4">
        <div className="flex items-center gap-2 text-body-strong">
          <HeartPulse className="size-5" strokeWidth={1.75} />
          <span className="text-xs font-semibold uppercase tracking-wide">Body</span>
        </div>
        <p className="mt-1.5 text-sm text-ink-muted">
          General energy patterns from the 6th, 8th, and 12th houses and dasha timing — soft, reflective language, never a diagnosis.
        </p>
      </div>

      <Reveal>
        <Card
          interactive={!!vitality}
          className="flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:gap-6 sm:p-6 sm:text-left"
        >
          {resolvingSignal ? (
            <Skeleton className="size-16 shrink-0 rounded-full sm:size-[84px]" />
          ) : vitality ? (
            <BodySignalGlyph tone={vitality} className="size-16 shrink-0 sm:size-[84px]" />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-body-soft sm:size-[84px]">
              <HeartPulse className="size-6 text-body" strokeWidth={1.5} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">
              Your body focus right now
            </p>
            {resolvingSignal ? (
              <div className="mt-2 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : vitality ? (
              <>
                <p className="mt-1 font-display text-xl leading-snug text-ink">{VITALITY_COPY[vitality].headline}</p>
                <p className="mt-1.5 text-sm text-ink-muted">{VITALITY_COPY[vitality].support}</p>
                {restProne && (
                  <p className="mt-1.5 text-sm text-ink-muted">
                    Your current Mahadasha is one of the periods traditionally read as more rest-prone than steady.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm text-ink-muted">
                Compute your birth chart to see what your current period asks of you physically.
              </p>
            )}
          </div>
        </Card>
      </Reveal>

      <DisclaimerBanner text={DISCLAIMER} />

      {watchLines.length > 0 && (
        <section>
          <SectionHeading>Be mindful of</SectionHeading>
          <ul className="mt-3 space-y-2">
            {watchLines.map((line) => (
              <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-ink">
                <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-body" />
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}

      {avoidLine && (
        <section>
          <SectionHeading>Better to avoid right now</SectionHeading>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{avoidLine}</p>
        </section>
      )}

      <section>
        <SectionHeading>Your best move</SectionHeading>
        {closingReflection ? (
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink">{closingReflection}</p>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Today's guided reflection is built from the same chart this page reads from.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => onExplore('mind')}>
              Open today's reflection →
            </Button>
          </>
        )}
      </section>

      {(moonElement || colour || supportiveHabit || smallWin) && (
        <section>
          <SectionHeading>Small discoveries</SectionHeading>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {moonElement && <InsightChip label="Today's element" value={moonElement} />}
            {colour && <InsightChip label="Supportive colour" value={colour.name} swatch={colour.hex} />}
            {supportiveHabit && <InsightChip label="Supportive habit" value={supportiveHabit} />}
            {smallWin && <InsightChip label="Small win" value={smallWin} />}
          </div>
        </section>
      )}

      <section>
        <SectionHeading>Understand the astrology</SectionHeading>
        <div className="mt-3">
          {!isPremium ? (
            <Card className="border-body/30 text-center">
              <Lock className="mx-auto size-5 text-body" strokeWidth={1.75} />
              <h2 className="mt-3 font-display text-lg">Wellness readings are part of Astra Premium</h2>
              <p className="mt-1 text-sm text-ink-muted">
                6th/8th/12th house patterns and dasha timing, in soft, reflective language.
              </p>
              <Link to="/pricing">
                <Button variant="accent" size="lg" className="mt-4 w-full">
                  See Premium →
                </Button>
              </Link>
            </Card>
          ) : (
            <Card>
              <h2 className="font-display text-lg">Your wellness reading</h2>
              <Button
                variant={reading ? 'outline' : 'accent'}
                size="lg"
                className="mt-4"
                onClick={generate}
                disabled={loading || loadingExisting}
              >
                {loading ? 'Reading your chart…' : reading ? 'Generate a fresh reading' : 'Generate my wellness reading'}
              </Button>
              {error && (
                <div className="mt-3 rounded-xl border border-negative/30 bg-negative/5 px-4 py-3">
                  <p className="text-sm text-negative">{error}</p>
                  <button onClick={generate} className="mt-2 text-sm text-ink-muted underline hover:text-ink">
                    Try again
                  </button>
                </div>
              )}
              {(loading || loadingExisting) && !reading && (
                <div className="mt-5 space-y-2 border-t border-line pt-5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              )}
              {reading && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mt-5 border-t border-line pt-5"
                >
                  <p className={cn('max-w-2xl text-[15px] leading-relaxed text-ink', !expanded && 'line-clamp-4')}>
                    {highlightGlossaryTerms(reading.body)}
                  </p>
                  <button
                    onClick={() => setExpanded((e) => !e)}
                    className="mt-2 rounded text-sm text-ink-muted underline hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                  >
                    {expanded ? 'Show less' : 'Read the full reading'}
                  </button>
                  <DisclaimerBanner text={reading.disclaimer} className="mt-4" />
                </motion.div>
              )}
            </Card>
          )}
        </div>
      </section>
    </div>
  )
}
