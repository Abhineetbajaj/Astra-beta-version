import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function OnboardingGate() {
  const user = useAuthStore((s) => s.user)

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  if (user.birthData) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
