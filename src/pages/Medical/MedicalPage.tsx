import { useState } from 'react'
import { motion } from 'framer-motion'
import { HeartPulse } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { callEdgeFunction } from '@/lib/edgeFunctions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'
import type { MedicalReadingRow } from '@/types/db'

const DISCLAIMER =
  'Not medical advice or diagnosis — a traditional astrological perspective only. Consult a healthcare professional for real health concerns.'

export default function MedicalPage() {
  const selfBirthProfile = useAuthStore((s) => s.selfBirthProfile)
  const [reading, setReading] = useState<MedicalReadingRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <div className="mx-auto max-w-2xl space-y-10">
      <div className="text-center">
        <HeartPulse className="mx-auto size-6 text-accent" strokeWidth={1.5} />
        <h1 className="mt-3 font-display text-4xl">Wellness astrology</h1>
        <p className="mt-2 text-ink-muted">General energy patterns from the 6th, 8th, and 12th houses and dasha timing.</p>
      </div>

      <DisclaimerBanner text={DISCLAIMER} />

      <Card>
        <h2 className="font-display text-lg">Your wellness reading</h2>
        <p className="mt-1 text-sm text-ink-muted">Soft, reflective language — never a diagnosis.</p>
        <Button variant="accent" size="lg" className="mt-4" onClick={generate} disabled={loading}>
          {loading ? 'Reading your chart…' : 'Generate my wellness reading'}
        </Button>
        {error && <p className="mt-3 text-sm text-negative">{error}</p>}
        {loading && !reading && (
          <div className="mt-5 space-y-2 border-t border-line pt-5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        )}
        {reading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-5 border-t border-line pt-5"
          >
            <p className="text-ink">{reading.body}</p>
            <DisclaimerBanner text={reading.disclaimer} className="mt-4" />
          </motion.div>
        )}
      </Card>
    </div>
  )
}
