// Thin wrapper around the `web-push` npm package (via Deno's npm compat, same pattern as
// `npm:@supabase/supabase-js@2` elsewhere in _shared/) — the only place any edge function should
// send a push message, so VAPID configuration lives in exactly one spot.
import webpush from 'npm:web-push@3'

let configured = false

function ensureConfigured(): void {
  if (configured) return
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT')
  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "Missing VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT. Set with 'supabase secrets set ...'. Refusing to fall back to mock sends.",
    )
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

export interface PushSubscriptionInput {
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Sends one push message. `'gone'` means the browser/device unsubscribed or the subscription
 * expired (a 404/410 from the push service) — the caller should delete that row, this is normal
 * churn, not a real error.
 */
export async function sendPush(sub: PushSubscriptionInput, payload: PushPayload): Promise<'sent' | 'gone' | 'error'> {
  ensureConfigured()
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    )
    return 'sent'
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode
    if (statusCode === 404 || statusCode === 410) return 'gone'
    console.error('sendPush failed:', err)
    return 'error'
  }
}
