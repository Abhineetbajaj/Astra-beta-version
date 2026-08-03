import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * True only when the backend is actually configured. Checked at app root
 * (see App.tsx) to fail loudly with a clear setup screen rather than letting
 * every subsequent Supabase call throw an opaque network error.
 */
export const isBackendConfigured = Boolean(url && anonKey)

// Falling back to placeholder strings when unconfigured keeps `createClient` from throwing at
// import time — App.tsx gates the whole app on `isBackendConfigured` before anything calls this.
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder')
