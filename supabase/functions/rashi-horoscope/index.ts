// Public "quick horoscope" — pick any rashi, see a generic reading for today. Deliberately NOT
// personalized (no birth chart involved) and NOT claiming to know any transit positions this app
// doesn't compute. Grounded only in the sign's own static classical facts (element, lord) and
// today's weekday ruling planet — a real, if simple, classical technique (each weekday is
// classically ruled by a graha; a sign's relationship to that day's ruler is traditionally used
// for generic daily guidance). Cached per (rashi, date) — every user sees the same reading for the
// same sign on the same day, same idempotency pattern as daily-reading.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabaseAdmin.ts'
import { CLASSICAL_VOICE_DIRECTIVE, generateWithGemini } from '../_shared/gemini.ts'
import { RASHIS, RASHI_LORD } from '../_shared/data/rashis.ts'

const WEEKDAY_RULERS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] // Sunday=0

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { admin } = await requireUser(req) // signed-in users only, but not Premium-gated — quick/general content
    const { rashiIndex } = await req.json()
    if (typeof rashiIndex !== 'number' || rashiIndex < 0 || rashiIndex > 11) {
      return errorResponse('rashiIndex must be 0-11')
    }

    const date = todayISO()
    const { data: existing } = await admin
      .from('rashi_horoscopes')
      .select('*')
      .eq('rashi_index', rashiIndex)
      .eq('horoscope_date', date)
      .maybeSingle()
    if (existing) return jsonResponse({ horoscope: existing, cached: true })

    const rashi = RASHIS[rashiIndex]
    const rashiLord = RASHI_LORD[rashiIndex]
    const weekday = new Date().getUTCDay()
    const dayRuler = WEEKDAY_RULERS[weekday]
    const facts = {
      rashi: rashi.name,
      sanskrit: rashi.sanskrit,
      element: rashi.element,
      rashiLord,
      dayRuler,
      dayRulerIsOwnLord: dayRuler === rashiLord,
    }

    const prompt =
      `FACTS (the only real facts you have — no birth chart, no transits, do not invent any):\n${JSON.stringify(facts, null, 2)}\n\n` +
      'Write a JSON object with exactly these keys:\n' +
      '"body" — 2-3 sentences of general daily guidance for this sign, grounded ONLY in its element, its ruling ' +
      'planet, and today\'s weekday ruler (mention if today\'s ruler matches the sign\'s own lord — traditionally a ' +
      'more favorable day for that sign). This is intentionally general (a public "quick horoscope"), not from a ' +
      'real birth chart — do not imply otherwise, and never invent a specific transit or placement.\n' +
      '"mood" — one or two words (e.g. "Reflective", "Energized").\n' +
      '"luckyNumber" — an integer 1-9.\n' +
      '"luckyColor" — one color word.\n' +
      'Output ONLY the JSON object, no markdown fences.'

    const raw = await generateWithGemini({
      systemInstruction:
        'You are Astra, writing a short general/public daily horoscope by zodiac sign — the classical newspaper-' +
        'horoscope format, not a personalized chart reading. Stay grounded in the sign\'s real classical ' +
        `attributes given to you; never claim to know the reader's specific placements. ${CLASSICAL_VOICE_DIRECTIVE}`,
      prompt,
      temperature: 0.9,
      maxOutputTokens: 400,
    })

    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '')
    const parsed = JSON.parse(cleaned)

    const { data: inserted, error: insertError } = await admin
      .from('rashi_horoscopes')
      .insert({
        rashi_index: rashiIndex,
        horoscope_date: date,
        body: parsed.body,
        mood: parsed.mood,
        lucky_number: parsed.luckyNumber,
        lucky_color: parsed.luckyColor,
      })
      .select()
      .single()

    if (insertError) {
      // Race with another user picking the same sign at the same moment — not a real failure.
      if (insertError.code === '23505') {
        const { data: winner } = await admin
          .from('rashi_horoscopes')
          .select('*')
          .eq('rashi_index', rashiIndex)
          .eq('horoscope_date', date)
          .single()
        if (winner) return jsonResponse({ horoscope: winner, cached: true })
      }
      throw new Error(`Failed to save horoscope: ${insertError.message}`)
    }

    return jsonResponse({ horoscope: inserted, cached: false })
  } catch (err) {
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
