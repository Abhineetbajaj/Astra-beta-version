// Core "get or generate today's Personal Day reading" logic — the numerology habit-loop
// counterpart to generateDailyReading.ts. Idempotent per (birth_profile, date): the client-side
// Personal Day number renders instantly for free (see src/numerology-engine/personalCycles.ts),
// this only covers the short AI-narrated blurb layered on top, which does cost Gemini budget.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { computePersonalCycles } from './numerology-engine/index.ts'
import { factsGroundingPreamble, generateWithGemini, NUMEROLOGY_VOICE_DIRECTIVE } from './gemini.ts'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export interface NumerologyDailyReadingRow {
  id: string
  user_id: string
  birth_profile_id: string
  reading_date: string
  personal_year: number
  personal_month: number
  personal_day: number
  facts_used: unknown
  body: string
  created_at: string
}

/** Idempotent per (birth_profile, date) — never regenerates or burns a Gemini call once today's row exists. */
export async function generateNumerologyDailyReading(
  admin: SupabaseClient,
  userId: string,
  birthProfileId: string,
  dateOfBirth: string,
): Promise<{ reading: NumerologyDailyReadingRow; cached: boolean }> {
  const date = todayISO()
  const { data: existing } = await admin
    .from('numerology_daily_readings')
    .select('*')
    .eq('birth_profile_id', birthProfileId)
    .eq('reading_date', date)
    .maybeSingle()
  if (existing) return { reading: existing, cached: true }

  const cycles = computePersonalCycles(dateOfBirth, new Date())

  const prompt =
    factsGroundingPreamble(JSON.stringify({ cycles }, null, 2)) +
    `Today's date: ${date}.\n\n` +
    'Write a 2-3 sentence Personal Day reading. Name the Pythagorean Personal Day number explicitly, ' +
    'explain the theme it carries today, and end with one concrete, doable suggestion for today — not ' +
    'a vague platitude. If the Personal Day (or Personal Month/Year) is a master number, say so and ' +
    'explain what that amplification means today specifically.'

  const body = await generateWithGemini({
    systemInstruction:
      'You are Astra, writing a short daily numerology check-in — warm, specific, and grounded in ' +
      `the exact number computed for today. ${NUMEROLOGY_VOICE_DIRECTIVE}`,
    prompt,
    temperature: 0.9,
  })

  const { data: inserted, error: insertError } = await admin
    .from('numerology_daily_readings')
    .insert({
      user_id: userId,
      birth_profile_id: birthProfileId,
      reading_date: date,
      personal_year: cycles.personalYear.value,
      personal_month: cycles.personalMonth.value,
      personal_day: cycles.personalDay.value,
      facts_used: cycles,
      body,
    })
    .select()
    .single()

  if (insertError) {
    // 23505 = unique_violation. Two tabs open on the same day can both pass the "existing?" check
    // before either has inserted — same race generateDailyReading.ts documents. The loser of that
    // race isn't actually an error; the winner's row is what we want.
    if (insertError.code === '23505') {
      const { data: winner } = await admin
        .from('numerology_daily_readings')
        .select('*')
        .eq('birth_profile_id', birthProfileId)
        .eq('reading_date', date)
        .single()
      if (winner) return { reading: winner, cached: true }
    }
    throw new Error(`Failed to save numerology daily reading: ${insertError.message}`)
  }

  return { reading: inserted, cached: false }
}
