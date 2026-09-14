// Deepgram speech-to-text. Deliberately shaped like _shared/rumikTts.ts: one provider-specific
// module, key read server-side only, never returned, logged, or sent to the browser. Keeping the
// vendor surface confined to this file is what makes swapping STT providers later a one-file job.
//
// Contract verified against Deepgram's live documentation (2026-09-11):
//   POST https://api.deepgram.com/v1/listen
//   Authorization: Token <key>        ("Token", not "Bearer" — Bearer is for JWTs)
//   Content-Type: <the audio's MIME type>, raw binary body
//   model=nova-3&language=multi       Nova-3 multilingual handles English/Hindi code-switching
//                                     within a single utterance, so the user never picks a
//                                     language. (Nova-2's `multi` is Spanish+English only.)
//
// Response fields used, all verified:
//   results.channels[0].alternatives[0].transcript / .confidence
//   results.channels[0].languages      BCP-47 tags, most-spoken first
//   metadata.duration                  seconds — Deepgram's billing unit
//
// This module never calls Gemini or Rumik, never persists or writes audio anywhere, and never
// logs audio bytes or request headers.

const DEEPGRAM_BASE_URL = 'https://api.deepgram.com'
const DEEPGRAM_MODEL = 'nova-3'
const DEEPGRAM_LANGUAGE = 'multi'

const REQUEST_TIMEOUT_MS = 30_000
const RETRY_DELAY_MS = 600

/**
 * Intended limits for the eventual voice-chat boundary (B2.3). Exported so the boundary and this
 * helper agree on one definition rather than drifting apart.
 *
 * 10 MB covers roughly a minute of WebM/Opus with generous headroom; 60s is a deliberate product
 * limit for a push-to-talk turn. Both exist because audio length is what Deepgram bills on, so an
 * unbounded upload is a direct cost-attack vector.
 */
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024
export const MAX_AUDIO_SECONDS = 60

/**
 * Content types accepted from the browser. MediaRecorder's output varies by engine — Chrome and
 * Firefox produce WebM/Opus, Safari and iOS produce MP4/AAC — so both must be allowed or voice
 * recording simply will not work for half of users.
 *
 * Matching is on the base type: a browser sends `audio/webm;codecs=opus`, and the full original
 * string is forwarded to Deepgram, which sniffs the container itself.
 */
export const SUPPORTED_AUDIO_TYPES = [
  'audio/webm', // Chrome, Firefox, Edge — MediaRecorder default
  'audio/ogg', // Firefox variant
  'audio/mp4', // Safari, iOS
  'audio/mpeg', // mp3
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/flac',
] as const

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Set it with 'supabase secrets set ${name}=...'.`)
  }
  return value
}

/** Deepgram is rate-limited or at capacity. Distinct from a genuine failure so the caller can
    surface "busy, try again" rather than "something broke" — mirrors RumikBusyError. */
export class DeepgramBusyError extends Error {}

/** Audio was accepted and transcribed, but produced no words — silence, a dead mic, or pure noise.
    Not an upstream failure: the caller should ask the user to try speaking again (HTTP 422), never
    hand an empty string to the reasoning layer. */
export class EmptyTranscriptError extends Error {}

/** Transient upstream conditions (5xx, timeout, network) — the only ones worth one retry. */
class TransientDeepgramError extends Error {}

const GENERIC_FAILURE = 'Astra could not understand the audio.'

/** True when `contentType` is an allowed audio type, ignoring any `;codecs=` parameter. */
export function isSupportedAudioType(contentType: string): boolean {
  const base = contentType.split(';')[0].trim().toLowerCase()
  return (SUPPORTED_AUDIO_TYPES as readonly string[]).includes(base)
}

export interface Transcription {
  transcript: string
  confidence?: number
  durationSec?: number
  /** BCP-47 tags Deepgram detected, most-spoken first — e.g. ["en","hi"] for Hinglish. */
  languages?: string[]
}

async function requestTranscription(apiKey: string, audio: Uint8Array, contentType: string): Promise<Transcription> {
  const params = new URLSearchParams({
    model: DEEPGRAM_MODEL,
    language: DEEPGRAM_LANGUAGE,
    punctuate: 'true',
    smart_format: 'true',
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${DEEPGRAM_BASE_URL}/v1/listen?${params.toString()}`, {
      method: 'POST',
      headers: { Authorization: `Token ${apiKey}`, 'Content-Type': contentType },
      body: audio,
      signal: controller.signal,
    })
  } catch {
    // Abort (timeout) or network failure. The caught error is deliberately discarded rather than
    // logged: it can carry the whole request, and that includes the Authorization header.
    throw new TransientDeepgramError('The transcription service did not respond.')
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    if (res.status === 429) {
      throw new DeepgramBusyError('The transcription service is busy right now — please try again in a moment.')
    }
    // Status and a bounded body excerpt only. Never the key, never headers, never the audio.
    const detail = await res.text().catch(() => '')
    console.error(`Deepgram STT failed (${res.status}): ${detail.slice(0, 500)}`)

    if (res.status >= 500) throw new TransientDeepgramError(GENERIC_FAILURE)
    throw new Error(GENERIC_FAILURE)
  }

  const json = await res.json()
  const channel = json?.results?.channels?.[0]
  const alternative = channel?.alternatives?.[0]
  const transcript = typeof alternative?.transcript === 'string' ? alternative.transcript.trim() : ''

  // A 200 with no words is silence, not success. Surfaced separately so the caller never passes an
  // empty message into the grounded reasoning layer.
  if (!transcript) throw new EmptyTranscriptError('Astra did not catch any speech in that recording.')

  const languages = Array.isArray(channel?.languages)
    ? channel.languages.filter((l: unknown): l is string => typeof l === 'string')
    : typeof channel?.detected_language === 'string'
      ? [channel.detected_language]
      : undefined

  return {
    transcript,
    confidence: typeof alternative?.confidence === 'number' ? alternative.confidence : undefined,
    durationSec: typeof json?.metadata?.duration === 'number' ? json.metadata.duration : undefined,
    languages,
  }
}

/**
 * Transcribes a single push-to-talk recording. The audio is held in memory for the duration of the
 * call and never written to disk, persisted, or logged.
 *
 * Retries exactly once, and only for transient upstream failures. A 429 surfaces immediately
 * (retrying a rate limit just burns the window) and 4xx are never retried.
 */
export async function transcribe(audio: Uint8Array, contentType: string): Promise<Transcription> {
  if (audio.byteLength === 0) throw new EmptyTranscriptError('The recording was empty.')
  if (audio.byteLength > MAX_AUDIO_BYTES) {
    throw new Error(`Recording is too large (limit ${Math.round(MAX_AUDIO_BYTES / 1024 / 1024)} MB).`)
  }
  if (!isSupportedAudioType(contentType)) {
    throw new Error(`Unsupported audio format: ${contentType.split(';')[0]}`)
  }

  const apiKey = requireEnv('DEEPGRAM_API_KEY')

  try {
    return await requestTranscription(apiKey, audio, contentType)
  } catch (err) {
    if (!(err instanceof TransientDeepgramError)) throw err

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))

    try {
      return await requestTranscription(apiKey, audio, contentType)
    } catch (retryErr) {
      if (retryErr instanceof TransientDeepgramError) throw new Error(GENERIC_FAILURE)
      throw retryErr
    }
  }
}
