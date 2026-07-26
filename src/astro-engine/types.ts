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
  /** Apparent geocentric tropical ecliptic longitude, true equinox of date, degrees [0,360). */
  tropicalLongitude: number
  /** Tropical longitude minus ayanamsa, degrees [0,360). */
  siderealLongitude: number
  rashiIndex: number
  degreeInRashi: number
  nakshatraIndex: number
  nakshatraPada: 1 | 2 | 3 | 4
  /** Whole-sign house number 1-12, or null when the birth time isn't reliable enough for houses. */
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
  /** Birth instant in UTC. */
  dateTimeUTC: Date
  lat: number
  lon: number
  /** When false, the ascendant/houses are unreliable and house-dependent content should be suppressed. */
  timeKnown: boolean
}

export interface NatalChart {
  birthMoment: Date
  lat: number
  lon: number
  ayanamsaDeg: number
  placements: PlanetPlacement[]
  ascendant: AscendantInfo | null
  housesReliable: boolean
  dashas: DashaPeriod[]
}
