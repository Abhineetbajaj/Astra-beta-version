import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Heart } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useChartStore, chartFromBirthData } from '@/store/chartStore'
import { buildBirthData } from '@/lib/buildBirthData'
import { generateCompatibilityReading } from '@/mocks/compatibilityGenerator'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import PlaceOfBirthField, { type PlaceOfBirthValue } from '@/components/forms/PlaceOfBirthField'
import BirthDateTimeFields from '@/components/forms/BirthDateTimeFields'
import type { NatalChart } from '@/astro-engine/types'

export default function CompatibilityPage() {
  const user = useAuthStore((s) => s.user)
  const ensureChart = useChartStore((s) => s.ensureChart)
  const myChart = useMemo(
    () => (user?.birthData ? ensureChart(user.birthData) : null),
    [user, ensureChart],
  )

  const [partnerName, setPartnerName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('12:00')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [place, setPlace] = useState<PlaceOfBirthValue | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [partnerChart, setPartnerChart] = useState<NatalChart | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!partnerName.trim()) return setError("Enter your partner's name.")
    if (!date) return setError('Enter their date of birth.')
    if (!place) return setError('Enter their place of birth.')

    try {
      const birthData = buildBirthData({
        name: partnerName,
        date,
        time,
        timeAccuracy: timeUnknown ? 'unknown' : 'exact',
        placeLabel: place.label,
        lat: place.lat,
        lon: place.lon,
      })
      setPartnerChart(chartFromBirthData(birthData))
    } catch {
      setError('Couldn’t resolve a timezone for that location — double check the coordinates.')
    }
  }

  if (!myChart) return null

  const reading = partnerChart ? generateCompatibilityReading(myChart, partnerChart) : null

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div className="text-center">
        <Heart className="mx-auto size-6 text-accent" strokeWidth={1.5} />
        <h1 className="mt-3 font-display text-4xl">
          Compatibility <span className="italic text-accent">read</span>
        </h1>
        <p className="mt-2 text-ink-muted">
          Real synastry from both birth charts — Moon-sign and nakshatra based.
        </p>
      </div>

      <Card>
        <h2 className="font-display text-lg">Their birth details</h2>
        <p className="text-sm text-ink-muted">Your own details are pulled from your profile.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <Input
            placeholder="Partner's first name"
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
          />

          <BirthDateTimeFields
            date={date}
            onDateChange={setDate}
            time={time}
            onTimeChange={setTime}
            timeUnknown={timeUnknown}
            onTimeUnknownChange={setTimeUnknown}
            unknownLabel="I don't know their exact birth time"
          />

          <PlaceOfBirthField value={place} onChange={setPlace} />

          {error && <p className="text-sm text-negative">{error}</p>}

          <Button type="submit" variant="accent" size="lg" className="w-full">
            Compute compatibility →
          </Button>
        </form>
      </Card>

      {reading && partnerChart && (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">
              {user?.displayName} & {partnerName}
            </h2>
            <div className="nums-tabular text-right">
              <p className="font-display text-3xl text-accent">{reading.breakdown.total}</p>
              <p className="text-xs text-ink-faint">of {reading.breakdown.max}</p>
            </div>
          </div>

          <p className="mt-4 text-ink">{reading.opening}</p>

          <div className="mt-6 space-y-4 border-t border-line pt-5">
            <ScoreRow
              label="Bhakoot (emotional pacing)"
              points={reading.breakdown.bhakoot.points}
              max={reading.breakdown.bhakoot.max}
              note={reading.bhakootNote}
            />
            <ScoreRow
              label="Gana (temperament)"
              points={reading.breakdown.gana.points}
              max={reading.breakdown.gana.max}
              note={reading.ganaNote}
            />
            <ScoreRow
              label="Nadi (vitality)"
              points={reading.breakdown.nadi.points}
              max={reading.breakdown.nadi.max}
              note={reading.nadiNote}
            />
          </div>

          <p className="mt-6 text-sm italic text-ink-muted">{reading.closing}</p>
          <p className="mt-4 text-xs text-ink-faint">
            Simplified Ashtakoot-style score (3 of the classical 8 kutas) — not the full
            36-point traditional system.
          </p>
        </Card>
      )}
    </div>
  )
}

function ScoreRow({
  label,
  points,
  max,
  note,
}: {
  label: string
  points: number
  max: number
  note: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="nums-tabular text-ink-muted">
          {points}/{max}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-paper-sunken">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${(points / max) * 100}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-ink-muted">{note}</p>
    </div>
  )
}
