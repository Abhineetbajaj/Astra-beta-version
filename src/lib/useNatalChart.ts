import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { chartFromRows } from '@/lib/chartFromRows'
import type { NatalChart } from '@/astro-engine/types'
import type { ChartPlacementRow, DashaPeriodRow, NatalChartRow } from '@/types/db'

interface UseNatalChartResult {
  chart: NatalChart | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/** Reads a persisted chart (birth_profile or company_profile subject) straight from the DB — never recomputes. */
export function useNatalChart(
  subjectType: 'birth_profile' | 'company_profile',
  subjectId: string | undefined,
): UseNatalChartResult {
  const [chart, setChart] = useState<NatalChart | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = useCallback(() => setReloadToken((t) => t + 1), [])

  useEffect(() => {
    if (!subjectId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    const column = subjectType === 'birth_profile' ? 'birth_profile_id' : 'company_profile_id'

    async function load() {
      const { data: natalChart, error: chartError } = await supabase
        .from('natal_charts')
        .select('*')
        .eq(column, subjectId)
        .maybeSingle()

      if (cancelled) return
      if (chartError || !natalChart) {
        setError(chartError?.message ?? 'No chart computed yet.')
        setChart(null)
        setLoading(false)
        return
      }

      const [{ data: placements }, { data: dashas }] = await Promise.all([
        supabase.from('chart_placements').select('*').eq('natal_chart_id', natalChart.id),
        supabase.from('dasha_periods').select('*').eq('natal_chart_id', natalChart.id),
      ])
      if (cancelled) return

      setChart(
        chartFromRows(
          natalChart as NatalChartRow,
          (placements ?? []) as ChartPlacementRow[],
          (dashas ?? []) as DashaPeriodRow[],
        ),
      )
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [subjectType, subjectId, reloadToken])

  return { chart, loading, error, refetch }
}
