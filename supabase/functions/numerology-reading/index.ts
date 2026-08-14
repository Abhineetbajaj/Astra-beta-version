// Numerology: one-time (regenerate-on-demand) AI synthesis of the 5 Pythagorean core numbers.
// Free for everyone — see CLAUDE.md. Numbers themselves are computed here in Deno, never by
// Gemini; the model only narrates the precomputed facts (same rule as every other reading).

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabaseAdmin.ts'
import { computeCoreNumbers } from '../_shared/numerology-engine/index.ts'
import type { CoreNumbers, NumerologySystem } from '../_shared/numerology-engine/types.ts'
import { meaningForNumber } from '../_shared/data/numerologyMeanings.ts'
import { factsGroundingPreamble, generateWithGemini, NUMEROLOGY_VOICE_DIRECTIVE } from '../_shared/gemini.ts'

function meaningSummariesFor(coreNumbers: CoreNumbers) {
  const entries = [
    ['lifePath', coreNumbers.lifePath],
    ['expression', coreNumbers.expression],
    ['soulUrge', coreNumbers.soulUrge],
    ['personality', coreNumbers.personality],
    ['birthday', coreNumbers.birthday],
  ] as const

  return Object.fromEntries(
    entries.map(([key, result]) => {
      const meaning = meaningForNumber(result.value)
      return [
        key,
        {
          number: result.value,
          isMaster: result.isMaster,
          title: meaning.title,
          positiveTraits: meaning.positiveTraits,
          shadowTraits: meaning.shadowTraits,
          careers: meaning.careers,
          lifeLesson: meaning.lifeLesson,
        },
      ]
    }),
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user, admin } = await requireUser(req)
    const { birthProfileId, system } = (await req.json()) as { birthProfileId: string; system?: NumerologySystem }
    if (!birthProfileId) return errorResponse('birthProfileId is required')

    const resolvedSystem: NumerologySystem = system ?? 'pythagorean'
    if (resolvedSystem !== 'pythagorean') {
      return errorResponse('Only the Pythagorean system is available right now.', 400)
    }

    const { data: profileRow } = await admin
      .from('birth_profiles')
      .select('id, user_id, name, date_of_birth')
      .eq('id', birthProfileId)
      .single()
    if (!profileRow) return errorResponse('Birth profile not found', 404)
    if (profileRow.user_id !== user.id) return errorResponse('Forbidden', 403)

    const coreNumbers = computeCoreNumbers({
      fullName: profileRow.name,
      dateOfBirth: profileRow.date_of_birth,
      system: resolvedSystem,
    })
    const meaningSummaries = meaningSummariesFor(coreNumbers)

    const prompt =
      factsGroundingPreamble(JSON.stringify({ coreNumbers, meaningSummaries }, null, 2)) +
      'Write a 6-8 sentence numerology reading covering all 5 core numbers by name and value ' +
      '(Life Path, Expression, Soul Urge, Personality, Birthday). For each, weave in the real theme ' +
      'from meaningSummaries rather than reciting the trait list verbatim — synthesize them into a ' +
      'flowing, personal read. If any number isMaster, explicitly call out that it is a master ' +
      'number and explain what that amplification means for them. Close with one sentence tying the ' +
      'numbers together into a single overall theme for this person.'

    const body = await generateWithGemini({
      systemInstruction:
        'You are Astra, writing a warm, specific numerology reading grounded in the exact numbers ' +
        `computed for this person — never generic astrology-adjacent "vibes" copy. ${NUMEROLOGY_VOICE_DIRECTIVE}`,
      prompt,
      temperature: 0.85,
    })

    const { data: reading, error: insertError } = await admin
      .from('numerology_readings')
      .insert({
        user_id: user.id,
        birth_profile_id: birthProfileId,
        system: resolvedSystem,
        core_numbers: coreNumbers,
        body,
      })
      .select()
      .single()
    if (insertError) throw new Error(`Failed to save numerology reading: ${insertError.message}`)

    return jsonResponse({ reading })
  } catch (err) {
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
