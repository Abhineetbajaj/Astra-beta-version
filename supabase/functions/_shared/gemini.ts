// Direct Gemini API calls — no hosted AI gateway proxy. GEMINI_API_KEY is a
// Supabase Edge Function secret (server-only; never exposed to the client).
// This is the one place every reading/chat/compatibility function should
// route through, so the "facts only, no invented astrology" rule is enforced
// by construction: the prompt always carries `facts`, the model never
// receives raw birth data or asked to compute anything astrological itself.

// gemini-2.5-flash is no longer available to newer API keys ("no longer available to new users" —
// confirmed by direct testing against this project's key). gemini-3.5-flash is the current stable
// flash-tier model as of this writing; re-verify against `GET /v1beta/models` if generation starts
// failing with a 404 again — Google rotates model availability over time.
const GEMINI_MODEL = 'gemini-3.5-flash'

function requireGeminiKey(): string {
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) {
    throw new Error(
      "Missing GEMINI_API_KEY. Set it with 'supabase secrets set GEMINI_API_KEY=...' (cloud) " +
        "or in supabase/functions/.env (local 'supabase functions serve'). Refusing to fall back to mock content.",
    )
  }
  return key
}

interface GenerateOptions {
  systemInstruction: string
  prompt: string
  temperature?: number
  maxOutputTokens?: number
}

export async function generateWithGemini({
  systemInstruction,
  prompt,
  temperature = 0.8,
  maxOutputTokens = 1024,
}: GenerateOptions): Promise<string> {
  const apiKey = requireGeminiKey()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      // thinkingBudget: 0 disables gemini-3.5-flash's default internal "thinking" pass — without
      // this, invisible thought tokens can consume the whole maxOutputTokens budget before any
      // visible output is written, silently truncating short structured responses (observed as
      // "Unterminated string in JSON" on the daily-reading card generation). Our prompts don't need
      // multi-step reasoning, just grounded prose from facts already computed elsewhere.
      generationConfig: { temperature, maxOutputTokens, thinkingConfig: { thinkingBudget: 0 } },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Gemini API error (${res.status}): ${body}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
  if (!text) throw new Error('Gemini returned an empty response')
  return text.trim()
}

/**
 * The non-negotiable grounding rule, enforced in the prompt itself: the model
 * is only ever handed precomputed structured facts and asked to write prose
 * around them — never asked to determine or guess a planetary/house fact.
 */
export function factsGroundingPreamble(factsJson: string): string {
  return (
    'You are given precomputed, deterministically-calculated Vedic astrology facts as JSON below. ' +
    'These facts are authoritative and already correct — never contradict, recompute, or invent ' +
    'additional planetary positions, houses, nakshatras, or dasha periods. Only write natural, ' +
    'grounded prose that explains and personalizes these exact facts.\n\n' +
    `FACTS:\n${factsJson}\n\n`
  )
}

/**
 * Shared voice/style directive — append to every system instruction that generates user-facing
 * astrology prose (daily reading, chart summary, weekly report, compatibility, chat). Classical
 * terminology, not therapy-speak — but grounded ONLY in facts actually present in the FACTS block.
 *
 * Transits (Gochara — where the planets actually are today, via `_shared/transitFacts.ts`) are
 * included in the FACTS block for `daily-reading` and `chat` only; other functions (financial,
 * medical, compatibility, weekly-report) don't currently load them. The directive below handles
 * both cases generically — reference a transit only if transit facts are actually present in
 * THIS call's FACTS block, same "only what's given to you" rule as every other fact category.
 * Never let the model infer a transit position from natal data alone.
 */
export const CLASSICAL_VOICE_DIRECTIVE =
  'Write in the voice of a traditional Vedic astrologer: reference the specific planets, houses, ' +
  'signs, nakshatras, and dasha/antardasha periods driving each statement by name, every time — ' +
  'e.g. "with natal Moon in the 6th house from the ascendant, during your Venus Mahadasha–Mercury ' +
  'Antardasha, expect..." rather than "you may be feeling a bit off this week." If the FACTS block ' +
  'includes a "transits" section, weave in at least one specific transiting-planet observation (by ' +
  'name and house) — that is what makes today\'s reading different from yesterday\'s, not just ' +
  'restating the unchanging natal chart. Avoid generic self-help or therapy-speak phrasing ("things ' +
  'are smaller than they look," "trust the process," "lean into it") — every sentence should read as ' +
  'a specific astrological observation, not a mood or vibe. This is about phrasing, not license: ' +
  'still describe only the precomputed facts actually present in the FACTS block for this call — ' +
  'never a transit, dasha period, or any other fact that isn\'t there.\n\n' +
  'Precision and accessibility are not in tension — do both. A reader with zero astrology background ' +
  'should still walk away knowing exactly what to do or avoid today, not just what technical placement ' +
  'is active. So: after naming the real placement/transit/dasha driving a point, follow it with a ' +
  'concrete plain-language takeaway in the same sentence or the next one — never a separate ' +
  'disclaimer-style bolt-on, and never so watered down that the astrology disappears. The specificity ' +
  'is the whole point; translate it, don\'t drop it.'
