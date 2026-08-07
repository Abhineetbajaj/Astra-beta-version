import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { NatalChart } from '@/astro-engine/types'
import { currentDashaLords } from '@/astro-engine'
import type { MeditationTrackRow, UserMeditationHistoryRow } from '@/types/db'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function isoWeekStartISO(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1))
  return d.toISOString().slice(0, 10)
}

/**
 * Reconstructs the same dedupe_key format generate-meditation-tracks/index.ts uses for the
 * "today" category — keep these two in sync (see that file's generateTodayTracks). Only "today"
 * needs this: "weekly" and "panchang" are looked up by date range instead, since there's exactly
 * one shared track per week/event, no per-user combination to disambiguate.
 */
function todayDedupeKey(chart: NatalChart): string | null {
  const active = currentDashaLords(chart.dashas, new Date())
  const moon = chart.placements.find((p) => p.planet === 'Moon')
  if (!active || !moon) return null
  return `today:${active.maha}:${active.antar}:${moon.rashiIndex}:${todayISO()}`
}

/** Fetches "For You Today" for this user's chart. Returns undefined while loading, null if not generated yet. */
export function useTodayMeditationTrack(chart: NatalChart | null): MeditationTrackRow | null | undefined {
  const [track, setTrack] = useState<MeditationTrackRow | null | undefined>(undefined)

  useEffect(() => {
    if (!chart) return
    const dedupeKey = todayDedupeKey(chart)
    if (!dedupeKey) return setTrack(null)

    let cancelled = false
    supabase
      .from('meditation_tracks')
      .select('*')
      .eq('dedupe_key', dedupeKey)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setTrack((data as MeditationTrackRow | null) ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [chart])

  return track
}

export function useWeeklyMeditationTrack(): MeditationTrackRow | null | undefined {
  const [track, setTrack] = useState<MeditationTrackRow | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('meditation_tracks')
      .select('*')
      .eq('category', 'weekly')
      .eq('valid_date', isoWeekStartISO(new Date()))
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setTrack((data as MeditationTrackRow | null) ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return track
}

/** Nearest Panchang-tagged track within the next 3 days, or null if none. */
export function useUpcomingPanchangTrack(): MeditationTrackRow | null | undefined {
  const [track, setTrack] = useState<MeditationTrackRow | null | undefined>(undefined)

  useEffect(() => {
    const today = new Date()
    const inThreeDays = new Date(today.getTime() + 3 * 86_400_000)
    let cancelled = false
    supabase
      .from('meditation_tracks')
      .select('*')
      .eq('category', 'panchang')
      .gte('valid_date', today.toISOString().slice(0, 10))
      .lte('valid_date', inThreeDays.toISOString().slice(0, 10))
      .order('valid_date', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setTrack((data as MeditationTrackRow | null) ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return track
}

/**
 * Which evergreen library tracks this user can actually open. RLS is the source of truth — a
 * non-premium user's query simply doesn't return locked rows — so "accessible" is just "came back
 * from the query", rather than the UI second-guessing subscription state itself.
 */
export function useAccessibleLibraryKeys(): { keys: Set<string>; loading: boolean } {
  const [keys, setKeys] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('meditation_tracks')
      .select('category, need_tag, planet_context')
      .in('category', ['need', 'mantra'])
      .then(({ data }) => {
        if (cancelled) return
        const rows = (data ?? []) as { category: string; need_tag: string | null; planet_context: string | null }[]
        setKeys(new Set(rows.map((r) => (r.category === 'need' ? r.need_tag : r.planet_context)).filter(Boolean) as string[]))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { keys, loading }
}

/** Looks up a single evergreen track by need tag or mantra planet — used when a tile is opened, not for the grid itself (the grid renders from the static taxonomy in meditationCategories.ts so locked tiles still show). */
export async function fetchMeditationTrack(
  category: 'need' | 'mantra',
  key: string,
): Promise<MeditationTrackRow | null> {
  const column = category === 'need' ? 'need_tag' : 'planet_context'
  const { data } = await supabase.from('meditation_tracks').select('*').eq('category', category).eq(column, key).maybeSingle()
  return (data as MeditationTrackRow | null) ?? null
}

export function useMeditationHistory(userId: string | undefined): (UserMeditationHistoryRow & { track: MeditationTrackRow })[] {
  const [history, setHistory] = useState<(UserMeditationHistoryRow & { track: MeditationTrackRow })[]>([])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase
      .from('user_meditation_history')
      .select('*, track:meditation_tracks(*)')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (!cancelled) setHistory((data as unknown as (UserMeditationHistoryRow & { track: MeditationTrackRow })[]) ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  return history
}

export async function logMeditationPlay(userId: string, trackId: string, completed: boolean): Promise<void> {
  await supabase
    .from('user_meditation_history')
    .upsert({ user_id: userId, track_id: trackId, played_at: new Date().toISOString(), completed }, { onConflict: 'user_id,track_id' })
}

export async function toggleMeditationFavorite(userId: string, trackId: string, favorited: boolean): Promise<void> {
  await supabase
    .from('user_meditation_history')
    .upsert({ user_id: userId, track_id: trackId, favorited }, { onConflict: 'user_id,track_id' })
}
