import { cn } from '@/lib/cn'

/**
 * Astra's presence on the AI Astrologer page — the fourth member of the app's orb family, built
 * from the same recipe as NumberOrb, RulingPlanetGlyph and BodySignalGlyph: a line-strong outer
 * ring, an accent inner ring at low opacity with a dashed stroke, and a single dot travelling the
 * ring, with the whole <svg> rotated rather than an inner group (perfect circles make the rotation
 * invisible and this sidesteps SVG transform-origin inconsistencies).
 *
 * What differs is that this one is stateful rather than data-bearing: the conversation state
 * changes orbit speed, ring opacity and the centre's weight, so the motion *is* the status
 * indicator. That's why there's no separate indicator component — two things animating the same
 * status can disagree; one cannot.
 */
export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error'

/** Per-state motion and emphasis. Orbit classes are the existing globals.css utilities, so
    prefers-reduced-motion is already handled by the global guard that neutralises them. */
const STATE_STYLE: Record<OrbState, { orbit: string; ring: number; dot: number; pulse: boolean }> = {
  idle: { orbit: 'orbit-ambient', ring: 0.3, dot: 3, pulse: false },
  listening: { orbit: 'orbit-medium', ring: 0.75, dot: 4.5, pulse: true },
  processing: { orbit: 'orbit-medium', ring: 0.5, dot: 3.5, pulse: false },
  speaking: { orbit: 'orbit-ambient', ring: 0.6, dot: 4, pulse: true },
  error: { orbit: '', ring: 0.2, dot: 2.6, pulse: false },
}

interface AstraOrbProps {
  state: OrbState
  className?: string
}

export default function AstraOrb({ state, className }: AstraOrbProps) {
  const s = STATE_STYLE[state]
  const stroke = state === 'error' ? 'var(--color-ink-faint)' : 'var(--color-accent)'

  return (
    <div className={cn('relative shrink-0', className)} aria-hidden="true">
      <svg viewBox="0 0 120 120" className={cn('absolute inset-0 size-full', s.orbit)}>
        <circle cx="60" cy="60" r="55" fill="none" stroke="var(--color-line-strong)" strokeWidth="1" />
        <circle
          cx="60"
          cy="60"
          r="46"
          fill="none"
          stroke={stroke}
          strokeWidth="1"
          strokeOpacity={s.ring}
          strokeDasharray="2 8"
        />
        <circle cx="60" cy="5" r={s.dot} fill={stroke} />
      </svg>

      {/* The centre sits outside the rotating svg so it never spins. Its only job is to breathe
          with the state — no glyph, no numeral: Astra is the subject here, not a data point. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            'block rounded-full transition-all duration-700 ease-out',
            s.pulse && 'glow-breathe',
            state === 'error' ? 'size-10 bg-ink-faint/15' : 'size-14 bg-accent/12',
          )}
        />
        <span
          className={cn(
            'absolute rounded-full ring-1 transition-all duration-700 ease-out',
            state === 'error' ? 'size-10 ring-line-strong' : 'size-14 ring-accent/35',
          )}
        />
      </div>
    </div>
  )
}
