/**
 * Shown instead of the app when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing.
 * Astra's astrology facts, auth, and payments now require a real Supabase backend — there is
 * no client-only mock mode to silently fall back to (see CLAUDE.md non-negotiable #5).
 */
export default function BackendNotConfigured() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-wide text-ink-faint">Setup required</p>
        <h1 className="mt-2 font-display text-3xl">Backend isn't configured yet</h1>
        <p className="mt-4 text-ink-muted">
          Astra needs a real Supabase project to run — copy <code className="rounded bg-paper-raised px-1.5 py-0.5">.env.example</code> to{' '}
          <code className="rounded bg-paper-raised px-1.5 py-0.5">.env</code> and set{' '}
          <code className="rounded bg-paper-raised px-1.5 py-0.5">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-paper-raised px-1.5 py-0.5">VITE_SUPABASE_ANON_KEY</code> from your project's API
          settings, then restart the dev server.
        </p>
        <p className="mt-3 text-sm text-ink-faint">See CLAUDE.md for the full setup checklist.</p>
      </div>
    </div>
  )
}
