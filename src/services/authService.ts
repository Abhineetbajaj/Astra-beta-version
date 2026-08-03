import { supabase } from '@/lib/supabaseClient'

/** Returns true if email confirmation is required before a session exists (project-dependent Supabase Auth setting). */
export async function signUpWithEmail(email: string, password: string, displayName: string): Promise<{ needsEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })
  if (error) throw new Error(error.message)
  return { needsEmailConfirmation: !data.session }
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
}

/**
 * Redirects to Google's consent screen; the session is picked up on return via onAuthStateChange.
 * Redirects to /dashboard (not "/") so the AuthGate there routes a first-time Google login through
 * onboarding exactly like email sign-up — the bare site root is unguarded and doesn't check auth.
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/dashboard` },
  })
  if (error) throw new Error(error.message)
}

export async function signOut() {
  await supabase.auth.signOut()
}
