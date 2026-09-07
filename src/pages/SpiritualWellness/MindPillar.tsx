// Mind pillar — the former standalone "Listen" page, unchanged in substance (same tracks, same
// RLS gating, same hooks), just re-themed with the Mind pillar's colour and folded into the
// Spiritual Wellness shell instead of living at its own /listen route.
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Headphones, Lock, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  useWeeklyMeditationTrack,
  useUpcomingPanchangTrack,
  useMeditationHistory,
  useAccessibleLibraryKeys,
  fetchMeditationTrack,
} from '@/lib/useMeditationTracks'
import { MEDITATION_CATEGORIES, NEED_TAGS, MANTRA_PLANETS } from '@/data/meditationCategories'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'
import type { MeditationTrackRow } from '@/types/db'
import TrackReader from '@/pages/SpiritualWellness/TrackReader'

const DISCLAIMER =
  'Reflection is a reflective, spiritual practice — not a substitute for medical or mental health care. If you\'re struggling, please reach out to a real professional.'
const DISCLAIMER_DISMISSED_KEY = 'astra-listen-disclaimer-dismissed'

function TeaserTile({ label, locked, onTap }: { label: string; locked: boolean; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-left text-sm hover:border-mind/40 hover:bg-mind-soft/40"
    >
      {label}
      {locked && <Lock className="size-3.5 text-ink-faint" strokeWidth={1.75} />}
    </button>
  )
}

/** What to open on mount, when the user arrives here already having chosen something on the front
    door — 'today' seeds directly from the already-resolved `todayTrack` prop (no extra fetch); a
    need/mantra request runs through the exact same `openLibraryTrack` lookup a normal in-pillar tap
    already uses, so the front door never needs its own copy of that fetch-or-show-locked logic. */
export type MindAutoOpen = { kind: 'today' } | { kind: 'need' | 'mantra'; key: string; label: string }

interface MindPillarProps {
  /** Fetched once by the parent page (shared with the front door's Ruling Energy card) rather than
      re-fetched here — same track either way, no reason for two queries. */
  todayTrack: MeditationTrackRow | null | undefined
  autoOpen?: MindAutoOpen | null
}

export default function MindPillar({ todayTrack, autoOpen = null }: MindPillarProps) {
  const session = useAuthStore((s) => s.session)
  const isPremium = useAuthStore((s) => s.isPremium)

  const weeklyTrack = useWeeklyMeditationTrack()
  const panchangTrack = useUpcomingPanchangTrack()
  const history = useMeditationHistory(session?.user.id)

  const { keys: accessibleKeys } = useAccessibleLibraryKeys()
  const [selected, setSelected] = useState<MeditationTrackRow | null>(null)
  const [lockedTap, setLockedTap] = useState<string | null>(null)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const readerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!localStorage.getItem(DISCLAIMER_DISMISSED_KEY)) setShowDisclaimer(true)
  }, [])

  useEffect(() => {
    if (selected || lockedTap) readerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selected, lockedTap])

  function dismissDisclaimer() {
    localStorage.setItem(DISCLAIMER_DISMISSED_KEY, '1')
    setShowDisclaimer(false)
  }

  async function openLibraryTrack(category: 'need' | 'mantra', key: string, label: string) {
    setLockedTap(null)
    setSelected(null)
    const track = await fetchMeditationTrack(category, key)
    if (track) {
      setSelected(track)
    } else {
      setLockedTap(label)
    }
  }

  // Runs once on arrival, not on every `todayTrack` refetch — this is a "how did we get here" seed,
  // not a live sync (the still-loading `todayTrack === undefined` case simply resolves on its own
  // in the "For You Today" section below if the front door's CTA fired before the fetch settled).
  useEffect(() => {
    if (!autoOpen) return
    if (autoOpen.kind === 'today') {
      if (todayTrack) setSelected(todayTrack)
    } else {
      openLibraryTrack(autoOpen.kind, autoOpen.key, autoOpen.label)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!session) return null

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-mind-soft px-5 py-4">
        <div className="flex items-center gap-2 text-mind-strong">
          <Headphones className="size-5" strokeWidth={1.75} />
          <span className="text-xs font-semibold uppercase tracking-wide">Mind</span>
        </div>
        <p className="mt-1.5 text-sm text-ink-muted">
          Short guided reflections grounded in your real chart — not generic mindfulness.
        </p>
      </div>

      {showDisclaimer && (
        <div className="relative">
          <DisclaimerBanner text={DISCLAIMER} />
          <button onClick={dismissDisclaimer} className="absolute right-3 top-3 text-xs text-ink-faint underline hover:text-ink">
            Got it
          </button>
        </div>
      )}

      <div ref={readerRef} className="scroll-mt-24">
        {selected && <TrackReader track={selected} userId={session.user.id} onClose={() => setSelected(null)} />}

        {lockedTap && !selected && (
          <Card className="border-mind/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-mind" strokeWidth={1.75} />
                <p className="text-sm text-ink">
                  {isPremium ? (
                    <>
                      <span className="font-medium">{lockedTap}</span> hasn't been written yet — check back soon.
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{lockedTap}</span> is part of Astra Premium.
                    </>
                  )}
                </p>
              </div>
              {!isPremium && (
                <Link to="/pricing" className="text-sm text-mind hover:underline">
                  Upgrade →
                </Link>
              )}
            </div>
          </Card>
        )}
      </div>

      {history.length > 0 && (
        <section>
          <h3 className="font-display text-base">Continue listening</h3>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => setSelected(h.track)}
                className="shrink-0 rounded-xl border border-line px-4 py-3 text-left text-sm hover:border-mind/40 hover:bg-mind-soft/40"
              >
                {h.track.title}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="font-display text-base">{MEDITATION_CATEGORIES[0].label}</h3>
        {todayTrack === undefined && <Skeleton className="mt-3 h-16 w-full" />}
        {todayTrack === null && (
          <div className="mt-3 rounded-xl border border-dashed border-line px-4 py-3.5">
            <p className="text-sm text-ink-muted">
              Today's reflection is still being written — it's shaped around your current dasha period and the planets moving through your chart right now.
            </p>
          </div>
        )}
        {todayTrack && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSelected(todayTrack)}
            className="mt-3 flex w-full items-center justify-between rounded-xl border border-line px-4 py-3.5 text-left hover:border-mind/40 hover:bg-mind-soft/40"
          >
            <span className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 text-mind" strokeWidth={1.75} />
              {todayTrack.title}
            </span>
          </motion.button>
        )}
      </section>

      <section>
        <h3 className="font-display text-base">{MEDITATION_CATEGORIES[1].label}</h3>
        {weeklyTrack === undefined && <Skeleton className="mt-3 h-16 w-full" />}
        {weeklyTrack && (
          <button
            onClick={() => setSelected(weeklyTrack)}
            className="mt-3 flex w-full items-center justify-between rounded-xl border border-line px-4 py-3.5 text-left hover:border-mind/40 hover:bg-mind-soft/40"
          >
            <span className="text-sm">{weeklyTrack.title}</span>
          </button>
        )}
        {weeklyTrack === null && (
          <div className="mt-3 rounded-xl border border-dashed border-line px-4 py-3.5">
            <p className="text-sm text-ink-muted">
              This week's ritual is still being written — it follows the week's major planetary movement.
            </p>
          </div>
        )}
      </section>

      {panchangTrack && (
        <section>
          <h3 className="font-display text-base">{MEDITATION_CATEGORIES[2].label}</h3>
          <button
            onClick={() => setSelected(panchangTrack)}
            className="mt-3 flex w-full items-center justify-between rounded-xl border border-mind/30 bg-mind-soft px-4 py-3.5 text-left hover:bg-mind-soft/70"
          >
            <span className="text-sm">{panchangTrack.title}</span>
          </button>
        </section>
      )}

      <section>
        <h3 className="font-display text-base">{MEDITATION_CATEGORIES[3].label}</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {NEED_TAGS.map((need) => (
            <TeaserTile
              key={need.key}
              label={need.label}
              locked={!accessibleKeys.has(need.key)}
              onTap={() => openLibraryTrack('need', need.key, need.label)}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-display text-base">{MEDITATION_CATEGORIES[4].label}</h3>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {MANTRA_PLANETS.map((m) => (
            <button
              key={m.planet}
              onClick={() => openLibraryTrack('mantra', m.planet, `${m.planet} mantra`)}
              title={m.whenToUse}
              className="flex flex-col items-center gap-1 rounded-xl border border-line px-3 py-4 text-center hover:border-mind/40 hover:bg-mind-soft/40"
            >
              <span className="text-sm font-medium">{m.planet}</span>
              {!accessibleKeys.has(m.planet) && <Lock className="size-3 text-ink-faint" strokeWidth={1.75} />}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
