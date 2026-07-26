import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useAuthStore } from '@/store/authStore'
import { buildBirthData } from '@/lib/buildBirthData'
import PlaceOfBirthField, { type PlaceOfBirthValue } from '@/components/forms/PlaceOfBirthField'
import BirthDateTimeFields from '@/components/forms/BirthDateTimeFields'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)

  const [name, setName] = useState(user?.displayName ?? '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('12:00')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [place, setPlace] = useState<PlaceOfBirthValue | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) return setError('Enter your name.')
    if (!date) return setError('Enter your date of birth.')
    if (!place) return setError('Enter your birth place — search above, or switch to manual coordinates.')

    setSubmitting(true)
    try {
      const birthData = buildBirthData({
        name,
        date,
        time,
        timeAccuracy: timeUnknown ? 'unknown' : 'exact',
        placeLabel: place.label,
        lat: place.lat,
        lon: place.lon,
      })
      updateProfile({ displayName: name, birthData })
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Couldn’t resolve a timezone for that location — double check the coordinates.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line px-6 py-5">
        <span className="font-display text-xl">Astra</span>
      </header>

      <div className="mx-auto max-w-xl px-6 py-14">
        <h1 className="font-display text-3xl">Let's build your chart.</h1>
        <p className="mt-2 text-ink-muted">
          A minute of detail now gets you a real, correctly-calculated Vedic chart — not a
          template.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-8">
          <Card>
            <h2 className="font-display text-lg">Your name</h2>
            <Input
              className="mt-3"
              placeholder="First name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Card>

          <Card>
            <h2 className="font-display text-lg">Date & time of birth</h2>
            <div className="mt-3">
              <BirthDateTimeFields
                date={date}
                onDateChange={setDate}
                time={time}
                onTimeChange={setTime}
                timeUnknown={timeUnknown}
                onTimeUnknownChange={setTimeUnknown}
                unknownLabel="I don't know my exact birth time"
              />
            </div>
          </Card>

          <Card>
            <PlaceOfBirthField value={place} onChange={setPlace} />
            <p className="mt-3 text-xs text-ink-faint">
              Use your <em>birth</em> location for the most accurate chart.
            </p>
          </Card>

          {error && <p className="text-sm text-negative">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Calculating your chart…' : 'Calculate my chart'}
          </Button>
        </form>
      </div>
    </div>
  )
}
