// "Listen to this reading" — narrates an existing, already-generated Astra reading via Rumik Silk
// TTS and streams the audio straight back to the browser.
//
// Stage 1 stores nothing: no bucket, no cache table, no audio row. The synthesized bytes are
// returned in the response and kept only in the calling tab's memory for that page view. Because
// nothing is persisted, every fresh request is a paid synthesis — hence the per-user daily cap
// below, which is the only thing standing between a reload loop and unbounded trial spend.
//
// The reading text itself is passed to Rumik byte-for-byte unchanged. This function never
// generates, rewrites, or interprets astrology — it only voices copy another function already
// produced and stored.

import { corsHeaders, errorResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabaseAdmin.ts'
import { RUMIK_AUDIO_CONTENT_TYPE, RumikBusyError, synthesizeSpeech } from '../_shared/rumikTts.ts'

// Never taken from the client as free text — the client's `table` must match one of these exactly.
const ALLOWED_TABLES = ['daily_readings', 'numerology_daily_readings'] as const
type AllowedTable = (typeof ALLOWED_TABLES)[number]

/** New syntheses per user, per reading type, per UTC day. Deliberately low while Rumik is on a
    trial and quality/architecture are still being validated. Replays within a page view reuse the
    audio already in the browser and never reach this function. */
const DAILY_TTS_LIMIT = 1

function isAllowedTable(value: unknown): value is AllowedTable {
  return typeof value === 'string' && (ALLOWED_TABLES as readonly string[]).includes(value)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Identity comes from the verified bearer token — never from the request body.
    const { user, admin } = await requireUser(req)

    let payload: { table?: unknown; id?: unknown }
    try {
      payload = await req.json()
    } catch {
      return errorResponse('Invalid request body')
    }

    const { table, id } = payload
    if (typeof id !== 'string' || !id) return errorResponse('id is required')
    // Checked before any database or Rumik work, so an unsupported table costs nothing.
    if (!isAllowedTable(table)) return errorResponse('Unsupported reading type', 400)

    const { data: row, error: rowError } = await admin
      .from(table)
      .select('user_id, body')
      .eq('id', id)
      .maybeSingle()

    if (rowError) {
      // Includes a malformed uuid, which Postgres rejects outright. Nothing to narrate either way.
      console.error(`get-reading-audio: lookup failed on ${table}: ${rowError.message}`)
      return errorResponse('Reading not found', 404)
    }
    if (!row) return errorResponse('Reading not found', 404)
    if (row.user_id !== user.id) return errorResponse('Forbidden', 403)
    if (!row.body) return errorResponse('This reading has no text to narrate', 422)

    // Atomic check-and-increment. Claimed BEFORE calling Rumik so two concurrent requests can never
    // both synthesize; released below if synthesis then fails.
    const { data: claimedCount, error: claimError } = await admin.rpc('claim_tts_generation', {
      p_user_id: user.id,
      p_source_table: table,
      p_daily_limit: DAILY_TTS_LIMIT,
    })
    if (claimError) {
      console.error(`get-reading-audio: claim failed: ${claimError.message}`)
      return errorResponse('Could not start audio for this reading', 500)
    }
    if (claimedCount === null) {
      return errorResponse("You've used today's listen for this reading. It resets tomorrow.", 429)
    }

    let audio: Uint8Array
    try {
      audio = await synthesizeSpeech(row.body)
    } catch (err) {
      const { error: releaseError } = await admin.rpc('release_tts_generation', {
        p_user_id: user.id,
        p_source_table: table,
      })
      if (releaseError) console.error(`get-reading-audio: release failed: ${releaseError.message}`)

      // Rumik being busy is a different story from Rumik being broken, and the UI words them
      // differently — 503 here, versus the 429 above that means the user's own daily cap.
      if (err instanceof RumikBusyError) return errorResponse(err.message, 503)
      console.error(`get-reading-audio: synthesis failed: ${err instanceof Error ? err.message : err}`)
      return errorResponse('Astra could not prepare the audio for this reading.', 502)
    }

    return new Response(audio, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': RUMIK_AUDIO_CONTENT_TYPE,
        // Nothing about this audio is cached anywhere by design, browsers and CDNs included.
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
