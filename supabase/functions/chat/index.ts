// Ask Astra — the priority Gemini integration point (see project brief §4.4).
//
// This function owns only the HTTP surface: auth, request validation, status codes, response
// shape. The grounded reasoning itself lives in _shared/groundedChat.ts, which voice chat also
// calls, so text and voice can never drift into two different astrologers.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabaseAdmin.ts'
import { BirthProfileRequiredError, generateGroundedReply } from '../_shared/groundedChat.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user, admin } = await requireUser(req)
    const { message } = await req.json()
    if (!message || typeof message !== 'string') return errorResponse('message is required')

    const { message: assistantRow } = await generateGroundedReply({
      admin,
      userId: user.id,
      message,
    })

    return jsonResponse({ message: assistantRow })
  } catch (err) {
    if (err instanceof BirthProfileRequiredError) return errorResponse(err.message, 409)
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
