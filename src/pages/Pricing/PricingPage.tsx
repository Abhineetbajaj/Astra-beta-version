import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

const FEATURES = [
  'Full personalized daily reading',
  'Weekly deep-dive & transit forecast',
  'Compatibility reports with anyone',
  'Reading history & saved insights',
  'Cancel anytime',
]

export default function PricingPage() {
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const navigate = useNavigate()
  const [justUpgraded, setJustUpgraded] = useState(false)

  function startPremium() {
    if (!user) {
      navigate('/auth')
      return
    }
    updateProfile({ isPremium: true })
    setJustUpgraded(true)
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="font-display text-xl">Astra</span>
          <Link
            to={user ? '/dashboard' : '/'}
            className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} />
            Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <Badge variant="accent">Astra Premium</Badge>
        <h1 className="mt-4 font-display text-4xl">Go deeper with the stars.</h1>
        <p className="mt-2 text-ink-muted">One simple plan. Everything unlocked. Cancel any time.</p>

        <Card className="mt-8 text-left">
          <p className="font-display text-4xl">
            ₹749 <span className="text-lg font-normal text-ink-muted">/ month</span>
          </p>
          <p className="mt-1 text-sm text-ink-faint">Billed monthly. This prototype does not charge anything real.</p>

          <ul className="mt-6 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm">
                <Check className="size-4 shrink-0 text-accent" strokeWidth={2} />
                {f}
              </li>
            ))}
          </ul>

          {justUpgraded || user?.isPremium ? (
            <div className="mt-6 rounded-xl bg-accent-soft px-4 py-3 text-center text-sm text-accent-strong">
              You're on Premium. Enjoy the deeper reads.
            </div>
          ) : (
            <Button variant="accent" size="lg" className="mt-6 w-full" onClick={startPremium}>
              {user ? 'Start Premium' : 'Sign in to start Premium'}
            </Button>
          )}
          <p className="mt-3 text-center text-xs text-ink-faint">
            Simulated checkout — no payment provider is involved in this prototype.
          </p>
        </Card>
      </div>
    </div>
  )
}
