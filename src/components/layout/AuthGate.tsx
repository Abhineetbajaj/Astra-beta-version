import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function AuthGate() {
  const session = useAuthStore((s) => s.session)
  const selfBirthProfile = useAuthStore((s) => s.selfBirthProfile)
  const loading = useAuthStore((s) => s.loading)

  // Session restore on a hard refresh takes a moment — returning null here rendered a fully blank
  // white page for that beat, which reads as "the app is broken" rather than "it's loading".
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="animate-pulse font-display text-2xl tracking-tight text-ink-faint">Astra</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/auth" replace />
  }

  if (!selfBirthProfile) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
