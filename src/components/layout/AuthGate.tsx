import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function AuthGate() {
  const session = useAuthStore((s) => s.session)
  const selfBirthProfile = useAuthStore((s) => s.selfBirthProfile)
  const loading = useAuthStore((s) => s.loading)

  if (loading) return null

  if (!session) {
    return <Navigate to="/auth" replace />
  }

  if (!selfBirthProfile) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
