// Mind pillar — the former standalone "Listen" page, unchanged in substance (same tracks, same
// RLS gating, same hooks), just re-themed with the Mind pillar's colour and folded into the
// Spiritual Wellness shell instead of living at its own /listen route.
//
// Redesigned around one leading "today" card instead of five stacked, equally-weighted sections.
// The leading card follows a real fallback chain (today -> weekly -> the one guaranteed-free need
// sample -> an honest empty state) so the page's single most important moment is never a dead end,
// without ever inventing content that doesn't exist.
import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Headphones, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  useWeeklyMeditationTrack,
  useUpcomingPanchangTrack,
  useMeditationHistory,
  useAccessibleLibraryKeys,
  fetchMeditationTrack,
} from '@/lib/useMeditationTracks'
import { MANTRA_PLANETS } from '@/data/meditationCategories'
import { PLANET_GLYPH } from '@/components/chart/glyphs'
import type { PlanetId } from '@/astro-engine/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'
import Reveal from '@/components/motion/Reveal'
import RulingPlanetGlyph from '@/components/wellness/RulingPlanetGlyph'
import NeedPillRow from '@/components/wellness/NeedPillRow'
import type { MeditationTrackRow } from '@/types/db'
import TrackReader, { caption } from '@/pages/SpiritualWellness/TrackReader'

const DISCLAIMER =
  'Reflection is a reflective, spiritual practice — not a substitute for medical or mental health care. If you\'re struggling, please reach out to a real professional.'
const DISCLAIMER_DISMISSED_KEY = 'astra-listen-disclaimer-dismissed'
// The one need tag that's genuinely free for everyone (generate-meditation-library/index.ts:84) —
// the real, evergreen fallback when today's and this week's personalized content aren't ready yet.
const FREE_NEED_SAMPLE = 'stress-anxiety'

const LEADING_EYEBROW = { today: "Today's reflection", weekly: "This week's ritual", need: 'A place to start' } as const

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

  // Only chased once today's AND this week's real personalized content have both resolved to
  // "nothing yet" — a real evergreen sample instead of leaving the page's single most important
  // moment empty, per the redesign's own requirement. Never fires while either is still loading.
  const [fallbackNeedTrack, setFallbackNeedTrack] = useState<MeditationTrackRow | null | undefined>(undefined)
  useEffect(() => {
    if (todayTrack === undefined || weeklyTrack === undefined) return
    if (todayTrack || weeklyTrack) return
    let cancelled = false
    fetchMeditationTrack('need', FREE_NEED_SAMPLE).then((t) => {
      if (!cancelled) setFallbackNeedTrack(t)
    })
    return () => {
      cancelled = true
    }
  }, [todayTrack, weeklyTrack])

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
  // in the leading card below if the front door's CTA fired before the fetch settled).
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

  // The real fallback chain: today -> weekly -> the one free need sample -> honest empty. Each step
  // only resolves once the one before it is confirmed absent, so nothing here is guessed.
  const leading: { track: MeditationTrackRow; source: 'today' | 'weekly' | 'need' } | null = todayTrack
    ? { track: todayTrack, source: 'today' }
    : weeklyTrack
      ? { track: weeklyTrack, source: 'weekly' }
      : fallbackNeedTrack
        ? { track: fallbackNeedTrack, source: 'need' }
        : null
  const leadingResolving =
    todayTrack === undefined ||
    (todayTrack === null && weeklyTrack === undefined) ||
    (todayTrack === null && weeklyTrack === null && fallbackNeedTrack === undefined)
  // Weekly only gets its own row below if it wasn't already promoted to the leading card — showing
  // the same real track twice in one page would be exactly the repetition this redesign removes.
  const weeklyShownSeparately = leading?.source !== 'weekly'
  const planetContext = leading?.track.planet_context
  const leadingPlanet = planetContext && planetContext in PLANET_GLYPH ? (planetContext as PlanetId) : null

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
                <Link
                  to="/pricing"
                  className="rounded text-sm text-mind hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                >
                  Upgrade →
                </Link>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* The leading moment — one real signal, not five competing sections. Same visual language as
          the Wellness front door's Ruling Energy card (RulingPlanetGlyph, same layout), showing the
          next real layer down (the actual reflection) rather than repeating the same ruling-planet
          fact the front door already surfaced. */}
      {!selected && !lockedTap && (
        <Reveal>
          <Card
            interactive={!!leading}
            className="flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:gap-6 sm:p-6 sm:text-left"
          >
            {leadingResolving ? (
              <Skeleton className="size-16 shrink-0 rounded-full sm:size-[84px]" />
            ) : leadingPlanet ? (
              <RulingPlanetGlyph planet={leadingPlanet} className="size-16 shrink-0 sm:size-[84px]" />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-mind-soft sm:size-[84px]">
                <Headphones className="size-6 text-mind" strokeWidth={1.5} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              {leadingResolving ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-36" />
                </div>
              ) : leading ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">
                    {LEADING_EYEBROW[leading.source]}
                  </p>
                  <p className="mt-1 font-display text-xl leading-snug text-ink">{leading.track.title}</p>
                  {caption(leading.track) && <p className="mt-1.5 text-sm text-ink-muted">{caption(leading.track)}</p>}
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setSelected(leading.track)}>
                    Begin →
                  </Button>
                </>
              ) : (
                <p className="text-sm text-ink-muted">
                  Nothing personalized to show yet — try telling us what's on your mind below.
                </p>
              )}
            </div>
          </Card>
        </Reveal>
      )}

      {(weeklyShownSeparately && (weeklyTrack || weeklyTrack === undefined)) || panchangTrack ? (
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
            More from your chart this week
          </h3>
          <div className="space-y-2">
            {weeklyShownSeparately && weeklyTrack === undefined && <Skeleton className="h-14 w-full" />}
            {weeklyShownSeparately && weeklyTrack && (
              <button
                onClick={() => setSelected(weeklyTrack)}
                className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-left text-sm hover:border-mind/40 hover:bg-mind-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                {weeklyTrack.title}
              </button>
            )}
            {panchangTrack && (
              <button
                onClick={() => setSelected(panchangTrack)}
                className="flex w-full items-center justify-between rounded-xl border border-mind/30 bg-mind-soft px-4 py-3 text-left text-sm hover:bg-mind-soft/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                {panchangTrack.title}
              </button>
            )}
          </div>
        </section>
      ) : null}

      {history.length > 0 && (
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Continue listening</h3>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => setSelected(h.track)}
                className="shrink-0 rounded-xl border border-line px-4 py-3 text-left text-sm hover:border-mind/40 hover:bg-mind-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                {h.track.title}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">What's on your mind?</h3>
        <div className="mt-3">
          <NeedPillRow onSelect={(key, label) => openLibraryTrack('need', key, label)} />
        </div>
      </section>

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Graha Mantras</h3>
        {/* One divided list instead of a 3x5 button grid — same move already made for Numerology's
            Strengths list and the front door's own doorways. Each row shows the real `whenToUse`
            line inline rather than in a hover-only title tooltip, which was invisible on touch
            devices — a real, verified mobile gap this redesign fixes, not a cosmetic swap. */}
        <div className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {MANTRA_PLANETS.map((m) => (
            <button
              key={m.planet}
              onClick={() => openLibraryTrack('mantra', m.planet, `${m.planet} mantra`)}
              className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-mind-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{m.planet}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{m.whenToUse}</p>
              </div>
              {!accessibleKeys.has(m.planet) && <Lock className="size-3.5 shrink-0 text-ink-faint" strokeWidth={1.75} />}
              <ChevronRight
                className="size-4 shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5"
                strokeWidth={1.75}
              />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
