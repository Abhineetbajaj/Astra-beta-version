import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useAuthStore } from '@/store/authStore'
import { buildBirthData } from '@/lib/buildBirthData'
import PlaceOfBirthField, { type PlaceOfBirthValue } from '@/components/forms/PlaceOfBirthField'
import BirthDateTimeFields from '@/components/forms/BirthDateTimeFields'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const birthData = user?.birthData ?? null

  const [name, setName] = useState(user?.displayName ?? '')
  const [date, setDate] = useState(birthData?.date ?? '')
  const [time, setTime] = useState(birthData?.time ?? '12:00')
  const [timeUnknown, setTimeUnknown] = useState(birthData?.timeAccuracy === 'unknown')
  const [place, setPlace] = useState<PlaceOfBirthValue | null>(
    birthData ? { label: birthData.placeLabel, lat: birthData.lat, lon: birthData.lon } : null,
  )

  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!user) return null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    if (!name.trim()) return setError('Enter your name.')
    if (!date) return setError('Enter your date of birth.')
    if (!place) return setError('Enter your birth place — search above, or switch to manual coordinates.')

    setSubmitting(true)
    try {
      const newBirthData = buildBirthData({
        name,
        date,
        time,
        timeAccuracy: timeUnknown ? 'unknown' : 'exact',
        placeLabel: place.label,
        lat: place.lat,
        lon: place.lon,
      })
      updateProfile({ displayName: name, birthData: newBirthData })
      setSaved(true)
    } catch {
      setError('Couldn’t resolve a timezone for that location — double check the coordinates.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-xs uppercase tracking-wide text-ink-faint">Profile</p>
      <h1 className="mt-1 font-display text-4xl">Your details</h1>
      <p className="mt-2 text-ink-muted">
        Fix a wrong birth date, time, or place — your chart, readings, and dasha timeline
        recompute immediately from the corrected data.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Card>
          <h2 className="font-display text-lg">Account</h2>
          <div className="mt-3 space-y-3">
            <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input value={user.email} disabled />
          </div>
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
            />
          </div>
        </Card>

        <Card>
          <PlaceOfBirthField value={place} onChange={setPlace} />
        </Card>

        {error && <p className="text-sm text-negative">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-positive">
              <Check className="size-4" strokeWidth={2} />
              Saved — your chart has been recomputed.
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
