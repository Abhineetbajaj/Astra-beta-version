// One-time (or re-run-when-adding-content) generator for the evergreen "Listen" library:
// 7 need-tagged reflections + 9 graha mantra tracks. Not scheduled — manually invoked. Unlike
// generate-meditation-tracks, this content isn't personalized to any user's real chart (there's no
// "current dasha lord" for a generic "financial blocks" reflection) — it's grounded in the
// established classical significations of a planet instead, same non-negotiable as everywhere
// else in this app: the model never invents astrology, it only writes prose around a given fact
// (here, "Saturn classically governs discipline and delay", not a computed placement).

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { MEDITATIVE_VOICE_DIRECTIVE, generateWithGemini } from '../_shared/gemini.ts'
import { NEED_TAGS, MANTRA_PLANETS } from '../_shared/data/meditationTaxonomy.ts'
import { GRAHA_MANTRAS } from '../_shared/data/grahaMantras.ts'

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing required environment variable: ${name}.`)
  return value
}

async function trackExists(admin: ReturnType<typeof supabaseAdmin>, dedupeKey: string): Promise<boolean> {
  const { data } = await admin.from('meditation_tracks').select('id').eq('dedupe_key', dedupeKey).maybeSingle()
  return !!data
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// The free Gemini tier caps at 5 requests/minute — this function makes up to 16 sequential calls
// in one run, so it paces itself rather than bursting and hitting a 429. Not time-critical (this
// is a manually-invoked, low-frequency function), so a slow, reliable pace beats a fast, flaky one.
const GEMINI_PACING_MS = 13_000

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const cronSecret = requireEnv('CRON_SECRET')
    if (req.headers.get('x-cron-secret') !== cronSecret) return errorResponse('Forbidden', 403)

    // Edge Functions have a wall-clock/compute budget well under what 16 paced Gemini calls need
    // in one run (confirmed live: a full run hit WORKER_RESOURCE_LIMIT). maxItems lets this be
    // invoked repeatedly in small batches instead — dedupe_key makes every call idempotent, so
    // re-invoking just resumes from wherever the previous call stopped.
    const { maxItems = 4 } = await req.json().catch(() => ({}))

    const admin = supabaseAdmin()
    let created = 0
    let skipped = 0

    for (const [i, need] of NEED_TAGS.entries()) {
      if (created >= maxItems) break
      const dedupeKey = `need:${need.key}`
      if (await trackExists(admin, dedupeKey)) {
        skipped++
        continue
      }
      if (created > 0) await sleep(GEMINI_PACING_MS)

      const prompt =
        `The reader is dealing with: ${need.label}. In classical Vedic astrology, this life-area is most ` +
        `associated with: ${need.planetContext}. Write a short reflective script (150-250 words) that opens by ` +
        `naming that planetary association once, then offers calming, grounded reflection for someone ` +
        `experiencing "${need.label}" — general, since this isn't tied to any one person's real chart, but ` +
        `still astrologically specific to what ${need.planetContext} classically represents, not generic ` +
        `wellness copy that could apply to any app. Do not invent a specific placement, house, or transit — ` +
        `you don't have one to work from; only use the general classical significations of ${need.planetContext}.`

      const script = await generateWithGemini({
        systemInstruction:
          'You are Astra, writing for the "Browse by Need" library — evergreen reflective scripts, not ' +
          `personalized readings. ${MEDITATIVE_VOICE_DIRECTIVE}`,
        prompt,
        temperature: 0.85,
      })

      const { error } = await admin.from('meditation_tracks').insert({
        category: 'need',
        title: need.label,
        script_text: script,
        planet_context: need.planetContext,
        need_tag: need.key,
        is_premium: i !== 0, // first need tag is the free conversion-nudge sample
        dedupe_key: dedupeKey,
      })
      if (error) throw new Error(`Failed to insert need track "${need.key}": ${error.message}`)
      created++
    }

    for (const [i, mantra] of MANTRA_PLANETS.entries()) {
      if (created >= maxItems) break
      const dedupeKey = `mantra:${mantra.planet}`
      if (await trackExists(admin, dedupeKey)) {
        skipped++
        continue
      }
      if (created > 0) await sleep(GEMINI_PACING_MS)

      const mantraText = GRAHA_MANTRAS[mantra.planet]
      const prompt =
        `The mantra text is: "${mantraText}" — this is a fixed classical beej mantra for ${mantra.planet}, ` +
        `given exactly as written; do not alter, translate, or paraphrase it. When to use it: ${mantra.whenToUse} ` +
        `Write a short (80-120 word) practice framing: what this mantra is for, and a simple, calm instruction ` +
        `for chanting it (e.g. a suggested repetition count like 11 or 108, quietly or aloud). Do not invent a ` +
        'specific placement for the reader — this is general practice guidance, not a personalized reading.'

      const framing = await generateWithGemini({
        systemInstruction:
          'You are Astra, writing for the Graha Mantra library. You never alter or invent mantra text — only ' +
          `the practice guidance around a mantra given to you exactly as-is. ${MEDITATIVE_VOICE_DIRECTIVE}`,
        prompt,
        temperature: 0.8,
      })

      const { error } = await admin.from('meditation_tracks').insert({
        category: 'mantra',
        title: `${mantra.planet} beej mantra`,
        script_text: `${mantraText}\n\n${framing}`,
        planet_context: mantra.planet,
        is_premium: i !== 0, // Sun's mantra is the free sample
        dedupe_key: dedupeKey,
      })
      if (error) throw new Error(`Failed to insert mantra track "${mantra.planet}": ${error.message}`)
      created++
    }

    return jsonResponse({ created, skipped })
  } catch (err) {
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
