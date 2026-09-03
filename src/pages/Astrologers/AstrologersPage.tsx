import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { ASTROLOGER_PERSONAS } from '@/data/astrologerPersonas'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'

const PREVIEW_NOTICE =
  'Preview only — these are sample profiles, not real astrologers, and replies are simulated. Real ' +
  'human consultations are not part of this build yet. Everything else in Astra (your chart, ' +
  'readings, transits) is computed for real.'

export default function AstrologersPage() {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ink-faint">Astrologer marketplace</p>
      <h1 className="mt-1 font-display text-4xl">Talk to a person</h1>
      <p className="mt-2 max-w-xl text-ink-muted">
        A preview of one-on-one consultations, billed per minute from your wallet.
      </p>

      <DisclaimerBanner text={PREVIEW_NOTICE} className="mt-6" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {ASTROLOGER_PERSONAS.map((a) => (
          <Link key={a.id} to={`/astrologers/${a.id}`}>
            <Card interactive className="h-full">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-lg">{a.name}</h2>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
                    <Star className="size-3.5 fill-accent text-accent" />
                    {a.rating} · {a.reviews} reviews
                  </div>
                  <p className="mt-0.5 text-xs text-ink-faint">Sample profile</p>
                </div>
                <div className="nums-tabular text-right">
                  <p className="text-lg font-medium text-accent">{a.ratePerMin}</p>
                  <p className="text-xs text-ink-faint">credits/min</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink-muted">{a.bio}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {a.tags.map((t) => (
                  <Badge key={t} variant="neutral">
                    {t}
                  </Badge>
                ))}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
