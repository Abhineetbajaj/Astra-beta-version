import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import { callEdgeFunction } from '@/lib/edgeFunctions'
import { resolveTimeZone, resolveHistoricalOffsetMinutes } from '@/services/timezoneService'
import PlaceOfBirthField, { type PlaceOfBirthValue } from '@/components/forms/PlaceOfBirthField'
import BirthDateTimeFields from '@/components/forms/BirthDateTimeFields'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)
  const refreshUserData = useAuthStore((s) => s.refreshUserData)

  const [name, setName] = useState(profile?.display_name ?? '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('12:00')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [place, setPlace] = useState<PlaceOfBirthValue | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Set once the birth_profiles row is saved. If chart computation then fails, a retry must reuse
  // this id and skip straight to compute-chart — re-inserting would hit the "one self profile per
  // user" unique constraint and produce a confusing new error instead of actually retrying.
  const [savedProfileId, setSavedProfileId] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!session) return setError('Your session expired — sign in again.')
    if (!name.trim()) return setError('Enter your name.')
    if (!date) return setError('Enter your date of birth.')
    if (!place) return setError('Enter your birth place — search above, or switch to manual coordinates.')

    setSubmitting(true)
    try {
      let profileId = savedProfileId

      if (!profileId) {
        const tzName = resolveTimeZone(place.lat, place.lon)
        const effectiveTime = timeUnknown ? '12:00' : time
        const utcOffsetMinutes = resolveHistoricalOffsetMinutes(tzName, date, effectiveTime)

        const { data: birthProfile, error: insertError } = await supabase
          .from('birth_profiles')
          .insert({
            user_id: session.user.id,
            relation: 'self',
            name,
            date_of_birth: date,
            time_of_birth: timeUnknown ? null : time,
            time_known: !timeUnknown,
            place_name: place.label,
            lat: place.lat,
            lon: place.lon,
            utc_offset_minutes: utcOffsetMinutes,
          })
          .select()
          .single()
        if (insertError || !birthProfile) throw new Error(insertError?.message ?? 'Could not save birth profile.')
        profileId = birthProfile.id
        setSavedProfileId(profileId)
      }

      // The birth profile is saved at this point no matter what happens below — only the chart
      // computation can still fail and be retried.
      await callEdgeFunction('compute-chart', { subjectType: 'birth_profile', subjectId: profileId })
      await supabase.from('profiles').update({ display_name: name }).eq('id', session.user.id)
      await refreshUserData()

      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't resolve a timezone for that location — double check the coordinates.",
      )
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

          {error && (
            <div className="rounded-xl border border-negative/30 bg-negative/5 px-4 py-3">
              <p className="text-sm text-negative">{error}</p>
              {savedProfileId && (
                <p className="mt-1 text-xs text-ink-faint">
                  Your details are saved — retrying will only recompute the chart, not resubmit the form.
                </p>
              )}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting
              ? 'Calculating your chart…'
              : error && savedProfileId
                ? 'Retry chart calculation'
                : 'Calculate my chart'}
          </Button>
        </form>
      </div>
    </div>
  )
}
