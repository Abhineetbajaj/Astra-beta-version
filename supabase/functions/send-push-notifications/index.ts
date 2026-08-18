// Cron-triggered daily push — the notification content is always real, computed fact, never
// manufactured urgency (see CLAUDE.md's push-notification honesty note). Today's Panchang event
// (Ekadashi/Amavasya/Purnima/Sankranti/Navratri), if any, is the same for every user — panchang is
// not location-specific in this engine — so it's computed once, not per user. Rahu Kaal IS
// location-specific, so it's computed per user from their own birth_profiles lat/lon and appended
// to whichever message applies. This is a once-a-day informational heads-up, not a live "starts in
// 20 minutes" alert — that would need per-user-timed scheduling this cron doesn't do.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { detectPanchangEvents } from '../_shared/astro-engine/panchangEvents.ts'
import { sunriseUTC, sunsetUTC } from '../_shared/astro-engine/sunTimes.ts'
import { rahuKaal } from '../_shared/astro-engine/muhurta.ts'
import { sendPush } from '../_shared/webPush.ts'

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing required environment variable: ${name}.`)
  return value
}

const EVENT_MESSAGES: Record<string, { title: string; body: string }> = {
  Ekadashi: { title: 'Today is Ekadashi', body: 'A traditional day of fasting and reflection.' },
  Amavasya: { title: 'Today is Amavasya', body: 'New moon — a traditional day for new beginnings and letting go.' },
  Purnima: { title: 'Today is Purnima', body: 'Full moon — a traditional day of culmination and gratitude.' },
  Sankranti: { title: 'Sankranti today', body: "The Sun changes sidereal sign today — worth noticing in your own chart." },
  Navratri: { title: 'Navratri has begun', body: 'Nine nights of the Devi — see Spiritual Wellness for where to start.' },
}

const FALLBACK_MESSAGE = { title: 'Astra', body: "Today's reading is ready — grounded in the sky right now." }

function formatIST(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
}

/** Today's Rahu Kaal window text for this location, or null if sunrise/sunset couldn't be computed (rare). */
function rahuKaalLine(lat: number, lon: number): string | null {
  const now = new Date()
  const sunrise = sunriseUTC(now, lat, lon)
  const sunset = sunsetUTC(now, lat, lon)
  if (!sunrise || !sunset) return null
  const window = rahuKaal(sunrise, sunset, sunrise.getUTCDay())
  return `Rahu Kaal today: ${formatIST(window.start)}–${formatIST(window.end)}.`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const cronSecret = requireEnv('CRON_SECRET')
    if (req.headers.get('x-cron-secret') !== cronSecret) return errorResponse('Forbidden', 403)

    const admin = supabaseAdmin()

    const todaysEvent = detectPanchangEvents(new Date(), 1)[0]?.event
    const baseMessage = todaysEvent ? EVENT_MESSAGES[todaysEvent] ?? FALLBACK_MESSAGE : FALLBACK_MESSAGE

    const { data: subscriptions, error } = await admin.from('push_subscriptions').select('*')
    if (error) throw new Error(`Failed to load push subscriptions: ${error.message}`)

    const userIds = [...new Set((subscriptions ?? []).map((s) => s.user_id))]
    const { data: birthProfiles } = await admin
      .from('birth_profiles')
      .select('user_id, lat, lon')
      .eq('relation', 'self')
      .in('user_id', userIds)
    const latLonByUser = new Map((birthProfiles ?? []).map((p) => [p.user_id, { lat: p.lat, lon: p.lon }]))

    let sent = 0
    let removed = 0
    let failed = 0

    for (const sub of subscriptions ?? []) {
      try {
        const location = latLonByUser.get(sub.user_id)
        const rahuLine = location ? rahuKaalLine(location.lat, location.lon) : null
        const message = rahuLine ? { title: baseMessage.title, body: `${baseMessage.body} ${rahuLine}` } : baseMessage

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
