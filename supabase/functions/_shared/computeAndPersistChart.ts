// Core chart-computation-and-persistence logic, shared by the compute-chart
// function (explicit "compute my chart" call) and any other function that
// needs to guarantee a chart exists for a subject (e.g. compatibility, which
// needs a chart for a just-entered "other person" profile). Always computes
// via the deterministic astro-engine — never invents facts, never asks an LLM.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { computeNatalChart, localSolarNoonUTC } from './astro-engine/index.ts'
import { detectWealthYogas } from './yogas.ts'

interface Subject {
  date: string
  time: string | null
  timeKnown: boolean
  lat: number
  lon: number
  utcOffsetMinutes: number
  placeName: string
}

function birthInstantUTC(s: Subject): Date {
  if (!s.timeKnown || !s.time) return localSolarNoonUTC(s.date, s.lon)
  // Postgres `time` columns round-trip as "HH:MM:SS" (e.g. "16:04:00"), not the "HH:mm" the
  // client sends — normalize before building the timestamp or this silently yields an Invalid Date.
  const hhmm = s.time.slice(0, 5)
  const naiveUTCMs = new Date(`${s.date}T${hhmm}:00.000Z`).getTime()
  return new Date(naiveUTCMs - s.utcOffsetMinutes * 60000)
}

export type SubjectType = 'birth_profile' | 'company_profile'

/** Computes and persists a chart for a subject, replacing any existing one. Returns the natal_chart id. */
export async function computeAndPersistChart(
  admin: SupabaseClient,
  subjectType: SubjectType,
  subjectId: string,
): Promise<string> {
  const table = subjectType === 'birth_profile' ? 'birth_profiles' : 'company_profiles'
  const { data: row, error: fetchError } = await admin.from(table).select('*').eq('id', subjectId).single()
  if (fetchError || !row) throw new Error(`${subjectType} not found`)

  const subject: Subject =
    subjectType === 'birth_profile'
      ? {
          date: row.date_of_birth,
          time: row.time_of_birth,
          timeKnown: row.time_known,
          lat: row.lat,
          lon: row.lon,
          utcOffsetMinutes: row.utc_offset_minutes,
          placeName: row.place_name,
        }
      : {
          date: row.incorporation_date,
          time: row.incorporation_time,
          timeKnown: row.time_known,
          lat: row.lat,
          lon: row.lon,
          utcOffsetMinutes: row.utc_offset_minutes,
          placeName: row.place_name,
        }

  const chart = computeNatalChart({
    dateTimeUTC: birthInstantUTC(subject),
    lat: subject.lat,
    lon: subject.lon,
    timeKnown: subject.timeKnown,
  })

  const subjectColumn = subjectType === 'birth_profile' ? 'birth_profile_id' : 'company_profile_id'
  await admin.from('natal_charts').delete().eq(subjectColumn, subjectId)

  const { data: natalChart, error: insertChartError } = await admin
    .from('natal_charts')
    .insert({
      [subjectColumn]: subjectId,
      ayanamsa_deg: chart.ayanamsaDeg,
      ascendant_rashi_index: chart.ascendant.rashiIndex,
      ascendant_degree: chart.ascendant.degreeInRashi,
      houses_reliable: chart.housesReliable,
      computation_basis: `Calculated from ${subject.placeName}, ${subject.date} — Lahiri ayanamsa, whole-sign houses`,
    })
    .select()
    .single()
  if (insertChartError || !natalChart) throw new Error(`Failed to insert natal_chart: ${insertChartError?.message}`)

  const placementRows = chart.placements.map((p) => ({
    natal_chart_id: natalChart.id,
    planet: p.planet,
    sign_index: p.rashiIndex,
    degree_in_sign: p.degreeInRashi,
    nakshatra_index: p.nakshatraIndex,
    nakshatra_pada: p.nakshatraPada,
    house_index: p.houseIndex,
    retrograde: p.retrograde,
    dignity: p.dignity,
  }))
  const { error: placementsError } = await admin.from('chart_placements').insert(placementRows)
  if (placementsError) throw new Error(`Failed to insert chart_placements: ${placementsError.message}`)

  for (const maha of chart.dashas) {
    const { data: mahaRow, error: mahaError } = await admin
      .from('dasha_periods')
      .insert({
        natal_chart_id: natalChart.id,
        level: 'maha',
        lord: maha.lord,
        start_date: maha.startDate.toISOString(),
        end_date: maha.endDate.toISOString(),
      })
      .select()
      .single()
    if (mahaError || !mahaRow) throw new Error(`Failed to insert mahadasha: ${mahaError?.message}`)

    const antarRows = (maha.children ?? []).map((antar) => ({
      natal_chart_id: natalChart.id,
      parent_id: mahaRow.id,
      level: 'antar' as const,
      lord: antar.lord,
      start_date: antar.startDate.toISOString(),
      end_date: antar.endDate.toISOString(),
    }))
    if (antarRows.length > 0) {
      const { error: antarError } = await admin.from('dasha_periods').insert(antarRows)
      if (antarError) throw new Error(`Failed to insert antardashas: ${antarError.message}`)
    }
  }

  const yogas = detectWealthYogas(chart.placements, chart.ascendant.rashiIndex)
  if (yogas.length > 0) {
    const { error: yogaError } = await admin
      .from('chart_yogas')
      .insert(yogas.map((y) => ({ natal_chart_id: natalChart.id, yoga_key: y.key, notes: y.notes })))
    if (yogaError) throw new Error(`Failed to insert chart_yogas: ${yogaError.message}`)
  }

  return natalChart.id
}

/** Returns the existing chart id for a subject, computing one if it doesn't exist yet. */
export async function ensureChart(admin: SupabaseClient, subjectType: SubjectType, subjectId: string): Promise<string> {
  const subjectColumn = subjectType === 'birth_profile' ? 'birth_profile_id' : 'company_profile_id'
  const { data: existing } = await admin
    .from('natal_charts')
    .select('id')
    .eq(subjectColumn, subjectId)
    .maybeSingle()
  if (existing) return existing.id
  return computeAndPersistChart(admin, subjectType, subjectId)
}
