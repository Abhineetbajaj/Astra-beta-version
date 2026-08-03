// Financial Astrology: personal wealth reading OR company/business chart reading, same
// computation pipeline. Premium-gated. The disclaimer is a fixed DB default, never left to the
// LLM to include — this must never read as investment advice.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabaseAdmin.ts'
import { requirePremium, PremiumRequiredError } from '../_shared/premium.ts'
import { ensureChart, type SubjectType } from '../_shared/computeAndPersistChart.ts'
import { loadChartFacts } from '../_shared/loadChartFacts.ts'
import { lordOfHouse } from '../_shared/houseLords.ts'
import { CLASSICAL_VOICE_DIRECTIVE, factsGroundingPreamble, generateWithGemini } from '../_shared/gemini.ts'

// Houses this reading evaluates: 2nd (wealth), 5th (speculation), 9th (fortune), 10th
// (career/status), 11th (gains) — the classical set for a wealth-chart strength summary.
const WEALTH_HOUSES = [2, 5, 9, 10, 11]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user, admin } = await requireUser(req)
    await requirePremium(admin, user.id)

    const { kind, subjectId } = (await req.json()) as { kind: 'personal' | 'company'; subjectId: string }
    if (kind !== 'personal' && kind !== 'company') return errorResponse("kind must be 'personal' or 'company'")

    const subjectType: SubjectType = kind === 'personal' ? 'birth_profile' : 'company_profile'
    const table = kind === 'personal' ? 'birth_profiles' : 'company_profiles'
    const { data: subjectRow } = await admin.from(table).select('user_id').eq('id', subjectId).single()
    if (!subjectRow) return errorResponse('Subject not found', 404)
    if (subjectRow.user_id !== user.id) return errorResponse('Forbidden', 403)

    const natalChartId = await ensureChart(admin, subjectType, subjectId)
    const facts = await loadChartFacts(admin, subjectType, subjectId)

    const { data: chartRow } = await admin
      .from('natal_charts')
      .select('ascendant_rashi_index')
      .eq('id', natalChartId)
      .single()
    const ascIndex = chartRow?.ascendant_rashi_index ?? null

    let favorablePeriods: unknown[] = []
    let currentPeriodOutlook: Record<string, unknown> = {}
    let houseStrength: unknown[] = []

    if (ascIndex != null) {
      const favorableLords = new Set([lordOfHouse(ascIndex, 2), lordOfHouse(ascIndex, 11), 'Jupiter', 'Venus'])
      const cautiousLords = new Set([lordOfHouse(ascIndex, 6), lordOfHouse(ascIndex, 8), lordOfHouse(ascIndex, 12)])
      const classify = (lord: string) =>
        favorableLords.has(lord) ? 'favorable' : cautiousLords.has(lord) ? 'cautious' : 'neutral'

      houseStrength = WEALTH_HOUSES.map((house) => {
        const lord = lordOfHouse(ascIndex, house)
        const lordPlacement = facts.placements.find((p) => p.planet === lord)
        return {
          house,
          lord,
          lordDignity: lordPlacement?.dignity ?? 'unknown',
          lordHouse: lordPlacement?.house ?? null,
          occupants: facts.placements.filter((p) => p.house === house).map((p) => p.planet),
        }
      })

      const { data: mahaPeriods } = await admin
        .from('dasha_periods')
        .select('lord, start_date, end_date')
        .eq('natal_chart_id', natalChartId)
        .eq('level', 'maha')
        .order('start_date', { ascending: true })

      favorablePeriods = (mahaPeriods ?? []).map((p) => ({
        lord: p.lord,
        startDate: p.start_date,
        endDate: p.end_date,
        classification: classify(p.lord),
      }))

      currentPeriodOutlook = {
        mahadashaLord: facts.currentDasha.mahadashaLord,
        mahadashaClassification: classify(facts.currentDasha.mahadashaLord),
        antardashaLord: facts.currentDasha.antardashaLord,
        antardashaClassification: facts.currentDasha.antardashaLord ? classify(facts.currentDasha.antardashaLord) : null,
      }
    }

    const disclaimer = 'Not financial or investment advice — a traditional astrological perspective for reflection only.'

    const prompt =
      factsGroundingPreamble(JSON.stringify({ facts, houseStrength, favorablePeriods, currentPeriodOutlook }, null, 2)) +
      'Write a 5-7 sentence traditional astrological wealth-perspective reading. Structure:\n' +
      '1. If any wealth yogas are present, name each one and explain in plain language what classical combination ' +
      'produces it. If none are present, say so plainly rather than inventing one — absence of a yoga is itself ' +
      'informative, not a gap to paper over.\n' +
      '2. Summarize overall wealth-chart strength using houseStrength: comment on the 2nd (wealth), 11th (gains), ' +
      '5th (speculation), 9th (fortune), and 10th (career/status) lords\' dignity and placement — which look ' +
      'strong, which look more challenged.\n' +
      '3. Give a current-period outlook using currentPeriodOutlook: name the active Mahadasha lord and, if present, ' +
      'the active Antardasha lord, and their favorable/cautious/neutral classification for financial decisions.\n' +
      '4. Close with one grounded reflection PROMPT, phrased as a window for reflection, never a directive — e.g. ' +
      '"this may be a reasonable window to review long-standing financial commitments" rather than "you should..." ' +
      'or any buy/sell/investment call.\n' +
      'Never phrase anything as a buy/sell/investment recommendation, a specific stock/asset call, or a guaranteed ' +
      'outcome — frame everything as traditional astrological reflection only. ' +
      `End your response with exactly this sentence on its own line: "${disclaimer}"`

    const body = await generateWithGemini({
      systemInstruction:
        'You are Astra, writing traditional financial astrology content grounded in classical technique — specific ' +
        'about which yogas, houses, and dasha lords are in play, not generic "prosperity is coming" language. You ' +
        'never give investment advice, never recommend specific financial actions, and always phrase closing ' +
        `thoughts as reflection prompts, never directives. ${CLASSICAL_VOICE_DIRECTIVE}`,
      prompt,
      temperature: 0.85,
    })

    const { data: reading, error: insertError } = await admin
      .from('financial_readings')
      .insert({
        user_id: user.id,
        birth_profile_id: kind === 'personal' ? subjectId : null,
        company_profile_id: kind === 'company' ? subjectId : null,
        kind,
        wealth_yogas: facts.yogas,
        house_strength: houseStrength,
        favorable_periods: favorablePeriods,
        current_period_outlook: currentPeriodOutlook,
        body,
        disclaimer,
      })
      .select()
      .single()
    if (insertError) throw new Error(`Failed to save financial reading: ${insertError.message}`)

    return jsonResponse({ reading })
  } catch (err) {
    if (err instanceof PremiumRequiredError) return errorResponse(err.message, 402)
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
