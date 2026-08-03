import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { callEdgeFunction } from '@/lib/edgeFunctions'
import { RASHIS } from '@/data/rashis'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import type { RashiHoroscopeRow } from '@/types/db'

export default function HoroscopePage() {
  const [selected, setSelected] = useState<number | null>(null)
  const [horoscope, setHoroscope] = useState<RashiHoroscopeRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function pick(rashiIndex: number) {
    setSelected(rashiIndex)
    setHoroscope(null)
    setError(null)
    setLoading(true)
    callEdgeFunction<{ horoscope: RashiHoroscopeRow }>('rashi-horoscope', { rashiIndex })
      .then(({ horoscope }) => setHoroscope(horoscope))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the horoscope.'))
      .finally(() => setLoading(false))
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <Sparkles className="mx-auto size-6 text-accent" strokeWidth={1.5} />
        <h1 className="mt-3 font-display text-4xl">Daily horoscope</h1>
        <p className="mt-2 text-ink-muted">
          Pick a sign for a general reading — for your own real chart, see{' '}
          <span className="text-ink">Today</span>.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {RASHIS.map((rashi) => (
          <button
            key={rashi.index}
            onClick={() => pick(rashi.index)}
            className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-4 transition-colors ${
              selected === rashi.index ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong'
            }`}
          >
            <span className="text-xl">{rashi.symbol}</span>
            <span className="text-xs text-ink-muted">{rashi.name}</span>
          </button>
        ))}
      </div>

      {loading && (
        <Card className="mt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
        </Card>
      )}

      {error && <p className="mt-6 text-sm text-negative">{error}</p>}

      {horoscope && selected != null && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg">
                {RASHIS[selected].symbol} {RASHIS[selected].name}
              </h2>
              <span className="text-xs text-ink-faint">
                {new Date(horoscope.horoscope_date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
              </span>
            </div>
            <p className="mt-3 text-ink">{horoscope.body}</p>
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-faint">Mood</p>
                <p className="mt-0.5">{horoscope.mood}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-faint">Lucky #</p>
                <p className="mt-0.5">{horoscope.lucky_number}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-faint">Color</p>
                <p className="mt-0.5">{horoscope.lucky_color}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
