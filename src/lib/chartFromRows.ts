// Reconstructs the astro-engine's NatalChart shape from persisted DB rows, so the existing
// chart UI (NorthIndianChartSVG, PlacementsTable, DashaTimeline) can render server-computed facts
// without caring where they came from.

import type { AscendantInfo, DashaPeriod, NatalChart, PlanetPlacement } from '@/astro-engine/types'
import type { ChartPlacementRow, DashaPeriodRow, NatalChartRow } from '@/types/db'
import { degreeInRashi } from '@/data/rashis'

export function chartFromRows(
  natalChart: NatalChartRow,
  placementRows: ChartPlacementRow[],
  dashaRows: DashaPeriodRow[],
): NatalChart {
  const placements: PlanetPlacement[] = placementRows.map((p) => ({
    planet: p.planet as PlanetPlacement['planet'],
    tropicalLongitude: 0, // not persisted — sidereal is what the UI and every downstream fact use
    siderealLongitude: p.sign_index * 30 + p.degree_in_sign,
    rashiIndex: p.sign_index,
    degreeInRashi: p.degree_in_sign,
    nakshatraIndex: p.nakshatra_index,
    nakshatraPada: p.nakshatra_pada as 1 | 2 | 3 | 4,
    houseIndex: p.house_index,
    retrograde: p.retrograde,
    dignity: p.dignity,
  }))

  const ascendant: AscendantInfo | null =
    natalChart.ascendant_rashi_index != null
      ? {
          siderealLongitude: natalChart.ascendant_rashi_index * 30 + (natalChart.ascendant_degree ?? 0),
          rashiIndex: natalChart.ascendant_rashi_index,
          degreeInRashi: degreeInRashi(natalChart.ascendant_degree ?? 0),
        }
      : null

  const mahaRows = dashaRows.filter((d) => d.level === 'maha')
  const dashas: DashaPeriod[] = mahaRows.map((maha) => ({
    lord: maha.lord as DashaPeriod['lord'],
    level: 'maha',
    startDate: new Date(maha.start_date),
    endDate: new Date(maha.end_date),
    children: dashaRows
      .filter((d) => d.parent_id === maha.id)
      .map((antar) => ({
        lord: antar.lord as DashaPeriod['lord'],
        level: 'antar',
        startDate: new Date(antar.start_date),
        endDate: new Date(antar.end_date),
      })),
  }))

  return {
    birthMoment: new Date(natalChart.computed_at),
    lat: 0,
    lon: 0,
    ayanamsaDeg: natalChart.ayanamsa_deg,
    placements,
    ascendant: ascendant as AscendantInfo,
    housesReliable: natalChart.houses_reliable,
    dashas,
  }
}
