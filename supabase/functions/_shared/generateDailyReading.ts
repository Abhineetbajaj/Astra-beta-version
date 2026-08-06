// Core "get or generate today's reading" logic, shared by the daily-reading HTTP endpoint and
// the cron-triggered send-daily-digest function — both need the exact same idempotent
// get-or-generate behavior and Gemini prompt, not two copies that can drift apart.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { loadChartFacts } from './loadChartFacts.ts'
import { loadTransitFacts } from './transitFacts.ts'
import { CLASSICAL_VOICE_DIRECTIVE, factsGroundingPreamble, generateWithGemini } from './gemini.ts'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export interface DailyReadingRow {
  id: string
  user_id: string
  birth_profile_id: string
  reading_date: string
  facts_used: unknown
  body: string
  focus_card: string
  love_card: string
  career_card: string
  watch_card: string
  created_at: string
}

/** Idempotent per (birth_profile, date) — never regenerates or burns a Gemini call once today's row exists. */
export async function generateDailyReading(
  admin: SupabaseClient,
  userId: string,
  birthProfileId: string,
): Promise<{ reading: DailyReadingRow; cached: boolean }> {
  const date = todayISO()
  const { data: existing } = await admin
    .from('daily_readings')
    .select('*')
    .eq('birth_profile_id', birthProfileId)
    .eq('reading_date', date)
    .maybeSingle()
  if (existing) return { reading: existing, cached: true }

  const facts = await loadChartFacts(admin, 'birth_profile', birthProfileId)
  const transits = await loadTransitFacts(admin, facts.natalChartId)

  const moon = facts.placements.find((p) => p.planet === 'Moon')
  const factsTag = [
    moon ? `Moon in ${moon.sign}` : null,
    `${facts.currentDasha.mahadashaLord} Mahadasha`,
    facts.currentDasha.antardashaLord ? `${facts.currentDasha.antardashaLord} Antardasha` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const prompt =
    factsGroundingPreamble(JSON.stringify({ ...facts, transits }, null, 2)) +
    `Today's date: ${date}.\n\n` +
    'Write a JSON object with exactly these keys. Every field names the real placement/transit driving it ' +
    'AND ends with a concrete, plain-language "so what" a reader with zero astrology background can act on ' +
    'today — same sentence, not a separate disclaimer-style add-on, and not a vague platitude like "stay ' +
    'positive". Keep the specific astrological citation; translate it, don\'t drop it — the precision is what ' +
    'makes this read as a real astrologer rather than a generic horoscope.\n' +
    '"body" — 3-4 sentences. Open with something concrete tied to a CURRENT TRANSIT (a transiting planet in a ' +
    'specific natal house, or the Sade Sati/Jupiter transit facts if notable) combined with the current mahadasha/' +
    'antardasha lord — never a generic opener like "the stars align" or "today brings energy". Name the actual ' +
    'transiting planet and the natal house/placement it\'s interacting with. End with one small, concrete, doable ' +
    'suggestion for today, not a vague platitude.\n' +
    'For "focus"/"love"/"career"/"watch" below: 2-3 sentences each, not 1. Sentence 1 names the fact and briefly ' +
    'explains WHY it produces this effect (the mechanism — what that planet/house/transit actually governs), not ' +
    'just that it does. Sentence 2 (and 3 if needed) gives one concrete, specific action — a real thing to do, ' +
    'not a category. "Handle communication tasks" is a category; "send that email you\'ve been drafting, or have ' +
    'the direct conversation you\'ve been avoiding" is a specific action. Same bar for what to avoid on "watch".\n' +
    '"focus" — a specific and actionable focus for today, tied to a transit or dasha fact above.\n' +
    '"love" — specific to their placements (e.g. Venus\'s sign/house/dignity, the 7th house, or a transit through ' +
    'it), not generic relationship advice.\n' +
    '"career" — tied to the 10th house, its lord, a transit through it, or the current dasha lord\'s significations.\n' +
    '"watch" — one real friction point from today\'s facts (a challenging transit, a demanding dasha, a ' +
    '6th/8th/12th house factor) — specific, not "be careful today".\n' +
    'Vary sentence structure and vocabulary — do not reuse the same opening pattern across the four cards. ' +
    'Output ONLY the JSON object, no markdown fences.'

  const raw = await generateWithGemini({
    systemInstruction:
      'You are Astra, a Vedic astrologer with real expertise — precise, warm, and specific, never a generic ' +
      'horoscope-column voice. Every sentence you write should be traceable to a specific fact you were given: ' +
      'a planet, sign, house, nakshatra, dignity, dasha period, or transit. Avoid stock astrology phrases ("cosmic ' +
      'energy", "the universe is aligning", "exciting things ahead") — ground everything in the actual chart. You ' +
      `never invent astrological facts — you only interpret the ones given to you. ${CLASSICAL_VOICE_DIRECTIVE}`,
    prompt,
    temperature: 0.95,
    maxOutputTokens: 1536,
  })

  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '')
  const parsed = JSON.parse(cleaned)

  const { data: inserted, error: insertError } = await admin
    .from('daily_readings')
    .insert({
      user_id: userId,
      birth_profile_id: birthProfileId,
      reading_date: date,
      facts_used: { factsTag, facts, transits },
      body: parsed.body,
      focus_card: parsed.focus,
      love_card: parsed.love,
      career_card: parsed.career,
      watch_card: parsed.watch,
    })
    .select()
    .single()

  if (insertError) {
    // 23505 = unique_violation. React StrictMode (and any accidental double-invoke) can fire this
    // twice concurrently; both pass the "existing?" check before either has inserted. The loser of
    // that race isn't actually an error — the winner's row is what we want.
    if (insertError.code === '23505') {
      const { data: winner } = await admin
        .from('daily_readings')
        .select('*')
        .eq('birth_profile_id', birthProfileId)
        .eq('reading_date', date)
        .single()
      if (winner) return { reading: winner, cached: true }
    }
    throw new Error(`Failed to save reading: ${insertError.message}`)
  }

  return { reading: inserted, cached: false }
}
