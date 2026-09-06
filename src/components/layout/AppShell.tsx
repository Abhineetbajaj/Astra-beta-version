import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Compass,
  Heart,
  MessageCircle,
  Users,
  Clock,
  Sparkles,
  Wallet,
  LogOut,
  TrendingUp,
  Star,
  Flame,
  Hash,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/Badge'
import ThemeToggle from '@/components/ui/ThemeToggle'
import CosmicBackdrop from '@/components/layout/CosmicBackdrop'
import { cn } from '@/lib/cn'

const navItems = [
  { to: '/dashboard', label: 'Today', icon: Sparkles, end: true },
  { to: '/chart', label: 'Chart', icon: Compass },
  { to: '/compatibility', label: 'Compatibility', icon: Heart },
  { to: '/chat', label: 'Ask Astra', icon: MessageCircle },
  { to: '/horoscope', label: 'Horoscope', icon: Star },
  { to: '/wellness', label: 'Spiritual Wellness', icon: Flame },
  { to: '/numerology', label: 'Numerology', icon: Hash },
  { to: '/financial', label: 'Financial', icon: TrendingUp },
  { to: '/astrologers', label: 'Astrologers', icon: Users },
  { to: '/history', label: 'History', icon: Clock },
]

// Shared focus-ring treatment for the right-side icon/text controls — Button.tsx already
// establishes this exact ring; the nav's own controls weren't using it at all before this pass.
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-full'

const PAGE_EASE = [0.16, 1, 0.3, 1] as const

/** The active pill's background — a single shared layoutId animates it between whichever nav
    item is currently active, so switching pages slides the highlight rather than popping it. */
function ActivePill({ layoutId }: { layoutId: string }) {
  return (
    <motion.span
      layoutId={layoutId}
      className="absolute inset-0 -z-10 rounded-full bg-paper-raised ring-1 ring-accent/25 shadow-[0_0_22px_-8px_color-mix(in_srgb,var(--color-accent)_55%,transparent)]"
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
    />
  )
}

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
      <CosmicBackdrop />
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        {/* Wider than <main>'s max-w-6xl deliberately — that width is tuned for readable prose,
            but a 10-item nav plus logo and controls measures ~1708px at minimum before crowding.
            Capped (not full-bleed) so it doesn't sprawl absurdly on ultrawide monitors. */}
        <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between gap-4 px-6">
          <NavLink to="/dashboard" className={cn('flex items-center gap-1.5 shrink-0', FOCUS_RING)}>
            <Sparkles className="size-4 text-accent" strokeWidth={1.75} />
            <span className="font-display text-xl tracking-tight">Astra</span>
          </NavLink>

          <nav className="hidden min-w-0 items-center gap-0.5 lg:flex min-[1728px]:gap-1">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={label}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium min-[1728px]:px-3.5',
                    'transition-colors duration-200 ease-out',
                    isActive ? 'text-ink' : 'text-ink-muted hover:text-ink',
                    FOCUS_RING,
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <ActivePill layoutId="desktop-nav-pill" />}
                    <Icon
                      className={cn(
                        'size-4 shrink-0 transition-transform duration-200 ease-out group-hover:-translate-y-px group-hover:scale-110',
                        isActive && 'text-accent',
                      )}
                      strokeWidth={1.75}
                    />
                    {/* Measured directly, not guessed: all 10 full labels need ~1708px of header
                        width alongside the logo and right-side controls. Below that, icons alone
                        carry the row (with a title tooltip) rather than crowding or wrapping. */}
                    <span className="hidden min-[1728px]:inline">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <ThemeToggle />
            <div className="h-5 w-px bg-line" aria-hidden="true" />
            <NavLink to="/wallet" className={FOCUS_RING} aria-label={isPremium ? 'Wallet — Premium plan' : 'Wallet — Free plan'}>
              <Badge variant="outline" className="cursor-pointer transition-colors hover:border-accent/40 hover:text-ink">
                <Wallet className="size-3.5" strokeWidth={1.75} />
                {isPremium ? 'Premium' : 'Free'}
              </Badge>
            </NavLink>
            <NavLink
              to="/profile"
              aria-label="Profile"
              className={({ isActive }) =>
                cn(
                  'flex size-8 items-center justify-center rounded-full border text-xs font-medium uppercase transition-colors',
                  isActive
                    ? 'border-accent bg-accent-soft text-accent-strong'
                    : 'border-line-strong text-ink-muted hover:border-line-strong hover:text-ink',
                  FOCUS_RING,
                )
              }
            >
              {profile?.display_name?.[0] ?? '?'}
            </NavLink>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className={cn(
                'flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper-raised hover:text-ink sm:size-auto sm:gap-1.5 sm:px-2.5 sm:text-sm',
                FOCUS_RING,
              )}
            >
              <LogOut className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        <div className="relative border-t border-line lg:hidden">
          <nav className="flex items-center gap-0.5 overflow-x-auto px-4 py-2">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-colors',
                    isActive ? 'text-ink' : 'text-ink-muted',
                    FOCUS_RING,
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <ActivePill layoutId="mobile-nav-pill" />}
                    <Icon className={cn('size-3.5 shrink-0', isActive && 'text-accent')} strokeWidth={1.75} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-paper to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-paper to-transparent" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: PAGE_EASE }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
