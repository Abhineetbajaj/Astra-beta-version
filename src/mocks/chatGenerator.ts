import type { NatalChart, PlanetId } from '@/astro-engine/types'
import { currentDashaLords } from '@/astro-engine'
import { RASHIS, RASHI_LORD } from '@/data/rashis'
import { NAKSHATRAS } from '@/data/nakshatras'
import { PLANET_BLURB } from '@/mocks/planetBlurbs'
import { DASHA_LORD_THEME } from '@/mocks/readingTemplates'
import { pick } from '@/lib/seededHash'

export type ChatTopic = PlanetId | 'ascendant' | 'week' | 'overview' | null

export interface ChatReply {
  text: string
  topic: ChatTopic
}

const PLANET_KEYWORDS: Record<PlanetId, string[]> = {
  Sun: ['sun'],
  Moon: ['moon'],
  Mars: ['mars'],
  Mercury: ['mercury'],
  Jupiter: ['jupiter'],
  Venus: ['venus'],
  Saturn: ['saturn'],
  Rahu: ['rahu'],
  Ketu: ['ketu'],
}

const DAY_SUGGESTIONS = ['Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const

const DAY_LORD: Partial<Record<PlanetId, string>> = {
  Sun: 'Sunday',
  Moon: 'Monday',
  Mars: 'Tuesday',
  Mercury: 'Wednesday',
  Jupiter: 'Thursday',
  Venus: 'Friday',
  Saturn: 'Saturday',
}

const ELABORATE_KEYWORDS = [
  'elaborate', 'more detail', 'tell me more', 'go deeper', 'explain more',
  'expand', 'more about that', 'say more', 'go on', 'continue',
]

const EVERYTHING_KEYWORDS = [
  'everything', 'full picture', 'full chart', 'overview', 'summary', 'summarize',
  'all of it', 'whole chart', 'big picture',
]

const NEEDS_TOPIC_FALLBACKS = [
  "Elaborate on what, exactly? Name a planet, ask about your rising sign, or say \"give me the full picture\" and I'll go deeper.",
  "I've got nothing to expand on yet — ask about a specific planet or your ascendant first, then I can go further.",
] as const

const GENERIC_FALLBACKS = [
  (chart: NatalChart) => {
    const moon = chart.placements.find((p) => p.planet === 'Moon')!
    const nakshatra = NAKSHATRAS[moon.nakshatraIndex]
    return `Moon in ${RASHIS[moon.rashiIndex].name}, ${nakshatra.name} nakshatra — that tends to run on ${PLANET_BLURB.Moon}. Ask me about a specific planet, your rising sign, or say "give me the full picture."`
  },
  (chart: NatalChart) => {
    const active = currentDashaLords(chart.dashas, new Date())
    return `You're currently running a ${active?.maha} Mahadasha. Ask me what that means, name another planet, or say "give me the full picture" for a full readout.`
  },
  () =>
    'Not sure I caught that — try naming a planet (Saturn, Venus, your Moon…), asking about your rising sign, or asking about a decision you\'re weighing.',
] as const

function findNamedPlanet(message: string): PlanetId | null {
  const lower = message.toLowerCase()
  for (const [planet, keywords] of Object.entries(PLANET_KEYWORDS) as [PlanetId, string[]][]) {
    if (keywords.some((k) => lower.includes(k))) return planet
  }
  return null
}

function dignitySentence(placement: NatalChart['placements'][number]): string {
  if (placement.dignity === 'exalted') {
    return "It's exalted here, which classically means this comes more naturally to you than most."
  }
  if (placement.dignity === 'debilitated') {
    return "It's in its debilitation sign — classically that means this is an area you build rather than one that comes easily, not a weakness."
  }
  if (placement.dignity === 'own') {
    return "It's in its own sign, which classically gives it a stable, well-resourced footing."
  }
  return ''
}

function buildPlanetReply(planet: PlanetId, chart: NatalChart, elaborate: boolean): string {
  const placement = chart.placements.find((p) => p.planet === planet)!
  const rashi = RASHIS[placement.rashiIndex]
  const nakshatra = NAKSHATRAS[placement.nakshatraIndex]
  const active = currentDashaLords(chart.dashas, new Date())
  const isCurrentLord = active?.maha === planet || active?.antar === planet

  if (!elaborate) {
    return `Your ${planet} sits in ${rashi.name}, ${nakshatra.name} nakshatra — that placement leans toward ${PLANET_BLURB[planet]}. ${dignitySentence(placement)}`.trim()
  }

  const houseNote =
    chart.housesReliable && placement.houseIndex
      ? ` It sits in your ${placement.houseIndex}${ordinalSuffix(placement.houseIndex)} house.`
      : ''
  const retroNote = placement.retrograde
    ? ' It\'s retrograde, which classically turns this energy inward — more revisiting than initiating.'
    : ''
  const dashaNote = isCurrentLord
    ? ` And it's not background noise right now — ${planet} is actively running your current dasha, so this placement is especially live for you at the moment.`
    : ''

  return `More on your ${planet}: ${nakshatra.name} pada ${placement.nakshatraPada}, at ${placement.degreeInRashi.toFixed(1)}° ${rashi.name}.${houseNote}${retroNote}${dashaNote}`
}

function ordinalSuffix(n: number): string {
  if (n % 10 === 1 && n !== 11) return 'st'
  if (n % 10 === 2 && n !== 12) return 'nd'
  if (n % 10 === 3 && n !== 13) return 'rd'
  return 'th'
}

function buildAscendantReply(chart: NatalChart, elaborate: boolean): string {
  if (!chart.housesReliable || !chart.ascendant) {
    return "I can't read your ascendant reliably — your birth time is marked approximate, and the rising sign is the most time-sensitive part of a chart. Correct your birth time on your profile page and I'll pick this up immediately."
  }

  const rashi = RASHIS[chart.ascendant.rashiIndex]
  if (!elaborate) {
    return `Your rising sign is ${rashi.name} — it's less about who you are and more about the lens people meet first: how you approach new situations before anything else is known about you.`
  }

  const lord = RASHI_LORD[chart.ascendant.rashiIndex] as PlanetId
  const lordPlacement = chart.placements.find((p) => p.planet === lord)!
  const lordRashi = RASHIS[lordPlacement.rashiIndex]
  return `Digging deeper: ${rashi.name} rising is ruled by ${lord}, and your ${lord} sits in ${lordRashi.name} — so however ${lord} shows up for you (${PLANET_BLURB[lord]}) colors your whole outward approach, not just the ${lord} placement itself. That's the chain worth tracing if you want to understand your first-impression instincts.`
}

function buildWeekReply(chart: NatalChart, seed: string, elaborate: boolean): string {
  const active = currentDashaLords(chart.dashas, new Date())
  const maha = active?.maha
  const antar = active?.antar

  if (!elaborate) {
    const day = pick(DAY_SUGGESTIONS, `${seed}|day`)
    return `You're in a ${maha} Mahadasha${antar ? ` (${antar} Antardasha right now)` : ''} — that colors the whole stretch, not just this week. If you need to pick a day for something that matters, ${day} has the least resistance in the pattern I'm seeing.`
  }

  const mahaTheme = maha ? pick(DASHA_LORD_THEME[maha], `${seed}|elaborate-maha`) : null
  const antarLine = antar
    ? ` Within that, the ${antar} Antardasha adds its own flavor: ${PLANET_BLURB[antar]}.`
    : ''
  const dayLord = maha ? DAY_LORD[maha] : null
  const dayLine = dayLord
    ? ` If you want a symbolic anchor, ${dayLord} carries ${maha}'s signature most directly each week.`
    : ''

  return `The longer arc: you're living through ${mahaTheme ?? `a ${maha} Mahadasha`}.${antarLine}${dayLine} Big decisions land better when they match that energy instead of fighting it.`
}

function buildOverview(chart: NatalChart, elaborate: boolean): string {
  const moon = chart.placements.find((p) => p.planet === 'Moon')!
  const sun = chart.placements.find((p) => p.planet === 'Sun')!
  const active = currentDashaLords(chart.dashas, new Date())
  const ascLine =
    chart.housesReliable && chart.ascendant
      ? `${RASHIS[chart.ascendant.rashiIndex].name} rising`
      : 'ascendant unavailable (approximate birth time)'

  const base = `Here's the full picture: ${ascLine}, Sun in ${RASHIS[sun.rashiIndex].name}, Moon in ${RASHIS[moon.rashiIndex].name} (${NAKSHATRAS[moon.nakshatraIndex].name} nakshatra). Currently running a ${active?.maha} Mahadasha${active?.antar ? `, ${active.antar} Antardasha` : ''}.`

  if (!elaborate) return base

  const notable = chart.placements.find((p) => p.dignity === 'exalted' || p.dignity === 'debilitated' || p.dignity === 'own')
  const notableLine = notable
    ? ` Worth knowing: your ${notable.planet} is ${notable.dignity} in ${RASHIS[notable.rashiIndex].name} — that's one of the stronger signals in the chart, not background detail.`
    : ''
  const nextMaha = chart.dashas.find((d) => d.startDate > new Date())
  const nextLine = nextMaha
    ? ` Your next Mahadasha shift is to ${nextMaha.lord}, starting ${nextMaha.startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}.`
    : ''

  return `${base}${notableLine}${nextLine}`
}

export function generateChatReply(
  message: string,
  chart: NatalChart,
  seed: string,
  lastTopic: ChatTopic = null,
): ChatReply {
  const lower = message.toLowerCase()
  const namedPlanet = findNamedPlanet(message)
  const wantsEverything = EVERYTHING_KEYWORDS.some((k) => lower.includes(k))
  const wantsElaboration = !wantsEverything && ELABORATE_KEYWORDS.some((k) => lower.includes(k))

  if (wantsEverything) {
    return { text: buildOverview(chart, lastTopic === 'overview'), topic: 'overview' }
  }

  if (wantsElaboration) {
    if (!lastTopic) {
      return { text: pick(NEEDS_TOPIC_FALLBACKS, seed), topic: null }
    }
    if (lastTopic === 'ascendant') return { text: buildAscendantReply(chart, true), topic: 'ascendant' }
    if (lastTopic === 'week') return { text: buildWeekReply(chart, seed, true), topic: 'week' }
    if (lastTopic === 'overview') return { text: buildOverview(chart, true), topic: 'overview' }
    return { text: buildPlanetReply(lastTopic, chart, true), topic: lastTopic }
  }

  if (namedPlanet) {
    const elaborate = lastTopic === namedPlanet
    return { text: buildPlanetReply(namedPlanet, chart, elaborate), topic: namedPlanet }
  }

  if (lower.includes('rising') || lower.includes('ascendant') || lower.includes('lagna')) {
    return { text: buildAscendantReply(chart, lastTopic === 'ascendant'), topic: 'ascendant' }
  }

  if (lower.includes('week') || lower.includes('decision') || lower.includes('today')) {
    return { text: buildWeekReply(chart, seed, lastTopic === 'week'), topic: 'week' }
  }

  const fallback = pick(GENERIC_FALLBACKS, seed)
  return { text: fallback(chart), topic: null }
}
