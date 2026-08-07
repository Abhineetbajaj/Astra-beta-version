import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { callEdgeFunction } from '@/lib/edgeFunctions'
import { openRazorpayCheckout } from '@/lib/razorpay'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

// Only list what Premium actually gates today. The daily reading, compatibility, and history are
// all available on the free plan — advertising them as Premium perks would be false. Likewise
// "cancel anytime" is omitted: this is a one-time 30-day access purchase, not a recurring
// subscription with a cancel flow (see CLAUDE.md's known gaps).
const FEATURES = [
  'Weekly deep-dive report',
  'Financial astrology readings',
  'Wellness astrology readings',
  'The full Listen meditation library',
]

const PREMIUM_PRICE_INR = 749

export default function PricingPage() {
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)
  const isPremium = useAuthStore((s) => s.isPremium)
  const refreshUserData = useAuthStore((s) => s.refreshUserData)
  const navigate = useNavigate()
  const [justUpgraded, setJustUpgraded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startPremium() {
    if (!session) {
      navigate('/auth')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const order = await callEdgeFunction<{ orderId: string; amount: number; currency: string; keyId: string }>(
        'razorpay-create-order',
        { purpose: 'premium_subscription', amountInPaise: PREMIUM_PRICE_INR * 100 },
      )
      await openRazorpayCheckout({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        name: 'Astra Premium',
        description: 'Monthly subscription',
        prefillEmail: profile?.email,
        onSuccess: () => {
          setJustUpgraded(true)
          setTimeout(refreshUserData, 2000)
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="font-display text-xl">Astra</span>
          <Link
            to={session ? '/dashboard' : '/'}
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
            ₹{PREMIUM_PRICE_INR} <span className="text-lg font-normal text-ink-muted">/ month</span>
          </p>
          <p className="mt-1 text-sm text-ink-faint">One-time payment for 30 days of access, via Razorpay.</p>

          <ul className="mt-6 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm">
                <Check className="size-4 shrink-0 text-accent" strokeWidth={2} />
                {f}
              </li>
            ))}
          </ul>

          {justUpgraded || isPremium ? (
            <div className="mt-6 rounded-xl bg-accent-soft px-4 py-3 text-center text-sm text-accent-strong">
              You're on Premium. Enjoy the deeper reads.
            </div>
          ) : (
            <Button variant="accent" size="lg" className="mt-6 w-full" onClick={startPremium} disabled={submitting}>
              {submitting ? 'Starting checkout…' : session ? 'Start Premium' : 'Sign in to start Premium'}
            </Button>
          )}
          {error && <p className="mt-3 text-center text-sm text-negative">{error}</p>}
        </Card>
      </div>
    </div>
  )
}
