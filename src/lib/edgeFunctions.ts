import { supabase } from '@/lib/supabaseClient'

/** Calls a Supabase Edge Function with the current session's access token. Throws with the server's error message on failure. */
export async function callEdgeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('You need to be signed in for that.')

  const { data, error } = await supabase.functions.invoke<T>(name, {
    body,
    headers: { Authorization: `Bearer ${token}` },
  })

  if (error) {
    // supabase-js wraps non-2xx responses in a generic FunctionsHttpError ("Edge Function returned
    // a non-2xx status code") with no detail; surface our own { error: string } body instead.
    const context = (error as { context?: Response }).context
    let detail: string | undefined
    if (context) {
      try {
        const body = await context.json()
        detail = body?.error
      } catch {
        // response body wasn't JSON (or was already consumed) — fall through to the generic message
      }
    }
    console.error(`callEdgeFunction(${name}) failed:`, detail ?? error.message, error)
    throw new Error(detail ?? error.message)
  }

  return data as T
}
