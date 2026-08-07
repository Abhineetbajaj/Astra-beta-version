import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Headphones, Lock, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useNatalChart } from '@/lib/useNatalChart'
import {
  useTodayMeditationTrack,
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
import TrackReader from '@/pages/Listen/TrackReader'

const DISCLAIMER =
  'Listen is a reflective, spiritual practice — not a substitute for medical or mental health care. If you\'re struggling, please reach out to a real professional.'
const DISCLAIMER_DISMISSED_KEY = 'astra-listen-disclaimer-dismissed'

function TeaserTile({ label, locked, onTap }: { label: string; locked: boolean; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-left text-sm hover:border-line-strong hover:bg-paper-raised"
    >
      {label}
      {locked && <Lock className="size-3.5 text-ink-faint" strokeWidth={1.75} />}
    </button>
  )
}

export default function ListenPage() {
  const session = useAuthStore((s) => s.session)
  const isPremium = useAuthStore((s) => s.isPremium)
  const selfBirthProfile = useAuthStore((s) => s.selfBirthProfile)
  const { chart } = useNatalChart('birth_profile', selfBirthProfile?.id)

  const todayTrack = useTodayMeditationTrack(chart)
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

  // The reader and the upsell both render at the top of the page while the tiles that open them
  // are near the bottom — without this, tapping a tile looks like nothing happened at all.
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
      // RLS hides premium rows from non-premium users, so a missing row means either locked or
      // not-yet-generated. Either way the user gets a real explanation, never a dead tap.
      setLockedTap(label)
    }
  }

  if (!session) return null

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-faint">Listen</p>
        <h1 className="mt-1 flex items-center gap-2 font-display text-4xl">
          <Headphones className="size-7 text-accent" strokeWidth={1.5} />
          Reflect
        </h1>
        <p className="mt-2 text-ink-muted">
          Short guided reflections grounded in your real chart — not generic mindfulness.
        </p>
      </div>

      {showDisclaimer && (
        <div className="relative">
          <DisclaimerBanner text={DISCLAIMER} />
          <button
            onClick={dismissDisclaimer}
            className="absolute right-3 top-3 text-xs text-ink-faint underline hover:text-ink"
          >
            Got it
          </button>
        </div>
      )}

      <div ref={readerRef} className="scroll-mt-24">
        {selected && <TrackReader track={selected} userId={session.user.id} onClose={() => setSelected(null)} />}

        {lockedTap && !selected && (
          <Card className="border-accent/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-accent" strokeWidth={1.75} />
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
                <Link to="/pricing" className="text-sm text-accent hover:underline">
                  Upgrade →
                </Link>
              )}
            </div>
          </Card>
        )}
      </div>

      {history.length > 0 && (
        <section>
          <h2 className="font-display text-lg">Continue listening</h2>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => setSelected(h.track)}
                className="shrink-0 rounded-xl border border-line px-4 py-3 text-left text-sm hover:border-line-strong hover:bg-paper-raised"
              >
                {h.track.title}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-lg">{MEDITATION_CATEGORIES[0].label}</h2>
        {todayTrack === undefined && <Skeleton className="mt-3 h-16 w-full" />}
        {todayTrack === null && (
          <div className="mt-3 rounded-xl border border-dashed border-line px-4 py-3.5">
            <p className="text-sm text-ink-muted">
              Today's reflection is still being written — it's shaped around your current dasha period and the
              planets moving through your chart right now.
            </p>
            <p className="mt-1 text-xs text-ink-faint">New reflections are prepared each morning.</p>
          </div>
        )}
        {todayTrack && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSelected(todayTrack)}
            className="mt-3 flex w-full items-center justify-between rounded-xl border border-line px-4 py-3.5 text-left hover:border-line-strong hover:bg-paper-raised"
          >
            <span className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 text-accent" strokeWidth={1.75} />
              {todayTrack.title}
            </span>
          </motion.button>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg">{MEDITATION_CATEGORIES[1].label}</h2>
        {weeklyTrack === undefined && <Skeleton className="mt-3 h-16 w-full" />}
        {weeklyTrack && (
          <button
            onClick={() => setSelected(weeklyTrack)}
            className="mt-3 flex w-full items-center justify-between rounded-xl border border-line px-4 py-3.5 text-left hover:border-line-strong hover:bg-paper-raised"
          >
            <span className="text-sm">{weeklyTrack.title}</span>
          </button>
        )}
        {weeklyTrack === null && (
          <div className="mt-3 rounded-xl border border-dashed border-line px-4 py-3.5">
            <p className="text-sm text-ink-muted">
              This week's ritual is still being written — it follows the week's major planetary movement, like a
              sign change, a retrograde turning, or the nakshatra the Moon is passing through.
            </p>
          </div>
        )}
      </section>

      {panchangTrack && (
        <section>
          <h2 className="font-display text-lg">{MEDITATION_CATEGORIES[2].label}</h2>
          <button
            onClick={() => setSelected(panchangTrack)}
            className="mt-3 flex w-full items-center justify-between rounded-xl border border-accent/30 bg-accent/5 px-4 py-3.5 text-left hover:bg-accent/10"
          >
            <span className="text-sm">{panchangTrack.title}</span>
          </button>
        </section>
      )}

      <section>
        <h2 className="font-display text-lg">{MEDITATION_CATEGORIES[3].label}</h2>
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
        <h2 className="font-display text-lg">{MEDITATION_CATEGORIES[4].label}</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {MANTRA_PLANETS.map((m) => (
            <button
              key={m.planet}
              onClick={() => openLibraryTrack('mantra', m.planet, `${m.planet} mantra`)}
              title={m.whenToUse}
              className="flex flex-col items-center gap-1 rounded-xl border border-line px-3 py-4 text-center hover:border-line-strong hover:bg-paper-raised"
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
