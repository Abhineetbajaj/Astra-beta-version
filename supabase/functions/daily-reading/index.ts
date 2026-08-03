// Dashboard ("Today") reading: one grounded paragraph + 4 short cards (Focus,
// Love, Career, Watch For). Idempotent per (birth_profile, date) — refreshing
// the dashboard doesn't regenerate or burn a new Gemini call.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabaseAdmin.ts'
import { loadChartFacts } from '../_shared/loadChartFacts.ts'
import { CLASSICAL_VOICE_DIRECTIVE, factsGroundingPreamble, generateWithGemini } from '../_shared/gemini.ts'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user, admin } = await requireUser(req)
    const { birthProfileId } = await req.json()
    if (!birthProfileId) return errorResponse('birthProfileId is required')

    const { data: profileRow } = await admin
      .from('birth_profiles')
      .select('id, user_id')
      .eq('id', birthProfileId)
      .single()
    if (!profileRow || profileRow.user_id !== user.id) return errorResponse('Forbidden', 403)

    const date = todayISO()
    const { data: existing } = await admin
      .from('daily_readings')
      .select('*')
      .eq('birth_profile_id', birthProfileId)
      .eq('reading_date', date)
      .maybeSingle()
    if (existing) return jsonResponse({ reading: existing, cached: true })

    const facts = await loadChartFacts(admin, 'birth_profile', birthProfileId)
    const moon = facts.placements.find((p) => p.planet === 'Moon')
    const factsTag = [
      moon ? `Moon in ${moon.sign}` : null,
      `${facts.currentDasha.mahadashaLord} Mahadasha`,
      facts.currentDasha.antardashaLord ? `${facts.currentDasha.antardashaLord} Antardasha` : null,
    ]
      .filter(Boolean)
      .join(' · ')

    const prompt =
      factsGroundingPreamble(JSON.stringify(facts, null, 2)) +
      `Today's date: ${date}.\n\n` +
      'Write a JSON object with exactly these keys:\n' +
      '"body" — 3-4 sentences. Open with something concrete tied to the current mahadasha/antardasha lord ' +
      'or a specific placement (sign, house, nakshatra, or dignity) — never a generic opener like "the stars align" ' +
      'or "today brings energy". Name the actual planet, sign, or house doing the work. End with one small, ' +
      'concrete, doable suggestion for today, not a vague platitude.\n' +
      '"focus" — 1 sentence, a specific and actionable focus for today, tied to a fact above.\n' +
      '"love" — 1 sentence, specific to their placements (e.g. Venus\'s sign/house/dignity, or the 7th house), ' +
      'not generic relationship advice.\n' +
      '"career" — 1 sentence, tied to the 10th house, its lord, or the current dasha lord\'s significations.\n' +
      '"watch" — 1 sentence naming one real friction point from the chart (a challenging dignity, a demanding ' +
      'dasha, a 6th/8th/12th house factor) — specific, not "be careful today".\n' +
      'Vary sentence structure and vocabulary — do not reuse the same opening pattern across the four cards. ' +
      'Output ONLY the JSON object, no markdown fences.'

    const raw = await generateWithGemini({
      systemInstruction:
        'You are Astra, a Vedic astrologer with real expertise — precise, warm, and specific, never a generic ' +
        'horoscope-column voice. Every sentence you write should be traceable to a specific fact you were given: ' +
        'a planet, sign, house, nakshatra, dignity, or dasha period. Avoid stock astrology phrases ("cosmic energy", ' +
        '"the universe is aligning", "exciting things ahead") — ground everything in the actual chart. You never ' +
        `invent astrological facts — you only interpret the ones given to you. ${CLASSICAL_VOICE_DIRECTIVE}`,
      prompt,
      temperature: 0.95,
    })

    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '')
    const parsed = JSON.parse(cleaned)

    const { data: inserted, error: insertError } = await admin
      .from('daily_readings')
      .insert({
        user_id: user.id,
        birth_profile_id: birthProfileId,
        reading_date: date,
        facts_used: { factsTag, facts },
        body: parsed.body,
        focus_card: parsed.focus,
        love_card: parsed.love,
        career_card: parsed.career,
        watch_card: parsed.watch,
      })
      .select()
      .single()

    if (insertError) {
      // 23505 = unique_violation. React StrictMode (and any accidental double-invoke) can fire this
      // request twice concurrently; both pass the "existing?" check before either has inserted. The
      // loser of that race isn't actually an error — the winner's row is what we want, so fetch and
      // return it instead of surfacing a 500 for what is, from the user's perspective, a success.
      if (insertError.code === '23505') {
        const { data: winner } = await admin
          .from('daily_readings')
          .select('*')
          .eq('birth_profile_id', birthProfileId)
          .eq('reading_date', date)
          .single()
        if (winner) return jsonResponse({ reading: winner, cached: true })
      }
      throw new Error(`Failed to save reading: ${insertError.message}`)
    }

    return jsonResponse({ reading: inserted, cached: false })
  } catch (err) {
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
