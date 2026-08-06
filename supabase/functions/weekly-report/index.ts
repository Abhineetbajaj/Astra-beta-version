// Premium weekly deep-dive report: a longer, multi-theme synthesis than the daily reading,
// covering the week ahead across focus/relationships/career/growth. Idempotent per
// (birth_profile, week_start) — the week always starts Monday (ISO week).

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabaseAdmin.ts'
import { requirePremium, PremiumRequiredError } from '../_shared/premium.ts'
import { loadChartFacts } from '../_shared/loadChartFacts.ts'
import { CLASSICAL_VOICE_DIRECTIVE, factsGroundingPreamble, generateWithGemini } from '../_shared/gemini.ts'

function isoWeekStart(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7 // Sunday -> 7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1))
  return d.toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user, admin } = await requireUser(req)
    await requirePremium(admin, user.id)

    const { birthProfileId } = await req.json()
    if (!birthProfileId) return errorResponse('birthProfileId is required')

    const { data: profileRow } = await admin.from('birth_profiles').select('user_id').eq('id', birthProfileId).single()
    if (!profileRow) return errorResponse('Subject not found', 404)
    if (profileRow.user_id !== user.id) return errorResponse('Forbidden', 403)

    const weekStart = isoWeekStart(new Date())
    const { data: existing } = await admin
      .from('weekly_reports')
      .select('*')
      .eq('birth_profile_id', birthProfileId)
      .eq('week_start', weekStart)
      .maybeSingle()
    if (existing) return jsonResponse({ report: existing, cached: true })

    const facts = await loadChartFacts(admin, 'birth_profile', birthProfileId)

    const prompt =
      factsGroundingPreamble(JSON.stringify(facts, null, 2)) +
      `Week starting: ${weekStart}.\n\n` +
      'Write a JSON object with exactly these keys:\n' +
      '"body" — 4 short paragraphs (each 2-3 sentences, each grounded in a different specific fact — do not ' +
      'repeat the same placement across paragraphs unless genuinely relevant to both), joined with "\\n" between ' +
      'them (no headers, no markdown):\n' +
      '1. This week\'s throughline — the dominant theme for the week, tied to the current mahadasha/antardasha ' +
      'lord and what it\'s actively doing in this chart (house, sign, dignity).\n' +
      '2. Relationships & connection — grounded in Venus, the 7th house, or the Moon\'s placement/nakshatra.\n' +
      '3. Work & ambition — grounded in the 10th house, its lord, Saturn, Sun, or Mars, whichever is most ' +
      'relevant here.\n' +
      '4. Growth edge — one honest, specific friction point or area asking for attention this week (a ' +
      'challenging dignity, a demanding house, an active yoga if present) with one concrete way to work with it, ' +
      'not against it.\n' +
      '"highlights" — an array of 2-4 short strings: what\'s genuinely working in this person\'s favor this week. ' +
      'Plain, friendly, everyday English — a smart friend\'s summary, not an astrology lesson. NO planet/house/' +
      'sign/nakshatra/dasha names or jargon of any kind here — that\'s what the paragraphs above are for. Each ' +
      'item is one short concrete sentence, e.g. "This is a strong week to have that overdue conversation" or ' +
      '"Your focus and follow-through are unusually sharp right now — use it."\n' +
      '"watchOuts" — an array of 2-4 short strings, same plain-English rule (no jargon), on what to actually ' +
      'avoid or be careful with this week, e.g. "Don\'t sign anything financial without sleeping on it first" or ' +
      '"Skip the confrontation you\'re tempted to start — it\'ll cost more than it settles."\n' +
      'Do not invent transits or timing beyond what the given facts support. Output ONLY the JSON object, no ' +
      'markdown fences.'

    const raw = await generateWithGemini({
      systemInstruction:
        'You are Astra, writing a longer Premium weekly deep-dive — more substantive and specific than a daily ' +
        'reading. Every claim in "body" traces to a named planet, sign, house, nakshatra, dignity, or dasha lord. ' +
        'You have real technical opinions, not just encouragement, and you name real friction alongside real ' +
        `strength. ${CLASSICAL_VOICE_DIRECTIVE}`,
      prompt,
      temperature: 0.9,
      maxOutputTokens: 1536,
    })

    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '')
    const parsed = JSON.parse(cleaned)

    const { data: inserted, error: insertError } = await admin
      .from('weekly_reports')
      .insert({
        user_id: user.id,
        birth_profile_id: birthProfileId,
        week_start: weekStart,
        facts_used: facts,
        body: parsed.body,
        highlights: parsed.highlights,
        watch_outs: parsed.watchOuts,
      })
      .select()
      .single()
    if (insertError) {
      // See daily-reading for why: a concurrent duplicate request isn't a real failure here.
      if (insertError.code === '23505') {
        const { data: winner } = await admin
          .from('weekly_reports')
          .select('*')
          .eq('birth_profile_id', birthProfileId)
          .eq('week_start', weekStart)
          .single()
        if (winner) return jsonResponse({ report: winner, cached: true })
      }
      throw new Error(`Failed to save weekly report: ${insertError.message}`)
    }

    return jsonResponse({ report: inserted, cached: false })
  } catch (err) {
    if (err instanceof PremiumRequiredError) return errorResponse(err.message, 402)
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
