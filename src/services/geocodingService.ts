export interface GeocodeResult {
  label: string
  lat: number
  lon: number
}

const CACHE_KEY = 'astra-geocode-cache'
// Nominatim usage policy requires self-identification since browsers can't set a
// custom User-Agent header; an email query param satisfies that without a proxy.
const CONTACT_EMAIL = 'astra-app@example.com'

function readCache(): Record<string, GeocodeResult[]> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function writeCache(cache: Record<string, GeocodeResult[]>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

/**
 * Explicit-action place search against Nominatim (OpenStreetMap), cached client-side
 * to respect the 1 req/sec usage policy. This is a dev/personal-scale integration —
 * not hardened for production traffic. Callers should always offer a manual
 * lat/lon/UTC-offset fallback alongside this (see OnboardingPage).
 */
export async function searchPlace(query: string): Promise<GeocodeResult[]> {
  const key = query.trim().toLowerCase()
  if (key.length < 3) return []

  const cache = readCache()
  if (cache[key]) return cache[key]

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '5')
  url.searchParams.set('email', CONTACT_EMAIL)

  let res: Response
  try {
    res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  } catch {
    throw new Error('Place search can\'t reach the network from here.')
  }
  if (!res.ok) {
    throw new Error('Place search is unavailable right now.')
  }

  const data: Array<{ display_name: string; lat: string; lon: string }> = await res.json()
  const results = data.map((d) => ({
    label: d.display_name,
    lat: parseFloat(d.lat),
    lon: parseFloat(d.lon),
  }))

  cache[key] = results
  writeCache(cache)
  return results
}
