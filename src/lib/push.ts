// Web Push subscription management — self-hosted VAPID, no third-party push service. The client
// registers the service worker, subscribes via PushManager, and saves the subscription server-side;
// `supabase/functions/send-push-notifications` reads it back to actually send pushes.

import { supabase } from '@/lib/supabaseClient'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export function isPushSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

/** Registers the service worker once at app startup. Safe to call repeatedly; no-ops if unsupported. */
export async function registerServiceWorker(): Promise<void> {
  if (!isPushSupported()) return
  try {
    await navigator.serviceWorker.register('/sw.js')
  } catch (err) {
    console.error('Service worker registration failed:', err)
  }
}

// `new Uint8Array(length)` (rather than `Uint8Array.from(...)`) so this is typed as backed by a
// plain ArrayBuffer, not the wider ArrayBufferLike — PushManager.subscribe's applicationServerKey
// wants BufferSource, which the ArrayBufferLike variant doesn't structurally satisfy.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

/** Null if push isn't supported, permission hasn't been granted, or there's simply no active subscription yet. */
export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

/**
 * Requests notification permission, subscribes via the service worker's PushManager, and saves
 * the subscription server-side (keyed by `endpoint`, so re-subscribing on the same device/browser
 * upserts rather than duplicates). Throws with a clear, user-facing message at every failure step
 * — no silent fallback, matching CLAUDE.md rule 5.
 */
export async function subscribeToPush(userId: string): Promise<void> {
  if (!isPushSupported()) throw new Error('Push notifications are not supported in this browser.')
  if (!VAPID_PUBLIC_KEY) throw new Error('Push notifications are not configured yet.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })

  const keys = subscription.toJSON().keys
  if (!keys?.p256dh || !keys?.auth) throw new Error('Push subscription is missing required keys.')

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { user_id: userId, endpoint: subscription.endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: 'endpoint' },
    )
  if (error) throw new Error(error.message)
}

/** Unsubscribes this device/browser both from the browser's push service and from Astra's records. */
export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getExistingPushSubscription()
  if (!subscription) return
  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
}
