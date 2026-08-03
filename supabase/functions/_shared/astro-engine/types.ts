// Deno copy of src/astro-engine/types.ts — keep in sync; do not diverge silently.

export type PlanetId =
  | 'Sun'
  | 'Moon'
  | 'Mars'
  | 'Mercury'
  | 'Jupiter'
  | 'Venus'
  | 'Saturn'
  | 'Rahu'
  | 'Ketu'

export type Dignity = 'exalted' | 'debilitated' | 'own' | 'neutral'

export interface PlanetPlacement {
  planet: PlanetId
  tropicalLongitude: number
  siderealLongitude: number
  rashiIndex: number
  degreeInRashi: number
  nakshatraIndex: number
  nakshatraPada: 1 | 2 | 3 | 4
  houseIndex: number | null
  retrograde: boolean
  dignity: Dignity
}

export interface AscendantInfo {
  siderealLongitude: number
  rashiIndex: number
  degreeInRashi: number
}

export interface DashaPeriod {
  lord: PlanetId
  level: 'maha' | 'antar' | 'pratyantar'
  startDate: Date
  endDate: Date
  children?: DashaPeriod[]
}

export interface NatalChartInput {
  dateTimeUTC: Date
  lat: number
  lon: number
  timeKnown: boolean
}

export interface NatalChart {
  birthMoment: Date
  lat: number
  lon: number
  ayanamsaDeg: number
  placements: PlanetPlacement[]
  ascendant: AscendantInfo
  housesReliable: boolean
  dashas: DashaPeriod[]
}
