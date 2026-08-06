import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import { callEdgeFunction } from '@/lib/edgeFunctions'
import { resolveTimeZone, resolveHistoricalOffsetMinutes } from '@/services/timezoneService'
import PlaceOfBirthField, { type PlaceOfBirthValue } from '@/components/forms/PlaceOfBirthField'
import BirthDateTimeFields from '@/components/forms/BirthDateTimeFields'

export default function ProfilePage() {
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)
  const selfBirthProfile = useAuthStore((s) => s.selfBirthProfile)
  const refreshUserData = useAuthStore((s) => s.refreshUserData)

  const [name, setName] = useState(profile?.display_name ?? '')
  const [date, setDate] = useState(selfBirthProfile?.date_of_birth ?? '')
  const [time, setTime] = useState(selfBirthProfile?.time_of_birth?.slice(0, 5) ?? '12:00')
  const [timeUnknown, setTimeUnknown] = useState(!selfBirthProfile?.time_known)
  const [place, setPlace] = useState<PlaceOfBirthValue | null>(
    selfBirthProfile ? { label: selfBirthProfile.place_name, lat: selfBirthProfile.lat, lon: selfBirthProfile.lon } : null,
  )

  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savingDigestOptIn, setSavingDigestOptIn] = useState(false)

  if (!session || !profile) return null

  async function handleDigestOptInChange(checked: boolean) {
    setSavingDigestOptIn(true)
    try {
      await supabase.from('profiles').update({ daily_digest_opt_in: checked }).eq('id', session!.user.id)
      await refreshUserData()
    } finally {
      setSavingDigestOptIn(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    if (!name.trim()) return setError('Enter your name.')
    if (!date) return setError('Enter your date of birth.')
    if (!place) return setError('Enter your birth place — search above, or switch to manual coordinates.')
    if (!selfBirthProfile) return setError('Missing birth profile — try onboarding again.')

    setSubmitting(true)
    try {
      const tzName = resolveTimeZone(place.lat, place.lon)
      const effectiveTime = timeUnknown ? '12:00' : time
      const utcOffsetMinutes = resolveHistoricalOffsetMinutes(tzName, date, effectiveTime)

      await supabase.from('profiles').update({ display_name: name }).eq('id', session!.user.id)

      const { error: updateError } = await supabase
        .from('birth_profiles')
        .update({
          name,
          date_of_birth: date,
          time_of_birth: timeUnknown ? null : time,
          time_known: !timeUnknown,
          place_name: place.label,
          lat: place.lat,
          lon: place.lon,
          utc_offset_minutes: utcOffsetMinutes,
        })
        .eq('id', selfBirthProfile.id)
      if (updateError) throw new Error(updateError.message)

      await callEdgeFunction('compute-chart', { subjectType: 'birth_profile', subjectId: selfBirthProfile.id })
      await refreshUserData()
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't resolve a timezone for that location — double check the coordinates.")
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
            <Input value={profile.email} disabled />
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

        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg">Daily email digest</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Get today's reading — grounded in real current planetary transits — in your inbox each morning.
              </p>
            </div>
            <Switch
              checked={profile.daily_digest_opt_in}
              onCheckedChange={handleDigestOptInChange}
              className={savingDigestOptIn ? 'opacity-60' : undefined}
            />
          </div>
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
