// Voice chat — one push-to-talk turn: spoken question in, grounded text answer out.
//
// The whole point of this function is that it adds NO astrology reasoning of its own. It
// transcribes speech and hands the resulting text to the exact same generateGroundedReply() that
// text chat uses, so a spoken question and a typed question produce the same kind of chart-grounded
// answer, persisted to the same conversation.
//
// One turn costs exactly one Deepgram request and one Gemini generation. There is no intent
// classifier, no second model call, and no retry beyond what each shared helper already does.
//
// B2.3 returns text only — no audio. Speech synthesis arrives in B2.4 via a separate
// get-voice-audio endpoint, deliberately kept off Phase A's daily-reading TTS path.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabaseAdmin.ts'
import {
  DeepgramBusyError,
  EmptyTranscriptError,
  MAX_AUDIO_BYTES,
  isSupportedAudioType,
  transcribe,
} from '../_shared/deepgramStt.ts'
import { BirthProfileRequiredError, generateGroundedReply } from '../_shared/groundedChat.ts'

const COULD_NOT_CATCH = "I couldn't catch that. Please try again."

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Identity comes from the verified bearer token. Nothing about the user, their chart, the
    // model, the prompt, or provider configuration is ever accepted from the request body.
    const { user, admin } = await requireUser(req)

    const contentType = req.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return errorResponse('Send the recording as multipart/form-data.', 400)
    }

    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return errorResponse('Could not read the uploaded recording.', 400)
    }

    const file = form.get('audio')
    if (!(file instanceof File)) return errorResponse('audio is required', 400)

    // `context` is accepted so the client contract is stable from here on, but it is deliberately
    // NOT forwarded in B2.3 — generateGroundedReply ignores it, and passing unvalidated client data
    // into a call that has no use for it buys nothing. Wired properly in B2.8.

    const audioType = file.type
    if (!audioType) return errorResponse('The recording is missing its audio type.', 400)
    if (!isSupportedAudioType(audioType)) {
      return errorResponse(`Unsupported audio format: ${audioType.split(';')[0]}`, 400)
    }
    if (file.size === 0) return errorResponse('The recording was empty.', 400)
    // Checked against the byte length, never a client-declared duration.
    if (file.size > MAX_AUDIO_BYTES) {
      return errorResponse(`Recording is too large (limit ${Math.round(MAX_AUDIO_BYTES / 1024 / 1024)} MB).`, 400)
    }

    const audio = new Uint8Array(await file.arrayBuffer())

    // --- Speech to text -----------------------------------------------------------------------
    // Audio lives in memory for this call only: never written to disk, never persisted, never
    // logged. Neither is the transcript — it is the user's own question.
    // All timings are measured here, with performance.now(), from this server's own clock. Nothing
    // the client reports about duration is trusted or recorded.
    const turnStartedAt = performance.now()

    let transcript: string
    let audioDurationSec: number | undefined
    const sttStartedAt = performance.now()
    try {
      const result = await transcribe(audio, audioType)
      transcript = result.transcript
      audioDurationSec = result.durationSec
    } catch (err) {
      if (err instanceof EmptyTranscriptError) return errorResponse(COULD_NOT_CATCH, 422)
      if (err instanceof DeepgramBusyError) return errorResponse(err.message, 503)
      console.error(`voice-chat: transcription failed: ${err instanceof Error ? err.message : err}`)
      return errorResponse('Astra could not understand the audio.', 502)
    }

    // --- Grounded reasoning -------------------------------------------------------------------
    // The transcript becomes the user's chat message verbatim. Same facts, same prompt, same
    // history, same facts_used persistence as typing the question would have produced.
    const sttMs = Math.round(performance.now() - sttStartedAt)

    const llmStartedAt = performance.now()
    const { message, model } = await generateGroundedReply({
      admin,
      userId: user.id,
      message: transcript,
    })
    const llmMs = Math.round(performance.now() - llmStartedAt)

    const answer = typeof message.content === 'string' ? message.content : ''
    const messageId = typeof message.id === 'string' ? message.id : null

    // Metering. Written only once the assistant message exists, because voice_turns is keyed on it.
    //
    // status is left at its 'pending' default: this turn has been reasoned but not yet spoken.
    // get-voice-audio flips it to 'success' when synthesis completes, and synthesis_count stays 0
    // here so that function's atomic claim increments 0 -> 1 on the first listen.
    //
    // No Rumik work happens in this function — a voice turn costs one Deepgram call and one Gemini
    // generation, and nothing else.
    if (messageId) {
      const { error: meterError } = await admin.from('voice_turns').upsert(
        {
          user_id: user.id, // from the verified JWT, never the request
          chat_message_id: messageId,
          audio_duration_sec: audioDurationSec ?? null,
          transcript_char_count: transcript.length,
          gemini_model: model,
          answer_char_count: answer.length,
          stt_ms: sttMs,
          llm_ms: llmMs,
          total_ms: Math.round(performance.now() - turnStartedAt),
        },
        { onConflict: 'chat_message_id' },
      )
      // Metering must never cost the user their answer, so a failure here is logged, not raised.
      if (meterError) console.error(`voice-chat: metering write failed: ${meterError.message}`)
    }

    return jsonResponse({ transcript, answer, messageId })
  } catch (err) {
    if (err instanceof BirthProfileRequiredError) return errorResponse(err.message, 409)
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
