// Loads a persisted chart back out of the DB into a compact, LLM-friendly facts
// object. Every reading/chat/compatibility/financial/medical function goes
// through this — none of them touch the astro-engine directly, so the facts
// they hand to Gemini are always exactly what was persisted by compute-chart.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { RASHIS } from './data/rashis.ts'
import { NAKSHATRAS } from './data/nakshatras.ts'

export interface ChartFacts {
  natalChartId: string
  computationBasis: string
  housesReliable: boolean
  ascendant: { rashi: string; degree: number } | null
  placements: {
    planet: string
    sign: string
    degree: number
    nakshatra: string
    pada: number
    house: number | null
    retrograde: boolean
    dignity: string
  }[]
  currentDasha: { mahadashaLord: string; antardashaLord: string | null }
  yogas: { key: string; name: string; category: string; notes: string | null }[]
}

/** Fetches the natal chart for a birth_profile or company_profile, computing it on the fly if missing. */
export async function loadChartFacts(
  admin: SupabaseClient,
  subjectType: 'birth_profile' | 'company_profile',
  subjectId: string,
): Promise<ChartFacts> {
  const subjectColumn = subjectType === 'birth_profile' ? 'birth_profile_id' : 'company_profile_id'

  const { data: natalChart, error } = await admin
    .from('natal_charts')
    .select('*')
    .eq(subjectColumn, subjectId)
    .single()

  if (error || !natalChart) {
    throw new Error(
      `No chart found for this ${subjectType.replace('_', ' ')}. Call compute-chart first — facts are never invented on the fly.`,
    )
  }

  const [{ data: placements }, { data: dashas }, { data: yogaRows }] = await Promise.all([
    admin.from('chart_placements').select('*').eq('natal_chart_id', natalChart.id),
    admin.from('dasha_periods').select('*').eq('natal_chart_id', natalChart.id),
    admin
      .from('chart_yogas')
      .select('yoga_key, notes, ref_yoga_definitions(name, category)')
      .eq('natal_chart_id', natalChart.id),
  ])

  const now = new Date()
  const activeMaha = (dashas ?? []).find(
    (d) => d.level === 'maha' && new Date(d.start_date) <= now && now < new Date(d.end_date),
  )
  const activeAntar = (dashas ?? []).find(
    (d) => d.level === 'antar' && d.parent_id === activeMaha?.id && new Date(d.start_date) <= now && now < new Date(d.end_date),
  )

  return {
    natalChartId: natalChart.id,
    computationBasis: natalChart.computation_basis,
    housesReliable: natalChart.houses_reliable,
    ascendant:
      natalChart.ascendant_rashi_index != null
        ? { rashi: RASHIS[natalChart.ascendant_rashi_index].name, degree: natalChart.ascendant_degree }
        : null,
    placements: (placements ?? []).map((p) => ({
      planet: p.planet,
      sign: RASHIS[p.sign_index].name,
      degree: p.degree_in_sign,
      nakshatra: NAKSHATRAS[p.nakshatra_index].name,
      pada: p.nakshatra_pada,
      house: p.house_index,
      retrograde: p.retrograde,
      dignity: p.dignity,
    })),
    currentDasha: {
      mahadashaLord: activeMaha?.lord ?? 'unknown',
      antardashaLord: activeAntar?.lord ?? null,
    },
    // deno-lint-ignore no-explicit-any
    yogas: (yogaRows ?? []).map((y: any) => ({
      key: y.yoga_key,
      name: y.ref_yoga_definitions?.name ?? y.yoga_key,
      category: y.ref_yoga_definitions?.category ?? 'general',
      notes: y.notes,
    })),
  }
}
