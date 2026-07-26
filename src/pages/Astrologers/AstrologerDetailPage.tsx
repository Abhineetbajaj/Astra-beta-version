import { useNavigate, useParams, Link } from 'react-router-dom'
import { Star, ArrowLeft } from 'lucide-react'
import { ASTROLOGER_PERSONAS } from '@/data/astrologerPersonas'
import { useWalletStore } from '@/store/walletStore'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export default function AstrologerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const credits = useWalletStore((s) => s.credits)
  const astrologer = ASTROLOGER_PERSONAS.find((a) => a.id === id)

  if (!astrologer) {
    return (
      <div>
        <p>Astrologer not found.</p>
        <Link to="/astrologers" className="text-accent hover:underline">
          Back to astrologers
        </Link>
      </div>
    )
  }

  const canAfford = credits >= astrologer.ratePerMin

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/astrologers"
        className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} />
        Astrologers
      </Link>

      <Card className="mt-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl">{astrologer.name}</h1>
            <div className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted">
              <Star className="size-3.5 fill-accent text-accent" />
              {astrologer.rating} · {astrologer.reviews} reviews
              {astrologer.online && <span className="ml-1 size-1.5 rounded-full bg-positive" />}
              {astrologer.online ? ' Online' : ' Offline'}
            </div>
          </div>
          <div className="nums-tabular text-right">
            <p className="text-2xl font-medium text-accent">{astrologer.ratePerMin}</p>
            <p className="text-xs text-ink-faint">credits/min</p>
          </div>
        </div>

        <p className="mt-4 text-ink-muted">{astrologer.bio}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {astrologer.tags.map((t) => (
            <Badge key={t} variant="neutral">
              {t}
            </Badge>
          ))}
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Your balance</span>
            <span className="nums-tabular">{credits} credits</span>
          </div>

          {!canAfford && (
            <p className="mt-2 text-sm text-negative">
              You need at least {astrologer.ratePerMin} credits for one minute.{' '}
              <Link to="/wallet" className="underline">
                Top up your wallet
              </Link>
              .
            </p>
          )}

          <Button
            variant="accent"
            size="lg"
            className="mt-4 w-full"
            disabled={!canAfford}
            onClick={() => navigate(`/consultations/${astrologer.id}`)}
          >
            Start chat
          </Button>
        </div>
      </Card>
    </div>
  )
}
