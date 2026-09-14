import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { OrbState } from '@/components/astrologer/AstraOrb'

/**
 * The Astra field — the page's visual centrepiece and its state display at once.
 *
 * Built as layered depth rather than a single graphic: a sparse star field behind, orbital
 * architecture in the middle, precision rings in front, and a luminous core at the centre. Children
 * (the voice control) mount *inside* that core, so pressing to speak reads as reaching into the
 * system rather than clicking a button placed near it.
 *
 * Deliberately SVG and CSS. It carries the hero on its own, which is what keeps the page fast,
 * accessible and robust when a video asset is slow, blocked, or suppressed by reduced-motion — the
 * generated loop mounts behind this as an enhancement, never as a dependency.
 *
 * All rotation uses the app's existing orbit utilities, so the single global prefers-reduced-motion
 * guard in globals.css neutralises the motion here too, with no separate handling.
 */

/** Fixed, hand-placed star positions — deterministic so the field never reshuffles between renders
    or states. Values are viewBox units: [cx, cy, r, opacity]. */
const STARS: ReadonlyArray<readonly [number, number, number, number]> = [
  [40, 62, 0.9, 0.5], [78, 30, 0.7, 0.35], [126, 88, 1.1, 0.55], [168, 44, 0.8, 0.4],
  [212, 104, 0.9, 0.45], [252, 58, 0.7, 0.3], [296, 122, 1, 0.5], [332, 74, 0.8, 0.38],
  [58, 158, 0.8, 0.42], [150, 196, 0.9, 0.3], [244, 176, 0.7, 0.36], [318, 210, 1, 0.44],
  [92, 246, 0.9, 0.34], [190, 268, 0.8, 0.28], [286, 254, 0.7, 0.32], [356, 168, 0.9, 0.4],
  [22, 210, 0.7, 0.3], [364, 108, 0.8, 0.36],
]

/** Per-state emphasis. Orbit speed and luminosity carry the status; nothing else moves. */
const FIELD_STATE: Record<
  OrbState,
  { outer: string; inner: string; ringOpacity: number; coreScale: number; glow: number; breathe: boolean }
> = {
  // Glow is deliberately low now: the cinematic layer behind supplies the luminosity, and a strong
  // glow here flattened it into an orange wash that hid the orbital detail entirely. This layer's
  // job is structure and state — rings and the travelling dot — not brightness.
  idle: { outer: 'orbit-ambient', inner: 'orbit-medium', ringOpacity: 0.36, coreScale: 1, glow: 0.05, breathe: true },
  listening: { outer: 'orbit-medium', inner: 'orbit-spin', ringOpacity: 0.85, coreScale: 1.08, glow: 0.15, breathe: true },
  processing: { outer: 'orbit-medium', inner: 'orbit-medium', ringOpacity: 0.56, coreScale: 0.94, glow: 0.08, breathe: false },
  speaking: { outer: 'orbit-ambient', inner: 'orbit-medium', ringOpacity: 0.68, coreScale: 1.04, glow: 0.11, breathe: true },
  error: { outer: '', inner: '', ringOpacity: 0.16, coreScale: 0.9, glow: 0.03, breathe: false },
}

interface AstraFieldProps {
  state: OrbState
  /** Shrinks the field once a conversation is underway, so the answer becomes the focus. */
  compact?: boolean
  children?: ReactNode
  className?: string
}

export default function AstraField({ state, compact = false, children, className }: AstraFieldProps) {
  const s = FIELD_STATE[state]
  const accent = state === 'error' ? 'var(--color-ink-faint)' : 'var(--color-accent)'

  return (
    <div
      className={cn(
        // overflow-hidden matters: the ring layers rotate, and a rotated square's bounding box
        // grows to its diagonal (~1.41x), which pushed the document wider than the viewport on
        // narrow screens. The rings are perfect circles, so clipping the corners changes nothing
        // visible.
        // rounded-full, not just overflow-hidden: a square clip leaves a visible rectangular seam
        // where it cuts the blurred glow, which became obvious once the field shrank. Everything
        // here is concentric circles, so a circular clip is invisible.
        'relative mx-auto aspect-square w-full overflow-hidden rounded-full transition-[max-width] duration-700 ease-out',
        // Compact is tighter than it looks it needs to be: the field is square, so most of its
        // height is empty space around an 80px control. Shrinking it is what removes the dead gap
        // above the conversation without deleting the breathing room entirely.
        compact ? 'max-w-[168px] sm:max-w-[184px]' : 'max-w-[440px] sm:max-w-[600px]',
        className,
      )}
    >
      {/* Background: star field. Static — depth, not motion. */}
      <svg viewBox="0 0 384 300" className="absolute inset-0 size-full" aria-hidden="true">
        {STARS.map(([cx, cy, r, o], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="var(--color-ink-faint)" opacity={o} />
        ))}
      </svg>

      {/* Midground: the wide orbital architecture, tilted so it reads as a system seen at an angle
          rather than a flat target. */}
      <svg
        viewBox="0 0 384 384"
        className={cn('absolute inset-0 size-full', s.outer)}
        style={{ transform: 'rotateX(62deg)', transformOrigin: '50% 50%' }}
        aria-hidden="true"
      >
        <ellipse cx="192" cy="192" rx="186" ry="186" fill="none" stroke="var(--color-line-strong)" strokeWidth="1" />
        <ellipse
          cx="192"
          cy="192"
          rx="150"
          ry="150"
          fill="none"
          stroke={accent}
          strokeWidth="1"
          strokeOpacity={s.ringOpacity * 0.6}
          strokeDasharray="1 10"
        />
        <circle cx="192" cy="6" r="2.6" fill={accent} opacity={s.ringOpacity} />
        <circle cx="342" cy="192" r="1.8" fill={accent} opacity={s.ringOpacity * 0.7} />
      </svg>

      {/* Foreground: the precision rings, upright and unmistakably Astra's existing orb language. */}
      <svg
        viewBox="0 0 384 384"
        className={cn('absolute inset-0 size-full transition-opacity duration-700', s.inner)}
        aria-hidden="true"
      >
        <circle cx="192" cy="192" r="118" fill="none" stroke="var(--color-line-strong)" strokeWidth="1" />
        <circle
          cx="192"
          cy="192"
          r="96"
          fill="none"
          stroke={accent}
          strokeWidth="1"
          strokeOpacity={s.ringOpacity}
          strokeDasharray="2 8"
        />
        <circle cx="192" cy="74" r="3.4" fill={accent} />
      </svg>

      {/* The luminous core, and the voice control living inside it. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          aria-hidden="true"
          className={cn(
            'absolute rounded-full blur-2xl transition-all duration-700 ease-out',
            s.breathe && 'glow-breathe',
          )}
          style={{
            width: `${compact ? 42 : 52}%`,
            height: `${compact ? 42 : 52}%`,
            background: accent,
            opacity: s.glow,
            transform: `scale(${s.coreScale})`,
          }}
        />
        <div className="relative flex items-center justify-center">{children}</div>
      </div>
    </div>
  )
}
