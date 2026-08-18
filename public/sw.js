// Minimal service worker — exists only to receive Web Push events and route notification taps.
// No offline caching / asset pre-fetch here; that's a separate concern from push and adding it
// blind risks serving stale app code, so it's deliberately left out of this pass.

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = { title: 'Astra', body: 'Your reading is ready.', url: '/dashboard' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch {
    // non-JSON push payload — fall back to the default text above rather than crashing the worker
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: payload.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url ?? '/dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    }),
  )
})
