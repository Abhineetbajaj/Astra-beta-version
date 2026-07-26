import { useEffect } from 'react'
import AppRouter from '@/router'
import { useThemeStore } from '@/store/themeStore'

export default function App() {
  const preference = useThemeStore((s) => s.preference)

  useEffect(() => {
    if (preference === 'system') {
      delete document.documentElement.dataset.theme
    } else {
      document.documentElement.dataset.theme = preference
    }
  }, [preference])

  return <AppRouter />
}
