// Medical Astrology: health-predisposition reading from 6th/8th/12th house strength, Ascendant
// lord vitality, and dasha health indications. Premium-gated. Soft, non-diagnostic language only —
// never specific diseases or definitive predictions. The disclaimer is a fixed DB default, never
// left to the LLM.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabaseAdmin.ts'
import { requirePremium, PremiumRequiredError } from '../_shared/premium.ts'
import { ensureChart } from '../_shared/computeAndPersistChart.ts'
import { loadChartFacts } from '../_shared/loadChartFacts.ts'
import { lordOfHouse } from '../_shared/houseLords.ts'
import { CLASSICAL_VOICE_DIRECTIVE, factsGroundingPreamble, generateWithGemini } from '../_shared/gemini.ts'

const MALEFICS = new Set(['Saturn', 'Mars', 'Rahu', 'Ketu'])
const BENEFICS = new Set(['Jupiter', 'Venus', 'Mercury', 'Moon'])
const HEALTH_HOUSES = [6, 8, 12]

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

    const natalChartId = await ensureChart(admin, 'birth_profile', birthProfileId)
    const facts = await loadChartFacts(admin, 'birth_profile', birthProfileId)

    const { data: chartRow } = await admin
      .from('natal_charts')
      .select('ascendant_rashi_index')
      .eq('id', natalChartId)
      .single()
    const ascIndex = chartRow?.ascendant_rashi_index ?? null

    const houseOccupants: Record<number, string[]> = { 6: [], 8: [], 12: [] }
    for (const p of facts.placements) {
      if (p.house === 6 || p.house === 8 || p.house === 12) houseOccupants[p.house].push(p.planet)
    }

    let restProneperiods: unknown[] = []
    let lords: { house: number; lord: string; dignity: string; afflicted: boolean; mitigated: boolean }[] = []
    let ascendantLordVitality: Record<string, unknown> = {}

    if (ascIndex != null) {
      lords = HEALTH_HOUSES.map((house) => {
        const lord = lordOfHouse(ascIndex, house)
        const lordPlacement = facts.placements.find((p) => p.planet === lord)
        const occupants = houseOccupants[house]
        // Afflicted: the house's own lord is weakly placed, OR a malefic sits in the house itself.
        const afflicted = lordPlacement?.dignity === 'debilitated' || occupants.some((o) => MALEFICS.has(o))
        // Mitigated: a strong benefic (own/exalted) also occupies the house — classical relief factor.
        const mitigated = facts.placements.some(
          (p) => p.house === house && BENEFICS.has(p.planet) && (p.dignity === 'own' || p.dignity === 'exalted'),
        )
        return { house, lord, dignity: lordPlacement?.dignity ?? 'unknown', afflicted, mitigated }
      })

      const ascLord = lordOfHouse(ascIndex, 1)
      const ascLordPlacement = facts.placements.find((p) => p.planet === ascLord)
      ascendantLordVitality = {
        lord: ascLord,
        dignity: ascLordPlacement?.dignity ?? 'unknown',
        house: ascLordPlacement?.house ?? null,
        retrograde: ascLordPlacement?.retrograde ?? false,
      }

      const attentionLords = new Set([...lords.map((l) => l.lord), ...MALEFICS])

      const { data: mahaPeriods } = await admin
        .from('dasha_periods')
        .select('lord, start_date, end_date')
        .eq('natal_chart_id', natalChartId)
        .eq('level', 'maha')
        .order('start_date', { ascending: true })

      restProneperiods = (mahaPeriods ?? []).map((p) => ({
        lord: p.lord,
        startDate: p.start_date,
        endDate: p.end_date,
        classification: attentionLords.has(p.lord) ? 'rest-prone' : 'steady',
      }))
    }

    const currentPeriodOutlook = {
      mahadashaLord: facts.currentDasha.mahadashaLord,
      antardashaLord: facts.currentDasha.antardashaLord,
    }

    const disclaimer =
      'Not medical advice or diagnosis — a traditional astrological perspective only. Consult a healthcare professional for real health concerns.'

    const indications = { houseOccupants, houseLords: lords, ascendantLordVitality, restProneperiods, currentPeriodOutlook }

    const prompt =
      factsGroundingPreamble(JSON.stringify({ facts, indications }, null, 2)) +
      'Write a 5-6 sentence traditional astrological wellness-perspective reading. Structure:\n' +
      '1. Note the Ascendant lord\'s (ascendantLordVitality) dignity and placement — this is the classical marker ' +
      'of overall vitality/constitution.\n' +
      '2. Note what occupies the 6th, 8th, and 12th houses (or their emptiness) and whether each is "afflicted" ' +
      '(malefic present or weak lord) or "mitigated" (a strong benefic also present) per houseLords — this signals ' +
      'resilience/pacing patterns, not conditions.\n' +
      '3. Name which upcoming/current dasha periods look more rest-prone vs. steady, by lord, and mention the ' +
      'current Mahadasha/Antardasha lords specifically (currentPeriodOutlook).\n' +
      '4. Close with one grounded, practical reflection PROMPT about pacing or self-care — phrased as something to ' +
      'consider, never a directive or medical instruction.\n' +
      'Use ONLY soft, non-diagnostic language: energy levels, rest needs, resilience, pacing. NEVER name a specific ' +
      'disease, condition, or body-system diagnosis, and NEVER make a definitive prediction about health outcomes. ' +
      `End your response with exactly this sentence on its own line: "${disclaimer}"`

    const body = await generateWithGemini({
      systemInstruction:
        'You are Astra, writing traditional wellness astrology content grounded in specific chart factors — which ' +
        'houses, planets, and dasha lords are in play — not generic wellness-column language. You never diagnose, ' +
        'never name specific diseases or conditions, and never make definitive health predictions — only soft, ' +
        `reflective, energy-level language. ${CLASSICAL_VOICE_DIRECTIVE}`,
      prompt,
      temperature: 0.85,
    })

    const { data: reading, error: insertError } = await admin
      .from('medical_readings')
      .insert({ user_id: user.id, birth_profile_id: birthProfileId, indications, body, disclaimer })
      .select()
      .single()
    if (insertError) throw new Error(`Failed to save medical reading: ${insertError.message}`)

    return jsonResponse({ reading })
  } catch (err) {
    if (err instanceof PremiumRequiredError) return errorResponse(err.message, 402)
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
