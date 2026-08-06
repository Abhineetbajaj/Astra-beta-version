// Dashboard ("Today") reading: one grounded paragraph + 4 short cards (Focus,
// Love, Career, Watch For). Idempotent per (birth_profile, date) — refreshing
// the dashboard doesn't regenerate or burn a new Gemini call. Core logic lives
// in _shared/generateDailyReading.ts so the cron-triggered send-daily-digest
// function can reuse it without duplicating the Gemini prompt.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabaseAdmin.ts'
import { generateDailyReading } from '../_shared/generateDailyReading.ts'

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

    const { reading, cached } = await generateDailyReading(admin, user.id, birthProfileId)
    return jsonResponse({ reading, cached })
  } catch (err) {
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
