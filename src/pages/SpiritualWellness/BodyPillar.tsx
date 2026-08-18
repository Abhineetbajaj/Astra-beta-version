// Body pillar — the former standalone "Wellness" (medical astrology) page, unchanged in
// substance, just folded into the Spiritual Wellness shell. Same edge function, same table.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { HeartPulse, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import { callEdgeFunction } from '@/lib/edgeFunctions'
import { highlightGlossaryTerms } from '@/lib/highlightGlossaryTerms'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'
import type { MedicalReadingRow } from '@/types/db'

const DISCLAIMER =
  'Not medical advice or diagnosis — a traditional astrological perspective only. Consult a healthcare professional for real health concerns.'

export default function BodyPillar() {
  const session = useAuthStore((s) => s.session)
  const isPremium = useAuthStore((s) => s.isPremium)
  const selfBirthProfile = useAuthStore((s) => s.selfBirthProfile)
  const [reading, setReading] = useState<MedicalReadingRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return setLoadingExisting(false)
    let cancelled = false
    supabase
      .from('medical_readings')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (data) setReading(data as MedicalReadingRow)
        setLoadingExisting(false)
      })
    return () => {
      cancelled = true
    }
  }, [session])

  async function generate() {
    if (!selfBirthProfile) return
    setLoading(true)
    setError(null)
    try {
      const { reading } = await callEdgeFunction<{ reading: MedicalReadingRow }>('medical-reading', {
        birthProfileId: selfBirthProfile.id,
      })
      setReading(reading)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate a reading.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-body-soft px-5 py-4">
        <div className="flex items-center gap-2 text-body-strong">
          <HeartPulse className="size-5" strokeWidth={1.75} />
          <span className="text-xs font-semibold uppercase tracking-wide">Body</span>
        </div>
        <p className="mt-1.5 text-sm text-ink-muted">
          General energy patterns from the 6th, 8th, and 12th houses and dasha timing — soft, reflective language, never a diagnosis.
        </p>
      </div>

      <DisclaimerBanner text={DISCLAIMER} />

      {!isPremium ? (
        <Card className="border-body/30 text-center">
          <Lock className="mx-auto size-5 text-body" strokeWidth={1.75} />
          <h2 className="mt-3 font-display text-lg">Wellness readings are part of Astra Premium</h2>
          <p className="mt-1 text-sm text-ink-muted">6th/8th/12th house patterns and dasha timing, in soft, reflective language.</p>
          <Link to="/pricing">
            <Button variant="accent" size="lg" className="mt-4 w-full">
              See Premium →
            </Button>
          </Link>
        </Card>
      ) : (
        <Card>
          <h2 className="font-display text-lg">Your wellness reading</h2>
          <Button variant={reading ? 'outline' : 'accent'} size="lg" className="mt-4" onClick={generate} disabled={loading || loadingExisting}>
            {loading ? 'Reading your chart…' : reading ? 'Generate a fresh reading' : 'Generate my wellness reading'}
          </Button>
          {error && (
            <div className="mt-3 rounded-xl border border-negative/30 bg-negative/5 px-4 py-3">
              <p className="text-sm text-negative">{error}</p>
              <button onClick={generate} className="mt-2 text-sm text-ink-muted underline hover:text-ink">
                Try again
              </button>
            </div>
          )}
          {(loading || loadingExisting) && !reading && (
            <div className="mt-5 space-y-2 border-t border-line pt-5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          )}
          {reading && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-5 border-t border-line pt-5">
              <p className="text-ink">{highlightGlossaryTerms(reading.body)}</p>
              <DisclaimerBanner text={reading.disclaimer} className="mt-4" />
            </motion.div>
          )}
        </Card>
      )}
    </div>
  )
}
