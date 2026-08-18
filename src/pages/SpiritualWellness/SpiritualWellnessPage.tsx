import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HeartPulse, Headphones, Flame, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import BodyPillar from '@/pages/SpiritualWellness/BodyPillar'
import MindPillar from '@/pages/SpiritualWellness/MindPillar'
import SpiritPillar from '@/pages/SpiritualWellness/SpiritPillar'

type Pillar = 'body' | 'mind' | 'spirit'

const PILLARS: { key: Pillar; label: string; blurb: string; icon: LucideIcon }[] = [
  { key: 'body', label: 'Body', blurb: 'Wellness astrology', icon: HeartPulse },
  { key: 'mind', label: 'Mind', blurb: 'Reflection & ritual', icon: Headphones },
  { key: 'spirit', label: 'Spirit', blurb: 'Mantras & stotras', icon: Flame },
]

// Literal, non-interpolated class strings per pillar — Tailwind's scanner needs the full
// utility name to appear verbatim in source, so this can't be built from a template string.
const ACTIVE_TAB_STYLES: Record<Pillar, string> = {
  body: 'bg-body text-body-ink shadow-sm',
  mind: 'bg-mind text-mind-ink shadow-sm',
  spirit: 'bg-spirit text-spirit-ink shadow-sm',
}

export default function SpiritualWellnessPage() {
  const [pillar, setPillar] = useState<Pillar>('mind')

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="text-center">
        <h1 className="font-display text-4xl">Spiritual Wellness</h1>
        <p className="mt-2 text-ink-muted">Body, mind, and spirit — one place to tend to all three.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-line bg-paper-raised p-2">
        {PILLARS.map((p) => {
          const Icon = p.icon
          const active = pillar === p.key
          return (
            <button
              key={p.key}
              onClick={() => setPillar(p.key)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl px-3 py-3.5 transition-all',
                active ? ACTIVE_TAB_STYLES[p.key] : 'text-ink-muted hover:bg-paper',
              )}
            >
              <Icon className="size-5" strokeWidth={1.75} />
              <span className="text-sm font-semibold">{p.label}</span>
              <span className={cn('text-[11px]', active ? 'opacity-80' : 'text-ink-faint')}>{p.blurb}</span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={pillar}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {pillar === 'body' && <BodyPillar />}
          {pillar === 'mind' && <MindPillar />}
          {pillar === 'spirit' && <SpiritPillar />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
