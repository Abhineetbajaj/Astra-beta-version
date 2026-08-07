// Ask Astra — the priority Gemini integration point (see project brief §4.4).
// Every response is grounded in the user's real stored chart facts, passed as
// context with every request; the model never receives raw birth data and is
// never asked to compute anything astrological itself.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabaseAdmin.ts'
import { loadChartFacts } from '../_shared/loadChartFacts.ts'
import { loadTransitFacts } from '../_shared/transitFacts.ts'
import { CLASSICAL_VOICE_DIRECTIVE, factsGroundingPreamble, generateWithGemini } from '../_shared/gemini.ts'

const HISTORY_LIMIT = 12

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user, admin } = await requireUser(req)
    const { message } = await req.json()
    if (!message || typeof message !== 'string') return errorResponse('message is required')

    const { data: selfProfile } = await admin
      .from('birth_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('relation', 'self')
      .maybeSingle()
    if (!selfProfile) return errorResponse('Complete your birth profile before using Ask Astra.', 409)

    const facts = await loadChartFacts(admin, 'birth_profile', selfProfile.id)
    const transits = await loadTransitFacts(admin, facts.natalChartId)

    const { data: history } = await admin
      .from('chat_messages')
      .select('role, content')
      .eq('user_id', user.id)
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

    const { error: userInsertError } = await admin
      .from('chat_messages')
      .insert({ user_id: user.id, role: 'user', content: message })
    if (userInsertError) throw new Error(`Failed to save user message: ${userInsertError.message}`)

    const { data: assistantRow, error: assistantInsertError } = await admin
      .from('chat_messages')
      .insert({ user_id: user.id, role: 'assistant', content: reply, facts_used: { ...facts, transits } })
      .select()
      .single()
    if (assistantInsertError) throw new Error(`Failed to save reply: ${assistantInsertError.message}`)

    return jsonResponse({ message: assistantRow })
  } catch (err) {
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
