import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HeartPulse, Headphones, Flame, type LucideIcon } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useNatalChart } from '@/lib/useNatalChart'
import { useTodayMeditationTrack } from '@/lib/useMeditationTracks'
import { cn } from '@/lib/cn'
import BodyPillar from '@/pages/SpiritualWellness/BodyPillar'
import MindPillar from '@/pages/SpiritualWellness/MindPillar'
import type { MindAutoOpen } from '@/pages/SpiritualWellness/MindPillar'
import SpiritPillar from '@/pages/SpiritualWellness/SpiritPillar'
import WellnessFrontDoor from '@/pages/SpiritualWellness/WellnessFrontDoor'

export type Pillar = 'body' | 'mind' | 'spirit'

export const PILLARS: { key: Pillar; label: string; blurb: string; icon: LucideIcon }[] = [
  { key: 'body', label: 'Body', blurb: 'Wellness astrology', icon: HeartPulse },
  { key: 'mind', label: 'Mind', blurb: 'Reflection & ritual', icon: Headphones },
  { key: 'spirit', label: 'Spirit', blurb: 'Mantras & stotras', icon: Flame },
]

// Literal, non-interpolated class strings per pillar — Tailwind's scanner needs the full
// utility name to appear verbatim in source, so this can't be built from a template string.
// Split into background (goes on the sliding layoutId span behind the button) and text (goes on
// the button itself) — the button must stay transparent, or its own background would sit on top
// of and hide the animated span entirely, exactly like AppShell's nav ActivePill.
const ACTIVE_TAB_BG: Record<Pillar, string> = {
  body: 'bg-body shadow-sm',
  mind: 'bg-mind shadow-sm',
  spirit: 'bg-spirit shadow-sm',
}
const ACTIVE_TAB_TEXT: Record<Pillar, string> = {
  body: 'text-body-ink',
  mind: 'text-mind-ink',
  spirit: 'text-spirit-ink',
}

export default function SpiritualWellnessPage() {
  const [pillar, setPillar] = useState<Pillar | null>(null)
  const [mindAutoOpen, setMindAutoOpen] = useState<MindAutoOpen | null>(null)
  const selfBirthProfile = useAuthStore((s) => s.selfBirthProfile)
  const { chart, loading: chartLoading } = useNatalChart('birth_profile', selfBirthProfile?.id)
  // Lifted here (rather than fetched separately inside MindPillar) so the front door and the Mind
  // pillar share one query instead of two — same track either way.
  const todayTrack = useTodayMeditationTrack(chart)

  function enterPillar(next: Pillar, autoOpen?: MindAutoOpen) {
    setMindAutoOpen(autoOpen ?? null)
    setPillar(next)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {pillar === null ? (
        <WellnessFrontDoor
          chart={chart}
          chartLoading={chartLoading}
          todayTrack={todayTrack}
          onNavigate={enterPillar}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setPillar(null)}
              className="rounded text-sm text-ink-faint hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              ← Overview
            </button>
          </div>

          <div className="relative grid grid-cols-3 gap-2 rounded-2xl border border-line bg-paper-raised p-2">
            {PILLARS.map((p) => {
              const Icon = p.icon
              const active = pillar === p.key
              return (
                <button
                  key={p.key}
                  onClick={() => enterPillar(p.key)}
                  className={cn(
                    // isolate: without its own stacking context, this button's negative-z-index
                    // pill span would paint BEHIND the track div's own bg-paper-raised background
                    // (an ancestor's opaque background always covers a deeper negative-z-index
                    // descendant unless something between them establishes a stacking context) —
                    // confirmed by direct rendering test, not assumed.
                    'isolate relative flex flex-col items-center gap-1.5 rounded-xl px-3 py-3.5 transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
                    active ? ACTIVE_TAB_TEXT[p.key] : 'text-ink-muted hover:bg-paper',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="wellness-pillar-pill"
                      className={cn('absolute inset-0 -z-10 rounded-xl', ACTIVE_TAB_BG[p.key])}
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <Icon className="size-5" strokeWidth={1.75} />
                  <span className="text-sm font-semibold">{p.label}</span>
                  <span className={cn('text-[11px]', active ? 'opacity-80' : 'text-ink-faint')}>{p.blurb}</span>
                </button>
              )
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={pillar}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {pillar === 'body' && (
                <BodyPillar chart={chart} chartLoading={chartLoading} onExplore={enterPillar} />
              )}
              {pillar === 'mind' && <MindPillar todayTrack={todayTrack} autoOpen={mindAutoOpen} />}
              {pillar === 'spirit' && <SpiritPillar chart={chart} />}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  )
}
