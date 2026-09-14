// The single grounded-reasoning path for conversational Astra. Extracted verbatim from
// chat/index.ts so that text chat and (from B2.3) voice chat share ONE astrology reasoning source
// of truth — two copies of this prompt would drift the first time either is tuned.
//
// Every response is grounded in the user's real stored chart facts, passed as context with every
// request; the model never receives raw birth data and is never asked to compute anything
// astrological itself.
//
// Callers own HTTP concerns (auth, parsing, status codes, response shape). This owns facts,
// history, prompt, generation, and persistence.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { loadChartFacts } from './loadChartFacts.ts'
import { loadTransitFacts } from './transitFacts.ts'
import { CLASSICAL_VOICE_DIRECTIVE, GEMINI_MODEL, factsGroundingPreamble, generateWithGemini } from './gemini.ts'

const HISTORY_LIMIT = 12

/** The user has no self birth profile yet, so there is no chart to ground against. Callers map
    this to HTTP 409 — mirrors the PremiumRequiredError pattern in _shared/premium.ts. */
export class BirthProfileRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BirthProfileRequiredError'
  }
}

/** Optional provenance for "Ask Astra about this" entry points (chart planet, house, dasha,
    numerology, wellness, founder). Accepted as of B2.1 but DELIBERATELY UNUSED — it does not touch
    the prompt yet, which is what keeps the B2.1 extraction behaviour-neutral. Wired in B2.8. */
export interface GroundedChatContext {
  source: 'chart' | 'dasha' | 'house' | 'numerology' | 'wellness' | 'founder'
  ref: string
  label: string
}

export interface GroundedChatResult {
  /** The inserted assistant row, returned to the caller exactly as chat/index.ts always has. */
  message: Record<string, unknown>
  /** The facts snapshot that grounded this reply — also persisted as facts_used. */
  factsUsed: unknown
  /** The model that actually produced the reply, for metering. Read from gemini.ts rather than
      restated, so it cannot drift out of sync with the model really being called. */
  model: string
}

export async function generateGroundedReply(opts: {
  admin: SupabaseClient
  userId: string
  /** Typed text, or a speech transcript. This layer does not care which. */
  message: string
  context?: GroundedChatContext
}): Promise<GroundedChatResult> {
  const { admin, userId, message } = opts

  const { data: selfProfile } = await admin
    .from('birth_profiles')
    .select('id')
    .eq('user_id', userId)
    .eq('relation', 'self')
    .maybeSingle()
  if (!selfProfile) throw new BirthProfileRequiredError('Complete your birth profile before using Ask Astra.')

  const facts = await loadChartFacts(admin, 'birth_profile', selfProfile.id)
  const transits = await loadTransitFacts(admin, facts.natalChartId)

  const { data: history } = await admin
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT)

  const conversation = (history ?? [])
    .reverse()
    .map((m) => `${m.role === 'user' ? 'User' : 'Astra'}: ${m.content}`)
    .join('\n')

  const prompt =
    factsGroundingPreamble(JSON.stringify({ ...facts, transits }, null, 2)) +
    (conversation ? `Recent conversation:\n${conversation}\n\n` : '') +
    `User's new message: ${message}\n\n` +
    'Reply as Astra. Rules:\n' +
    '- Answer the actual question first — don\'t open with throat-clearing like "great question" or a restatement.\n' +
    '- Cite the specific fact(s) driving your answer by name (planet, sign, house, nakshatra, dignity, dasha ' +
    'lord, or current transit) rather than vague references to "your chart".\n' +
    '- If asked about "today"/"right now"/"currently", use the "transits" section (where the planets actually ' +
    'are today, including the Sade Sati and Jupiter-transit flags) rather than only the unchanging natal chart.\n' +
    '- If a dignity, yoga, or house placement is unusually strong or weak, say so plainly — don\'t soften every ' +
    'observation into pure positivity.\n' +
    '- 2-4 sentences for a normal question; go longer only if the question genuinely needs it (e.g. "explain my ' +
    'whole chart").\n' +
    '- If the question needs a fact not present above (a different chart, a specific past/future date\'s ' +
    'planetary positions), say plainly that you don\'t have that and explain what would be needed — never guess ' +
    'or invent it.\n' +
    '- Match the conversational thread above — don\'t repeat a point you already made unless asked to elaborate.'

  // Generate BEFORE persisting the user's message. Inserting first meant a failed generation
  // (e.g. the Gemini daily quota running out) left an orphaned question in the history forever,
  // with no reply and no way to retry it — the user's chat log filled with dead ends.
  const reply = await generateWithGemini({
    systemInstruction:
      'You are Astra, a Vedic astrologer having a real one-on-one conversation — knowledgeable, direct, and warm ' +
      'without being saccharine. You know the user\'s real chart in full detail and reference it specifically: ' +
      'name the planet, sign, house, nakshatra, or dasha period behind every claim. You have opinions grounded in ' +
      `classical technique, not just encouragement. You never invent astrological facts. ${CLASSICAL_VOICE_DIRECTIVE}`,
    prompt,
    temperature: 0.9,
  })

  const factsUsed = { ...facts, transits }

  const { error: userInsertError } = await admin
    .from('chat_messages')
    .insert({ user_id: userId, role: 'user', content: message })
  if (userInsertError) throw new Error(`Failed to save user message: ${userInsertError.message}`)

  const { data: assistantRow, error: assistantInsertError } = await admin
    .from('chat_messages')
    .insert({ user_id: userId, role: 'assistant', content: reply, facts_used: factsUsed })
    .select()
    .single()
  if (assistantInsertError) throw new Error(`Failed to save reply: ${assistantInsertError.message}`)

  return { message: assistantRow, factsUsed, model: GEMINI_MODEL }
}
