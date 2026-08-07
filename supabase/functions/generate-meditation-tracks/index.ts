// Daily pg_cron-triggered generator for the three time-triggered "Listen" categories: For You
// Today (personalized, but generated once per distinct dasha+Moon-sign combination across all
// users — not per user), This Week's Ritual, and Panchang Calendar Drops. Same
// verify_jwt=false + x-cron-secret pattern as send-daily-digest (the platform's own JWT gate
// would otherwise reject a request with no Supabase session before this function's own check runs).

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { MEDITATIVE_VOICE_DIRECTIVE, generateWithGemini } from '../_shared/gemini.ts'
import { computeTransits } from '../_shared/astro-engine/transits.ts'
import { detectPanchangEvents } from '../_shared/astro-engine/panchangEvents.ts'
import { tropicalLongitude, isRetrograde } from '../_shared/astro-engine/ephemeris.ts'
import { lahiriAyanamsaDeg, toSidereal } from '../_shared/astro-engine/ayanamsa.ts'
import { rashiForLongitude, RASHIS } from '../_shared/data/rashis.ts'
import { nakshatraForLongitude } from '../_shared/data/nakshatras.ts'

type Admin = ReturnType<typeof supabaseAdmin>

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing required environment variable: ${name}.`)
  return value
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function isoWeekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7 // Sunday -> 7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1))
  return d
}

async function trackExists(admin: Admin, dedupeKey: string): Promise<boolean> {
  const { data } = await admin.from('meditation_tracks').select('id').eq('dedupe_key', dedupeKey).maybeSingle()
  return !!data
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// The free Gemini tier caps at 5 requests/minute. This run can make several sequential calls
// (one per active dasha/Moon-sign combination, plus weekly, plus any Panchang events found) — pace
// them rather than bursting into a 429. Not latency-sensitive; this is a cron-triggered batch job.
const GEMINI_PACING_MS = 13_000
let geminiCallCount = 0

async function generateScript(prompt: string): Promise<string> {
  if (geminiCallCount > 0) await sleep(GEMINI_PACING_MS)
  geminiCallCount++
  return generateWithGemini({
    systemInstruction:
      'You are Astra, writing a short guided reflection grounded in the real astrological facts given to ' +
      `you — never inventing a placement, transit, or dasha period beyond what's provided. ${MEDITATIVE_VOICE_DIRECTIVE}`,
    prompt,
    temperature: 0.85,
  })
}

interface DashaMoonCombo {
  mahadashaLord: string
  antardashaLord: string | null
  natalMoonRashiIndex: number
}

async function loadActiveCombos(admin: Admin): Promise<DashaMoonCombo[]> {
  const { data: selfProfiles } = await admin.from('birth_profiles').select('id').eq('relation', 'self')
  const combos: DashaMoonCombo[] = []
  const now = new Date()

  for (const profile of selfProfiles ?? []) {
    const { data: chart } = await admin
      .from('natal_charts')
      .select('id')
      .eq('birth_profile_id', profile.id)
      .maybeSingle()
    if (!chart) continue

    const [{ data: dashas }, { data: moonPlacement }] = await Promise.all([
      admin.from('dasha_periods').select('*').eq('natal_chart_id', chart.id),
      admin.from('chart_placements').select('sign_index').eq('natal_chart_id', chart.id).eq('planet', 'Moon').maybeSingle(),
    ])
    if (!moonPlacement) continue

    const activeMaha = (dashas ?? []).find(
      (d) => d.level === 'maha' && new Date(d.start_date) <= now && now < new Date(d.end_date),
    )
    const activeAntar = (dashas ?? []).find(
      (d) => d.level === 'antar' && d.parent_id === activeMaha?.id && new Date(d.start_date) <= now && now < new Date(d.end_date),
    )
    if (!activeMaha) continue

    combos.push({
      mahadashaLord: activeMaha.lord,
      antardashaLord: activeAntar?.lord ?? null,
      natalMoonRashiIndex: moonPlacement.sign_index,
    })
  }

  const seen = new Set<string>()
  return combos.filter((c) => {
    const key = `${c.mahadashaLord}:${c.antardashaLord}:${c.natalMoonRashiIndex}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function generateTodayTracks(admin: Admin): Promise<number> {
  const date = todayISO()
  const combos = await loadActiveCombos(admin)
  let created = 0

  for (const combo of combos) {
    const dedupeKey = `today:${combo.mahadashaLord}:${combo.antardashaLord}:${combo.natalMoonRashiIndex}:${date}`
    if (await trackExists(admin, dedupeKey)) continue

    const transits = computeTransits(null, combo.natalMoonRashiIndex, new Date())
    const saturn = transits.placements.find((p) => p.planet === 'Saturn')!
    const jupiter = transits.placements.find((p) => p.planet === 'Jupiter')!

    const prompt =
      `Real facts: currently in a ${combo.mahadashaLord} Mahadasha` +
      (combo.antardashaLord ? `, ${combo.antardashaLord} Antardasha. ` : '. ') +
      `Transiting Saturn is ${saturn.houseFromMoon}th from the natal Moon (retrograde: ${saturn.retrograde}). ` +
      `Transiting Jupiter is ${jupiter.houseFromMoon}th from the natal Moon (retrograde: ${jupiter.retrograde}). ` +
      (transits.sadeSati.active ? `Sade Sati is active (${transits.sadeSati.phase} phase). ` : '') +
      'Write today\'s guided reflection grounded in these facts.'

    const script = await generateScript(prompt)

    const { error } = await admin.from('meditation_tracks').insert({
      category: 'today',
      title: `Today's reflection — ${combo.mahadashaLord} Mahadasha`,
      script_text: script,
      planet_context: combo.mahadashaLord,
      valid_date: date,
      // Today/weekly/panchang are the retention hook (one per day/week, not a browsable library) —
      // free for everyone. Premium gating lives on the evergreen need/mantra library instead,
      // where it actually functions as a library worth paying to unlock.
      is_premium: false,
      dedupe_key: dedupeKey,
    })
    if (error) throw new Error(`Failed to insert today-track: ${error.message}`)
    created++
  }

  return created
}

async function generateWeeklyTrack(admin: Admin): Promise<number> {
  const weekStart = isoWeekStart(new Date())
  const weekStartISO = weekStart.toISOString().slice(0, 10)
  const prevWeekStart = new Date(weekStart.getTime() - 7 * 86_400_000)
  const ayanamsaThis = lahiriAyanamsaDeg(weekStart)
  const ayanamsaPrev = lahiriAyanamsaDeg(prevWeekStart)

  let theme = ''
  let planetContext: string | null = null

  for (const planet of ['Saturn', 'Jupiter'] as const) {
    const rashiThis = rashiForLongitude(toSidereal(tropicalLongitude(planet, weekStart), ayanamsaThis)).index
    const rashiPrev = rashiForLongitude(toSidereal(tropicalLongitude(planet, prevWeekStart), ayanamsaPrev)).index
    const retroThis = isRetrograde(planet, weekStart)
    const retroPrev = isRetrograde(planet, prevWeekStart)

    if (rashiThis !== rashiPrev) {
      theme = `${planet} has moved into ${RASHIS[rashiThis].name}`
      planetContext = planet
      break
    }
    if (retroThis !== retroPrev) {
      theme = `${planet} has ${retroThis ? 'turned retrograde' : 'gone direct'}`
      planetContext = planet
      break
    }
  }

  if (!theme) {
    const moonSidereal = toSidereal(tropicalLongitude('Moon', weekStart), ayanamsaThis)
    const nakshatra = nakshatraForLongitude(moonSidereal)
    theme = `the transiting Moon is in ${nakshatra.name} nakshatra`
  }

  const dedupeKey = `weekly:${theme}:${weekStartISO}`
  if (await trackExists(admin, dedupeKey)) return 0

  const script = await generateScript(
    `Real fact for this week: ${theme}. Write this week's guided ritual reflection grounded in this fact.`,
  )

  const { error } = await admin.from('meditation_tracks').insert({
    category: 'weekly',
    title: `This week: ${theme}`,
    script_text: script,
    planet_context: planetContext,
    valid_date: weekStartISO,
    is_premium: false, // see note on the "today" insert above
    dedupe_key: dedupeKey,
  })
  if (error) throw new Error(`Failed to insert weekly track: ${error.message}`)
  return 1
}

async function generatePanchangTracks(admin: Admin): Promise<number> {
  const events = detectPanchangEvents(new Date(), 14)
  let created = 0

  for (const { event, date } of events) {
    const dateISO = date.toISOString().slice(0, 10)
    const dedupeKey = `panchang:${event}:${dateISO}`
    if (await trackExists(admin, dedupeKey)) continue

    const script = await generateScript(
      `Real fact: ${dateISO} is ${event} in the Vedic calendar. Write a short guided reflection for this ` +
        `observance — what it classically represents and one simple, calm practice or intention for the day.`,
    )

    const { error } = await admin.from('meditation_tracks').insert({
      category: 'panchang',
      title: event,
      script_text: script,
      panchang_event: event,
      valid_date: dateISO,
      is_premium: false, // see note on the "today" insert above
      dedupe_key: dedupeKey,
    })
    if (error) throw new Error(`Failed to insert panchang track "${event}": ${error.message}`)
    created++
  }

  return created
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const cronSecret = requireEnv('CRON_SECRET')
    if (req.headers.get('x-cron-secret') !== cronSecret) return errorResponse('Forbidden', 403)

    const admin = supabaseAdmin()
    const today = await generateTodayTracks(admin)
    const weekly = await generateWeeklyTrack(admin)
    const panchang = await generatePanchangTracks(admin)

    return jsonResponse({ today, weekly, panchang })
  } catch (err) {
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
