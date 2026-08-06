// Loads today's real transits (Gochara) for a subject's already-persisted natal chart. Kept
// separate from loadChartFacts.ts so that function's contract (persisted facts only) stays
// clean — transits are deliberately never persisted (they change daily/weekly), computed fresh
// on every call. Cheap pure math, no LLM involved.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { computeTransits } from './astro-engine/transits.ts'
import { RASHIS } from './data/rashis.ts'

export interface TransitFacts {
  computedAt: string
  placements: {
    planet: string
    sign: string
    houseFromAscendant: number | null
    houseFromMoon: number
    retrograde: boolean
  }[]
  sadeSati: { active: boolean; phase: 'rising' | 'peak' | 'setting' | null }
  jupiterTransitSignFromMoon: number
}

export async function loadTransitFacts(admin: SupabaseClient, natalChartId: string): Promise<TransitFacts> {
  const [{ data: chartRow }, { data: moonPlacement }] = await Promise.all([
    admin.from('natal_charts').select('ascendant_rashi_index').eq('id', natalChartId).single(),
    admin.from('chart_placements').select('sign_index').eq('natal_chart_id', natalChartId).eq('planet', 'Moon').single(),
  ])

  const ascendantRashiIndex = chartRow?.ascendant_rashi_index ?? null
  const natalMoonRashiIndex = moonPlacement?.sign_index
  if (natalMoonRashiIndex == null) {
    throw new Error('Cannot compute transits: natal Moon placement missing for this chart.')
  }

  const transits = computeTransits(ascendantRashiIndex, natalMoonRashiIndex, new Date())

  return {
    computedAt: transits.computedAt.toISOString(),
    placements: transits.placements.map((p) => ({
      planet: p.planet,
      sign: RASHIS[p.rashiIndex].name,
      houseFromAscendant: p.houseFromAscendant,
      houseFromMoon: p.houseFromMoon,
      retrograde: p.retrograde,
    })),
    sadeSati: transits.sadeSati,
    jupiterTransitSignFromMoon: transits.jupiterTransitHouseFromMoon,
  }
}
