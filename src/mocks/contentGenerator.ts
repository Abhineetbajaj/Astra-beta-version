import type { NatalChart } from '@/astro-engine/types'
import { currentDashaLords } from '@/astro-engine'
import { RASHIS } from '@/data/rashis'
import { pick, todayKey } from '@/lib/seededHash'
import {
  DASHA_LORD_THEME,
  ELEMENT_MOOD,
  FOCUS_LINES,
  LOVE_LINES,
  CAREER_LINES,
  WATCH_LINES,
} from '@/mocks/readingTemplates'

export interface DailyReading {
  dateKey: string
  headline: string
  focus: string
  love: string
  career: string
  watchFor: string
}

function chartSeed(chart: NatalChart): string {
  // Stable per-chart seed so two people never get byte-identical phrasing by coincidence.
  return `${chart.lat.toFixed(2)}|${chart.lon.toFixed(2)}|${chart.birthMoment.getTime()}`
}

export function generateDailyReading(chart: NatalChart, at: Date = new Date()): DailyReading {
  const dateKey = todayKey(at)
  const seed = `${chartSeed(chart)}|${dateKey}`

  const active = currentDashaLords(chart.dashas, at)
  const dashaLord = active?.maha ?? chart.dashas[0].lord

  const moon = chart.placements.find((p) => p.planet === 'Moon')!
  const moonElement = RASHIS[moon.rashiIndex].element

  const theme = pick(DASHA_LORD_THEME[dashaLord], `${seed}|theme`)
  const mood = pick(ELEMENT_MOOD[moonElement], `${seed}|mood`)

  return {
    dateKey,
    headline: `Today leans into ${theme} — ${mood}.`,
    focus: pick(FOCUS_LINES, `${seed}|focus`),
    love: pick(LOVE_LINES, `${seed}|love`),
    career: pick(CAREER_LINES, `${seed}|career`),
    watchFor: pick(WATCH_LINES, `${seed}|watch`),
  }
}
