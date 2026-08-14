// Numerology compatibility: Life Path/Expression/Soul Urge matching between the user and a named
// partner (name + date of birth only — no chart, no birth_profiles row for the partner). Free —
// see CLAUDE.md. The score itself is pure math, computed here in Deno; only the prose is Gemini.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabaseAdmin.ts'
import { computeCoreNumbers, computeNumerologyCompatibility } from '../_shared/numerology-engine/index.ts'
import { factsGroundingPreamble, generateWithGemini, NUMEROLOGY_VOICE_DIRECTIVE } from '../_shared/gemini.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user, admin } = await requireUser(req)
    const { partnerName, partnerDateOfBirth } = (await req.json()) as {
      partnerName: string
      partnerDateOfBirth: string
    }
    if (!partnerName?.trim()) return errorResponse('partnerName is required')
    if (!partnerDateOfBirth) return errorResponse('partnerDateOfBirth is required')

    const { data: selfProfile } = await admin
      .from('birth_profiles')
      .select('id, name, date_of_birth')
      .eq('user_id', user.id)
      .eq('relation', 'self')
      .maybeSingle()
    if (!selfProfile) return errorResponse('Complete your own birth profile first.', 409)

    const selfCore = computeCoreNumbers({ fullName: selfProfile.name, dateOfBirth: selfProfile.date_of_birth })
    const partnerCore = computeCoreNumbers({ fullName: partnerName, dateOfBirth: partnerDateOfBirth })
    const compatibility = computeNumerologyCompatibility(selfCore, partnerCore)

    const prompt =
      factsGroundingPreamble(
        JSON.stringify({ selfName: selfProfile.name, selfCore, partnerName, partnerCore, compatibility }, null, 2),
      ) +
      'Write 4-5 sentences of numerology compatibility prose covering the three dimensions in ' +
      '"compatibility.dimensions" (Life Path, Expression, Soul Urge) by name and value for both people. ' +
      'Be honest about a challenging verdict — do not spin every result as secretly positive; a real ' +
      'numerologist names friction plainly and frames it as something to navigate, not hide. Close with ' +
      'one concrete, specific observation about how these numbers might actually show up between these two ' +
      'people day-to-day — not generic "you\'ll get along well" language. Mention this covers 3 of the core ' +
      'numbers, not a full compatibility reading.'

    const body = await generateWithGemini({
      systemInstruction:
        'You are Astra, writing a numerology compatibility reading grounded strictly in the given ' +
        `numbers. ${NUMEROLOGY_VOICE_DIRECTIVE}`,
      prompt,
      temperature: 0.9,
    })

    const { data: reading, error: insertError } = await admin
      .from('numerology_compatibility_readings')
      .insert({
        user_id: user.id,
        birth_profile_id: selfProfile.id,
        partner_name: partnerName,
        partner_date_of_birth: partnerDateOfBirth,
        compatibility,
        body,
      })
      .select()
      .single()
    if (insertError) throw new Error(`Failed to save numerology compatibility reading: ${insertError.message}`)

    return jsonResponse({ reading })
  } catch (err) {
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
