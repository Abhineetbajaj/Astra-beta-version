// Spirit pillar — new. Mantras, stotras, and festival devotional text, all free (this content is
// static/public-domain, costs nothing to serve, and "keep it free" is the whole point). Text-only
// v1 by deliberate choice — see devotionalTexts.ts's header comment for why.
import { useMemo, useState } from 'react'
import { Flame, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useNatalChart } from '@/lib/useNatalChart'
import { currentDashaLords } from '@/astro-engine'
import { detectPanchangEvents } from '@/astro-engine/panchangEvents'
import {
  DEVOTIONAL_TEXTS,
  devotionalTextForPlanet,
  devotionalTextsForOccasion,
  type DevotionalOccasion,
  type DevotionalText,
} from '@/data/devotionalTexts'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

const OCCASION_FILTERS: { key: DevotionalOccasion | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'daily', label: 'Daily' },
  { key: 'navratri', label: 'Navratri' },
  { key: 'diwali', label: 'Diwali' },
  { key: 'shivratri', label: 'Shivratri' },
  { key: 'ganesh-chaturthi', label: 'Ganesh Chaturthi' },
]

function DevotionalCard({ text }: { text: DevotionalText }) {
  const [open, setOpen] = useState(false)
  return (
    <Card className="cursor-pointer" onClick={() => setOpen((o) => !o)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base">{text.title}</h3>
          <p className="text-xs text-ink-faint">{text.deity}</p>
        </div>
        <div className="flex items-center gap-2">
          {!text.isComplete && <Badge variant="outline">Excerpt</Badge>}
          <ChevronDown className={cn('size-4 text-ink-faint transition-transform', open && 'rotate-180')} strokeWidth={1.75} />
        </div>
      </div>
      {open && (
        <div className="mt-4 space-y-3 border-t border-spirit/20 pt-4">
          {text.verses.map((v, i) => (
            <div key={i}>
              <p className="font-display text-sm italic text-ink">{v.transliteration}</p>
              <p className="mt-1 text-sm text-ink-muted">{v.meaning}</p>
            </div>
          ))}
          <p className="text-xs text-ink-faint">
            <span className="font-medium text-ink-muted">When to use: </span>
            {text.whenToUse}
          </p>
        </div>
      )}
    </Card>
  )
}

export default function SpiritPillar() {
  const selfBirthProfile = useAuthStore((s) => s.selfBirthProfile)
  const { chart } = useNatalChart('birth_profile', selfBirthProfile?.id)
  const [filter, setFilter] = useState<DevotionalOccasion | 'all'>('all')

  const prescribed = useMemo(() => {
    if (!chart) return null
    const active = currentDashaLords(chart.dashas, new Date())
    if (!active?.maha) return null
    return devotionalTextForPlanet(active.maha)
  }, [chart])

  // Only Navratri has a real detector today (see panchangEvents.ts) — never claim Diwali/
  // Shivratri/Ganesh Chaturthi auto-detection until this engine actually computes those dates.
  const upcomingNavratri = useMemo(() => detectPanchangEvents(new Date(), 21).some((e) => e.event === 'Navratri'), [])

  const visible = filter === 'all' ? DEVOTIONAL_TEXTS : devotionalTextsForOccasion(filter)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-spirit-soft px-5 py-4">
        <div className="flex items-center gap-2 text-spirit-strong">
          <Flame className="size-5" strokeWidth={1.75} />
          <span className="text-xs font-semibold uppercase tracking-wide">Spirit</span>
        </div>
        <p className="mt-1.5 text-sm text-ink-muted">
          Mantras and stotras, chosen by what's active in your chart — text-only for now, exact and never AI-written.
        </p>
      </div>

      {prescribed && (
        <Card className="border-spirit/30 bg-spirit-soft/40">
          <p className="text-xs font-medium uppercase tracking-wide text-spirit-strong">Prescribed for you</p>
          <p className="mt-1 text-sm text-ink-muted">
            Your current Mahadasha is ruled by {prescribed.planetContext} — traditionally paired with:
          </p>
          <div className="mt-3">
            <DevotionalCard text={prescribed} />
          </div>
        </Card>
      )}

      {upcomingNavratri && (
        <Card className="border-spirit/30">
          <p className="text-xs font-medium uppercase tracking-wide text-spirit-strong">Coming up: Navratri</p>
          <p className="mt-1 text-sm text-ink-muted">Nine nights of the Devi — here's where to start.</p>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {OCCASION_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              filter === f.key ? 'bg-spirit text-spirit-ink' : 'border border-line text-ink-muted hover:border-spirit/40',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((text) => (
          <DevotionalCard key={text.key} text={text} />
        ))}
      </div>
    </div>
  )
}
