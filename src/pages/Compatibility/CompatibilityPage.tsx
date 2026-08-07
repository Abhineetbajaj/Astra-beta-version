import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import { callEdgeFunction } from '@/lib/edgeFunctions'
import { resolveTimeZone, resolveHistoricalOffsetMinutes } from '@/services/timezoneService'
import { highlightGlossaryTerms } from '@/lib/highlightGlossaryTerms'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import PlaceOfBirthField, { type PlaceOfBirthValue } from '@/components/forms/PlaceOfBirthField'
import BirthDateTimeFields from '@/components/forms/BirthDateTimeFields'
import type { CompatibilityReportRow } from '@/types/db'

export default function CompatibilityPage() {
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)

  const [partnerName, setPartnerName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('12:00')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [place, setPlace] = useState<PlaceOfBirthValue | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [report, setReport] = useState<CompatibilityReportRow | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!session) return setError('Sign in again — your session expired.')
    if (!partnerName.trim()) return setError("Enter your partner's name.")
    if (!date) return setError('Enter their date of birth.')
    if (!place) return setError('Enter their place of birth.')

    setSubmitting(true)
    try {
      const tzName = resolveTimeZone(place.lat, place.lon)
      const effectiveTime = timeUnknown ? '12:00' : time
      const utcOffsetMinutes = resolveHistoricalOffsetMinutes(tzName, date, effectiveTime)

      const { data: otherProfile, error: insertError } = await supabase
        .from('birth_profiles')
        .insert({
          user_id: session.user.id,
          relation: 'other',
          name: partnerName,
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
      if (insertError || !otherProfile) throw new Error(insertError?.message ?? 'Could not save their profile.')

      try {
        const { report: newReport } = await callEdgeFunction<{ report: CompatibilityReportRow }>('compatibility', {
          otherBirthProfileId: otherProfile.id,
        })
        setReport(newReport)
      } catch (reportError) {
        // The profile row is only useful attached to a report — if generation failed (e.g. the AI
        // quota ran out), drop it so retrying doesn't pile up duplicate partner profiles.
        await supabase.from('birth_profiles').delete().eq('id', otherProfile.id)
        throw reportError
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't compute compatibility — double check the details.")
    } finally {
      setSubmitting(false)
    }
  }

  const breakdown = report?.guna_breakdown

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

          <Button type="submit" variant="accent" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Computing…' : 'Compute compatibility →'}
          </Button>
        </form>
      </Card>

      {report && breakdown && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">
              {profile?.display_name} & {partnerName}
            </h2>
            <div className="nums-tabular text-right">
              <p className="font-display text-3xl text-accent">{report.guna_total}</p>
              <p className="text-xs text-ink-faint">of {report.guna_max}</p>
            </div>
          </div>

          <p className="mt-4 text-ink">{highlightGlossaryTerms(report.prose)}</p>

          <div className="mt-6 space-y-4 border-t border-line pt-5">
            <ScoreRow label="Bhakoot (emotional pacing)" points={breakdown.bhakoot.points} max={breakdown.bhakoot.max} />
            <ScoreRow label="Gana (temperament)" points={breakdown.gana.points} max={breakdown.gana.max} />
            <ScoreRow label="Nadi (vitality)" points={breakdown.nadi.points} max={breakdown.nadi.max} />
          </div>

          <p className="mt-4 text-xs text-ink-faint">
            Simplified Ashtakoot-style score (3 of the classical 8 kutas) — not the full
            36-point traditional system.
          </p>
        </Card>
        </motion.div>
      )}
    </div>
  )
}

function ScoreRow({ label, points, max }: { label: string; points: number; max: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="nums-tabular text-ink-muted">
          {points}/{max}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-paper-sunken">
        <div className="h-full rounded-full bg-accent" style={{ width: `${(points / max) * 100}%` }} />
      </div>
    </div>
  )
}
