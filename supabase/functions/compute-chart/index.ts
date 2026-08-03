// Computes a natal chart (person or company) via the deterministic astro-engine
// and persists it. Thin HTTP wrapper — see _shared/computeAndPersistChart.ts
// for the logic, which is also reused by compatibility/financial functions
// that need to guarantee a chart exists for a subject.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabaseAdmin.ts'
import { computeAndPersistChart, type SubjectType } from '../_shared/computeAndPersistChart.ts'
import { loadChartFacts } from '../_shared/loadChartFacts.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user, admin } = await requireUser(req)
    const { subjectType, subjectId } = (await req.json()) as { subjectType: SubjectType; subjectId: string }

    if (subjectType !== 'birth_profile' && subjectType !== 'company_profile') {
      return errorResponse("subjectType must be 'birth_profile' or 'company_profile'")
    }

    const table = subjectType === 'birth_profile' ? 'birth_profiles' : 'company_profiles'
    const { data: row } = await admin.from(table).select('user_id').eq('id', subjectId).single()
    if (!row) return errorResponse('Subject not found', 404)
    if (row.user_id !== user.id) return errorResponse('Forbidden', 403)

    await computeAndPersistChart(admin, subjectType, subjectId)
    const facts = await loadChartFacts(admin, subjectType, subjectId)

    return jsonResponse({ facts })
  } catch (err) {
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
