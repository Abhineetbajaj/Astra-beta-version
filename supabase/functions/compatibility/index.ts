// Real synastry: Moon-sign/nakshatra-based guna score (see astro-engine/guna.ts
// — 3 of the 8 classical kutas, deliberately not claiming full 36-point
// precision) between the user's own chart and a saved "other person" profile,
// wrapped in Gemini prose. The score itself is pure math; only the prose is generated.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabaseAdmin.ts'
import { ensureChart } from '../_shared/computeAndPersistChart.ts'
import { loadChartFacts } from '../_shared/loadChartFacts.ts'
import { computeGunaScore } from '../_shared/astro-engine/index.ts'
import { CLASSICAL_VOICE_DIRECTIVE, factsGroundingPreamble, generateWithGemini } from '../_shared/gemini.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user, admin } = await requireUser(req)
    const { otherBirthProfileId } = await req.json()
    if (!otherBirthProfileId) return errorResponse('otherBirthProfileId is required')

    const { data: selfProfile } = await admin
      .from('birth_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('relation', 'self')
      .maybeSingle()
    if (!selfProfile) return errorResponse('Complete your own birth profile first.', 409)

    const { data: otherProfile } = await admin
      .from('birth_profiles')
      .select('id, user_id, name')
      .eq('id', otherBirthProfileId)
      .single()
    if (!otherProfile || otherProfile.user_id !== user.id) return errorResponse('Forbidden', 403)

    await ensureChart(admin, 'birth_profile', selfProfile.id)
    await ensureChart(admin, 'birth_profile', otherProfile.id)

    const [factsA, factsB] = await Promise.all([
      loadChartFacts(admin, 'birth_profile', selfProfile.id),
      loadChartFacts(admin, 'birth_profile', otherProfile.id),
    ])

    const moonA = factsA.placements.find((p) => p.planet === 'Moon')
    const moonB = factsB.placements.find((p) => p.planet === 'Moon')
    if (!moonA || !moonB) throw new Error('Moon placement missing from one of the charts')

    // Reconstruct sidereal longitude from stored sign+degree — guna math needs the raw longitude.
    const RASHI_INDEX: Record<string, number> = {
      Aries: 0, Taurus: 1, Gemini: 2, Cancer: 3, Leo: 4, Virgo: 5,
      Libra: 6, Scorpio: 7, Sagittarius: 8, Capricorn: 9, Aquarius: 10, Pisces: 11,
    }
    const lonA = RASHI_INDEX[moonA.sign] * 30 + moonA.degree
    const lonB = RASHI_INDEX[moonB.sign] * 30 + moonB.degree

    const guna = computeGunaScore(lonA, lonB)

    const prompt =
      factsGroundingPreamble(
        JSON.stringify({ personA: factsA, personB: factsB, gunaBreakdown: guna }, null, 2),
      ) +
      'Write 4-5 sentences of synastry prose. Structure:\n' +
      '1. Open with what the Bhakoot result says about emotional/temperamental pacing between the two Moon signs ' +
      '— name both signs.\n' +
      '2. Cover what Gana says about their two temperaments (Deva/Manushya/Rakshasa) working together or clashing.\n' +
      '3. Cover what Nadi says — if it scored 0, this is a real classical caution point (traditionally linked to ' +
      'vitality/constitution match); say so honestly rather than glossing over it.\n' +
      '4. Close with one concrete, specific observation about how these two Moon placements (nakshatras included) ' +
      'might actually show up day-to-day between them — not generic "you\'ll get along well" language.\n' +
      'Be honest about a low score — don\'t spin every result as secretly positive. Mention this is a simplified ' +
      'Ashtakoot-style score (3 of the classical 8 kutas: Bhakoot, Gana, Nadi), not a full 36-point reading. ' +
      'Do not invent additional compatibility factors beyond what is given.'

    const prose = await generateWithGemini({
      systemInstruction:
        'You are Astra, a Vedic astrologer writing a compatibility reading grounded strictly in the given facts. ' +
        'You are honest about weak points in a match, not just the strong ones — real synastry readings acknowledge ' +
        `friction, they don't paper over it with generic positivity. ${CLASSICAL_VOICE_DIRECTIVE}`,
      prompt,
      temperature: 0.9,
    })

    const { data: report, error: insertError } = await admin
      .from('compatibility_reports')
      .insert({
        user_id: user.id,
        profile_a_id: selfProfile.id,
        profile_b_id: otherProfile.id,
        guna_breakdown: guna,
        guna_total: guna.total,
        guna_max: guna.max,
        prose,
      })
      .select()
      .single()
    if (insertError) throw new Error(`Failed to save compatibility report: ${insertError.message}`)

    return jsonResponse({ report })
  } catch (err) {
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
