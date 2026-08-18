// Cron-triggered daily push — the notification content is always real, computed fact, never
// manufactured urgency (see CLAUDE.md's push-notification honesty note). Today's Panchang event
// (Ekadashi/Amavasya/Purnima/Sankranti/Navratri), if any, is the same for every user — panchang is
// not location-specific in this engine — so it's computed once, not per user. No Rahu Kaal/
// muhurta content here: that timing engine doesn't exist yet, and this must never claim more than
// what's actually computed.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { detectPanchangEvents } from '../_shared/astro-engine/panchangEvents.ts'
import { sendPush } from '../_shared/webPush.ts'

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing required environment variable: ${name}.`)
  return value
}

const EVENT_MESSAGES: Record<string, { title: string; body: string }> = {
  Ekadashi: { title: 'Today is Ekadashi', body: 'A traditional day of fasting and reflection — see today\'s reading.' },
  Amavasya: { title: 'Today is Amavasya', body: 'New moon — a traditional day for new beginnings and letting go.' },
  Purnima: { title: 'Today is Purnima', body: 'Full moon — a traditional day of culmination and gratitude.' },
  Sankranti: { title: 'Sankranti today', body: 'The Sun changes sidereal sign today — worth noticing in your own chart.' },
  Navratri: { title: 'Navratri has begun', body: 'Nine nights of the Devi — see Spiritual Wellness for where to start.' },
}

const FALLBACK_MESSAGE = { title: 'Astra', body: "Today's reading is ready — grounded in the sky right now." }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const cronSecret = requireEnv('CRON_SECRET')
    if (req.headers.get('x-cron-secret') !== cronSecret) return errorResponse('Forbidden', 403)

    const admin = supabaseAdmin()

    const todaysEvent = detectPanchangEvents(new Date(), 1)[0]?.event
    const message = todaysEvent ? EVENT_MESSAGES[todaysEvent] ?? FALLBACK_MESSAGE : FALLBACK_MESSAGE

    const { data: subscriptions, error } = await admin.from('push_subscriptions').select('*')
    if (error) throw new Error(`Failed to load push subscriptions: ${error.message}`)

    let sent = 0
    let removed = 0
    let failed = 0

    for (const sub of subscriptions ?? []) {
      try {
        const result = await sendPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          { ...message, url: '/dashboard' },
        )
        if (result === 'sent') sent++
        else if (result === 'gone') {
          removed++
          await admin.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          failed++
        }
      } catch (perSubErr) {
        // One dead/misbehaving subscription must not block the rest of the batch — same
        // per-recipient try/catch discipline as send-daily-digest.
        console.error(`send-push-notifications failed for subscription ${sub.id}:`, perSubErr)
        failed++
      }
    }

    return jsonResponse({ event: todaysEvent ?? null, total: subscriptions?.length ?? 0, sent, removed, failed })
  } catch (err) {
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
