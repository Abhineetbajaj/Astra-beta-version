import { Link, Outlet } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function PremiumGate() {
  const isPremium = useAuthStore((s) => s.isPremium)

  if (isPremium) return <Outlet />

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Card>
        <Lock className="mx-auto size-6 text-accent" strokeWidth={1.5} />
        <h1 className="mt-4 font-display text-2xl">Premium feature</h1>
        <p className="mt-2 text-ink-muted">
          Financial and medical astrology readings are part of Astra Premium.
        </p>
        <Link to="/pricing">
          <Button variant="accent" size="lg" className="mt-6 w-full">
            See Premium →
          </Button>
        </Link>
      </Card>
    </div>
  )
}
