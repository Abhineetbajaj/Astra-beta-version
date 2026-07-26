import { create } from 'zustand'
import { computeNatalChart, localSolarNoonUTC } from '@/astro-engine'
import type { NatalChart } from '@/astro-engine/types'
import type { BirthData } from '@/types/domain'

export function birthInstantUTC(b: BirthData): Date {
  if (b.timeAccuracy === 'unknown') {
    return localSolarNoonUTC(b.date, b.lon)
  }
  const naiveUTCMs = new Date(`${b.date}T${b.time}:00.000Z`).getTime()
  return new Date(naiveUTCMs - b.utcOffsetMinutes * 60000)
}

export function chartFromBirthData(b: BirthData): NatalChart {
  return computeNatalChart({
    dateTimeUTC: birthInstantUTC(b),
    lat: b.lat,
    lon: b.lon,
    timeKnown: b.timeAccuracy !== 'unknown',
  })
}

function keyFor(b: BirthData): string {
  return `${b.date}|${b.time}|${b.timeAccuracy}|${b.lat}|${b.lon}`
}

interface ChartState {
  chart: NatalChart | null
  chartKey: string | null
  ensureChart: (birthData: BirthData) => NatalChart
}

export const useChartStore = create<ChartState>((set, get) => ({
  chart: null,
  chartKey: null,
  ensureChart: (birthData) => {
    const key = keyFor(birthData)
    const state = get()
    if (state.chart && state.chartKey === key) return state.chart
    const chart = chartFromBirthData(birthData)
    set({ chart, chartKey: key })
    return chart
  },
}))
