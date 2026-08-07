import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Compass, Heart, MessageCircle, Users, Clock, Sparkles, Wallet, LogOut, TrendingUp, HeartPulse, Star, Headphones } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/Badge'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/cn'

const navItems = [
  { to: '/dashboard', label: 'Today', icon: Sparkles, end: true },
  { to: '/chart', label: 'Chart', icon: Compass },
  { to: '/compatibility', label: 'Compatibility', icon: Heart },
  { to: '/chat', label: 'Ask Astra', icon: MessageCircle },
  { to: '/horoscope', label: 'Horoscope', icon: Star },
  { to: '/listen', label: 'Listen', icon: Headphones },
  { to: '/financial', label: 'Financial', icon: TrendingUp },
  { to: '/medical', label: 'Wellness', icon: HeartPulse },
  { to: '/astrologers', label: 'Astrologers', icon: Users },
  { to: '/history', label: 'History', icon: Clock },
]

export default function AppShell() {
  const profile = useAuthStore((s) => s.profile)
  const isPremium = useAuthStore((s) => s.isPremium)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <NavLink to="/dashboard" className="font-display text-xl tracking-tight">
            Astra
          </NavLink>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-paper-raised text-ink'
                      : 'text-ink-muted hover:text-ink hover:bg-paper-raised',
                  )
                }
              >
                <Icon className="size-4" strokeWidth={1.75} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NavLink to="/wallet">
              <Badge variant="outline" className="cursor-pointer hover:border-ink-faint">
                <Wallet className="size-3.5" strokeWidth={1.75} />
                {isPremium ? 'Premium' : 'Free'}
              </Badge>
            </NavLink>
            <NavLink
              to="/profile"
              title="Profile"
              className={({ isActive }) =>
                cn(
                  'flex size-8 items-center justify-center rounded-full border text-xs font-medium uppercase',
                  isActive
                    ? 'border-accent bg-accent-soft text-accent-strong'
                    : 'border-line-strong text-ink-muted hover:text-ink',
                )
              }
            >
              {profile?.display_name?.[0] ?? '?'}
            </NavLink>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
            >
              <LogOut className="size-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        <div className="relative border-t border-line md:hidden">
          <nav className="flex items-center gap-1 overflow-x-auto px-4 py-2">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
                    isActive ? 'bg-paper-raised text-ink' : 'text-ink-muted',
                  )
                }
              >
                <Icon className="size-3.5" strokeWidth={1.75} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-paper to-transparent" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
