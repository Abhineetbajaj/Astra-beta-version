// The calm "front door" a user sees on arriving at /wellness, before choosing a Body/Mind/Spirit
// destination — one real, personalized, no-scroll insight (the active Mahadasha lord, the same
// signal Mind's "For You Today" and Spirit's "Prescribed for you" already key off), a "what do you
// need right now" prompt over the real Need library, and doorways into the three pillars. No
// fabricated content: every string here is either static UI chrome or lifted from data that
// already exists elsewhere in this section.
import type { NatalChart } from '@/astro-engine/types'
import { currentDashaLords } from '@/astro-engine'
import { PLANET_GLYPH } from '@/components/chart/glyphs'
import { MANTRA_PLANETS } from '@/data/meditationCategories'
import type { MeditationTrackRow } from '@/types/db'
import PageHero from '@/components/layout/PageHero'
import Reveal from '@/components/motion/Reveal'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import GlossaryTerm from '@/components/GlossaryTerm'
import RulingPlanetGlyph from '@/components/wellness/RulingPlanetGlyph'
import NeedPillRow from '@/components/wellness/NeedPillRow'
import { PILLARS, type Pillar } from '@/pages/SpiritualWellness/SpiritualWellnessPage'
import type { MindAutoOpen } from '@/pages/SpiritualWellness/MindPillar'
import { cn } from '@/lib/cn'
import { ChevronRight } from 'lucide-react'

// Verbatim (truncated at a natural clause boundary, not reworded) from each pillar's own banner
// copy in Body/MindPillar/SpiritPillar.tsx — no new marketing copy authored for the destinations.
const DOORWAY_TEASER: Record<Pillar, string> = {
  body: 'General energy patterns from the 6th, 8th, and 12th houses and dasha timing.',
  mind: 'Short guided reflections grounded in your real chart.',
  spirit: "Mantras and stotras, chosen by what's active in your chart.",
}

const DOORWAY_ICON_TINT: Record<Pillar, string> = {
  body: 'text-body',
  mind: 'text-mind',
  spirit: 'text-spirit',
}

interface WellnessFrontDoorProps {
  chart: NatalChart | null
  chartLoading: boolean
  todayTrack: MeditationTrackRow | null | undefined
  onNavigate: (pillar: Pillar, autoOpen?: MindAutoOpen) => void
}

export default function WellnessFrontDoor({ chart, chartLoading, todayTrack, onNavigate }: WellnessFrontDoorProps) {
  const active = chart ? currentDashaLords(chart.dashas, new Date()) : null
  const maha = active?.maha ?? null
  const explanation = maha ? MANTRA_PLANETS.find((m) => m.planet === maha)?.whenToUse : null
  // Distinguishes "still fetching" (show a skeleton) from "chart genuinely doesn't exist yet" (fall
  // back to the non-personalized state rather than skeleton-ing forever) — same tolerance the rest
  // of this section already has for users without a computed chart (e.g. SpiritPillar's
  // "Prescribed for you" block simply doesn't render when there's no chart).
  const stillResolving = chartLoading && !chart

  return (
    <div className="space-y-8">
      <PageHero
        align="center"
        eyebrow="Right now"
        title="Spiritual Wellness"
        subtitle="Body, mind, and spirit — one place to tend to all three."
        atmosphere={
          maha && (
            <span
              aria-hidden="true"
              className="select-none font-display text-[11rem] leading-none text-ink opacity-[0.045]"
            >
              {PLANET_GLYPH[maha]}
            </span>
          )
        }
      />

      <Reveal>
        <Card
          interactive
          className="flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:gap-6 sm:p-6 sm:text-left"
        >
          {maha ? (
            <RulingPlanetGlyph planet={maha} className="size-16 shrink-0 sm:size-[84px]" />
          ) : (
            <Skeleton className="size-16 shrink-0 rounded-full sm:size-[84px]" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">Your ruling energy</p>
            {maha ? (
              <>
                <p className="mt-1 font-display text-xl leading-snug text-ink">
                  You're in a {maha} <GlossaryTerm term="mahadasha">Mahadasha</GlossaryTerm> right now.
                </p>
                {explanation && <p className="mt-1.5 text-sm text-ink-muted">{explanation}</p>}
                {todayTrack === undefined && <Skeleton className="mt-3 h-8 w-40" />}
                {todayTrack === null && (
                  <p className="mt-3 text-xs text-ink-faint">Today's reflection is still being written.</p>
                )}
                {todayTrack && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => onNavigate('mind', { kind: 'today' })}
                  >
                    Open today's reflection →
                  </Button>
                )}
              </>
            ) : stillResolving ? (
              <div className="mt-2 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-36" />
              </div>
            ) : (
              <p className="mt-1 text-sm text-ink-muted">
                Compute your birth chart to see what's guiding your energy right now.
              </p>
            )}
          </div>
        </Card>
      </Reveal>

      <Reveal delay={0.06}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">
            What do you need right now?
          </p>
          <div className="mt-3">
            <NeedPillRow onSelect={(key, label) => onNavigate('mind', { kind: 'need', key, label })} />
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        {/* One bordered list, not three separate cards — three co-equal destinations don't need
            three boxes competing for the same visual weight; a divided list says "here's where to
            go next" without adding another layer of card-inside-card. */}
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper-raised/60">
          {PILLARS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className="group flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-paper-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <Icon className={cn('size-5 shrink-0', DOORWAY_ICON_TINT[key])} strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-base">{label}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{DOORWAY_TEASER[key]}</p>
              </div>
              <ChevronRight
                className="size-4 shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5"
                strokeWidth={1.75}
              />
            </button>
          ))}
        </div>
      </Reveal>
    </div>
  )
}
