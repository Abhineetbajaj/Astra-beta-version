// Speaks one of Astra's own conversational answers aloud.
//
// The client sends only a chat_messages id. This function looks that row up under the caller's own
// user_id and the assistant role, and narrates its stored `content` byte-for-byte. That single
// design choice does three jobs at once: nobody can hear another user's answer, nobody can turn
// this into a general-purpose TTS proxy by posting arbitrary text, and the text the user sees on
// screen is provably the text that gets spoken — both come from the same database column.
//
// Deliberately separate from Phase A's get-reading-audio. That function narrates the two daily
// readings under a 1-per-day cap keyed by reading type; conversational replies have completely
// different metering (per turn, arriving in B2.5 via voice_turns), so the two paths stay apart
// rather than bending one cap policy to fit both.
//
// Nothing is persisted. Audio exists in this response and in the caller's tab memory, nowhere else.

import { corsHeaders, errorResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabaseAdmin.ts'
import { RUMIK_AUDIO_CONTENT_TYPE, RumikBusyError, synthesizeSpeech } from '../_shared/rumikTts.ts'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** How many times a single answer may be spoken. Replaying within one page view costs nothing (the
    client holds the audio in memory), so this only bounds fresh synthesis after reloads. Chosen to
    allow a genuine second listen while stopping an unbounded reload loop from billing indefinitely.
    NOT a product/pricing decision — pending explicit approval before this function is deployed. */
const MAX_SYNTHESES_PER_ANSWER = 3

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Identity comes from the verified bearer token, never from the body. The body carries one
    // field and one field only; model, voice, speaker and description are constants inside
    // rumikTts.ts and cannot be influenced from here.
    const { user, admin } = await requireUser(req)

    let payload: { messageId?: unknown }
    try {
      payload = await req.json()
    } catch {
      return errorResponse('Invalid request body')
    }

    const { messageId } = payload
    if (typeof messageId !== 'string' || !UUID_PATTERN.test(messageId)) {
      return errorResponse('messageId must be a valid UUID')
    }

    // Ownership and role are enforced by the query itself — a wrong id, another user's message,
    // and a user-role message all collapse into the same 404, so nothing is leaked about which.
    const { data: row, error: rowError } = await admin
      .from('chat_messages')
      .select('content')
      .eq('id', messageId)
      .eq('user_id', user.id)
      .eq('role', 'assistant')
      .maybeSingle()

    if (rowError) {
      // A failed query is NOT the same as a message that doesn't exist, and collapsing both into
      // 404 made a real fault indistinguishable from a legitimate miss during B2.6 debugging.
      // Still says nothing about ownership or role — only that the lookup itself failed.
      console.error(`get-voice-audio: lookup failed: ${rowError.message}`)
      return errorResponse('Could not load that answer', 500)
    }
    if (!row) return errorResponse('Message not found', 404)
    if (typeof row.content !== 'string' || !row.content.trim()) {
      return errorResponse('This message has no text to narrate', 422)
    }

    // Atomic check-and-increment, taken BEFORE any paid work. Two concurrent replays cannot both
    // pass at the cap boundary; the loser's conditional update returns no row.
    const { data: claimedCount, error: claimError } = await admin.rpc('claim_voice_synthesis', {
      p_user_id: user.id,
      p_chat_message_id: messageId,
      p_answer_char_count: row.content.length,
      p_max_syntheses: MAX_SYNTHESES_PER_ANSWER,
    })
    if (claimError) {
      console.error(`get-voice-audio: claim failed: ${claimError.message}`)
      return errorResponse('Could not start audio for this answer', 500)
    }
    if (claimedCount === null) {
      return errorResponse("You've already listened to this answer a few times.", 429)
    }

    let audio: Uint8Array
    const startedAt = Date.now()
    try {
      // The stored content, untouched. No trimming, no normalization, no rewriting.
      audio = await synthesizeSpeech(row.content)
    } catch (err) {
      // Give the claim back — an upstream outage must not silently consume the user's allowance.
      const { error: releaseError } = await admin.rpc('release_voice_synthesis', {
        p_user_id: user.id,
        p_chat_message_id: messageId,
      })
      if (releaseError) console.error(`get-voice-audio: release failed: ${releaseError.message}`)

      // Busy is a different story from broken, and the UI words them differently.
      if (err instanceof RumikBusyError) return errorResponse(err.message, 503)
      console.error(`get-voice-audio: synthesis failed: ${err instanceof Error ? err.message : err}`)
      return errorResponse('Astra could not prepare the audio for this answer.', 502)
    }

    // Measured server-side, from this server's own clock.
    const { error: completeError } = await admin.rpc('complete_voice_synthesis', {
      p_user_id: user.id,
      p_chat_message_id: messageId,
      p_tts_ms: Date.now() - startedAt,
    })
    if (completeError) console.error(`get-voice-audio: metrics write failed: ${completeError.message}`)

    return new Response(audio, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': RUMIK_AUDIO_CONTENT_TYPE,
        // Not cached anywhere by design — browsers and CDNs included.
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
