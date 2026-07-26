import { Sun, Moon, Monitor } from 'lucide-react'
import { useThemeStore, type ThemePreference } from '@/store/themeStore'
import { cn } from '@/lib/cn'

const OPTIONS: { value: ThemePreference; Icon: typeof Sun; label: string }[] = [
  { value: 'light', Icon: Sun, label: 'Light' },
  { value: 'system', Icon: Monitor, label: 'System' },
  { value: 'dark', Icon: Moon, label: 'Dark' },
]

export default function ThemeToggle() {
  const preference = useThemeStore((s) => s.preference)
  const setPreference = useThemeStore((s) => s.setPreference)

  return (
    <div className="flex items-center rounded-full border border-line p-0.5">
      {OPTIONS.map(({ value, Icon, label }) => (
        <button
          key={value}
          type="button"
          aria-label={`${label} theme`}
          onClick={() => setPreference(value)}
          className={cn(
            'flex size-7 items-center justify-center rounded-full transition-colors',
            preference === value ? 'bg-paper-raised text-ink' : 'text-ink-faint hover:text-ink-muted',
          )}
        >
          <Icon className="size-3.5" strokeWidth={1.75} />
        </button>
      ))}
    </div>
  )
}
