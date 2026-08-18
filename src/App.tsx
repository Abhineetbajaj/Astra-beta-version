import { useEffect } from 'react'
import AppRouter from '@/router'
import { useThemeStore } from '@/store/themeStore'
import { useAuthStore } from '@/store/authStore'
import { isBackendConfigured } from '@/lib/supabaseClient'
import { registerServiceWorker } from '@/lib/push'
import BackendNotConfigured from '@/components/layout/BackendNotConfigured'

export default function App() {
  const preference = useThemeStore((s) => s.preference)
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    if (preference === 'system') {
      delete document.documentElement.dataset.theme
    } else {
      document.documentElement.dataset.theme = preference
    }
  }, [preference])

  useEffect(() => {
    if (isBackendConfigured) init()
  }, [init])

  // Registering early (not gated on notification permission) means the service worker is ready
  // the moment a user opts in later — no extra round trip at that point.
  useEffect(() => {
    registerServiceWorker()
  }, [])

  if (!isBackendConfigured) return <BackendNotConfigured />

  return <AppRouter />
}
