import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function AuthGate() {
  const user = useAuthStore((s) => s.user)

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  if (!user.birthData) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
