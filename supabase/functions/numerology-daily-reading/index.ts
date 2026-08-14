// Numerology "Today's Personal Day" reading: idempotent per (birth_profile, date); thin wrapper
// around _shared/generateNumerologyDailyReading.ts.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabaseAdmin.ts'
import { generateNumerologyDailyReading } from '../_shared/generateNumerologyDailyReading.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user, admin } = await requireUser(req)
    const { birthProfileId } = await req.json()
    if (!birthProfileId) return errorResponse('birthProfileId is required')

    const { data: profileRow } = await admin
      .from('birth_profiles')
      .select('id, user_id, date_of_birth')
      .eq('id', birthProfileId)
      .single()
    if (!profileRow || profileRow.user_id !== user.id) return errorResponse('Forbidden', 403)

    const { reading, cached } = await generateNumerologyDailyReading(
      admin,
      user.id,
      birthProfileId,
      profileRow.date_of_birth,
    )
    return jsonResponse({ reading, cached })
  } catch (err) {
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
