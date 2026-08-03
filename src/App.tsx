import { useEffect } from 'react'
import AppRouter from '@/router'
import { useThemeStore } from '@/store/themeStore'
import { useAuthStore } from '@/store/authStore'
import { isBackendConfigured } from '@/lib/supabaseClient'
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

  if (!isBackendConfigured) return <BackendNotConfigured />

  return <AppRouter />
}
