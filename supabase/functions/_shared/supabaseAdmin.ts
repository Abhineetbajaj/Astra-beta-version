// Service-role Supabase client for edge functions — bypasses RLS by design,
// since generated content (readings/chat/compatibility/financial/medical) and
// billing rows are never written by the client directly. Also resolves the
// calling user from the request's bearer JWT.

import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Set it with 'supabase secrets set ${name}=...'.`)
  }
  return value
}

export function supabaseAdmin(): SupabaseClient {
  const url = requireEnv('SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } })
}

/** Resolves the authenticated user from the request's Authorization header. Throws if absent/invalid. */
export async function requireUser(req: Request): Promise<{ user: User; admin: SupabaseClient }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('Missing Authorization header')

  const admin = supabaseAdmin()
  const token = authHeader.replace('Bearer ', '')
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) throw new Error('Invalid or expired session')

  return { user: data.user, admin }
}
