// Rumik Silk text-to-speech. Shaped like _shared/gemini.ts: the one place every voice-narration
// call routes through, with the API key read server-side only and never returned, logged, or sent
// to the browser.
//
// Contract, per Rumik's integration guide: POST /v1/tts with a Bearer key returns RAW BINARY audio
// — not JSON, not base64. That means the response carries no duration or metadata of any kind, and
// nothing here invents any.
//
// Frozen product decisions (do not change without sign-off — the voice is part of the product):
//   • model `mulberry` — steered by a natural-language `description`, so Astra's reading text is
//     sent through unmodified. The alternative (`muga`) is steered by inline tone tags placed
//     INSIDE the text, which would mean editing fact-grounded astrology copy before narrating it.
//   • no `speaker` — no voice has been confirmed as available on this account, so none is guessed.
//     The `description` alone steers the voice, which the guide documents as valid (speaker is
//     optional for mulberry).
//   • `mp3` — roughly halves transfer size versus the default 24 kHz WAV.

const RUMIK_BASE_URL = 'https://silk-api.rumik.ai'
const RUMIK_MODEL = 'mulberry'
const RUMIK_AUDIO_FORMAT = 'mp3'

/** Content type for the `mp3` audio Rumik returns — used verbatim on the response to the browser. */
export const RUMIK_AUDIO_CONTENT_TYPE = 'audio/mpeg'

/** The narrator. One frozen string, reused for every call, so the voice stays recognisably Astra's. */
const RUMIK_VOICE_DESCRIPTION =
  'a calm, warm narrator with unhurried pacing, clear articulation, and a steady, grounded tone'

const REQUEST_TIMEOUT_MS = 30_000
const RETRY_DELAY_MS = 600

// Locally duplicated rather than shared, matching the convention already used in four other
// functions (generate-meditation-tracks, generate-meditation-library, send-daily-digest,
// send-push-notifications) plus supabaseAdmin.ts.
function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Set it with 'supabase secrets set ${name}=...'.`)
  }
  return value
}

/** Rumik is rate-limited/at capacity right now — distinct from our own per-user daily cap, and
    surfaced to the client as 503 so the two are never confused. */
export class RumikBusyError extends Error {}

/** Transient upstream conditions (502/503, timeout, network) — the only ones worth one retry. */
class TransientRumikError extends Error {}

const GENERIC_FAILURE = 'Astra could not prepare the audio for this reading.'

async function requestSpeech(apiKey: string, text: string): Promise<Uint8Array> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${RUMIK_BASE_URL}/v1/tts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: RUMIK_MODEL,
        text,
        audio_format: RUMIK_AUDIO_FORMAT,
        description: RUMIK_VOICE_DESCRIPTION,
      }),
      signal: controller.signal,
    })
  } catch {
    // Abort (timeout) or a network-level failure. Deliberately not logging the caught error: it can
    // carry the full request, and that includes the Authorization header.
    throw new TransientRumikError('The voice service did not respond.')
  } finally {
    clearTimeout(timeout)
  }

  if (res.ok) {
    const bytes = new Uint8Array(await res.arrayBuffer())
    // An empty body is a failure, not silent success — never hand the browser zero-byte audio.
    if (bytes.byteLength === 0) throw new Error(GENERIC_FAILURE)
    return bytes
  }

  if (res.status === 429) {
    throw new RumikBusyError('The voice service is busy right now — please try again in a moment.')
  }

  // Status plus a bounded body excerpt is enough to debug; the key and headers never appear.
  const detail = await res.text().catch(() => '')
  console.error(`Rumik TTS failed (${res.status}): ${detail.slice(0, 500)}`)

  if (res.status === 502 || res.status === 503) throw new TransientRumikError(GENERIC_FAILURE)
  throw new Error(GENERIC_FAILURE)
}

/**
 * Narrates `text` exactly as given — no normalization, no rewriting, no tone tags. The caller is
 * responsible for passing real, already-generated reading copy.
 *
 * Retries exactly once, and only for transient upstream failures, per Rumik's documented guidance
 * to back off on those. A 429 is surfaced immediately (retrying a rate limit just burns the window)
 * and 4xx are never retried.
 */
export async function synthesizeSpeech(text: string): Promise<Uint8Array> {
  const apiKey = requireEnv('RUMIK_API_KEY')

  try {
    return await requestSpeech(apiKey, text)
  } catch (err) {
    if (!(err instanceof TransientRumikError)) throw err

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))

    try {
      return await requestSpeech(apiKey, text)
    } catch (retryErr) {
      if (retryErr instanceof TransientRumikError) throw new Error(GENERIC_FAILURE)
      throw retryErr
    }
  }
}
