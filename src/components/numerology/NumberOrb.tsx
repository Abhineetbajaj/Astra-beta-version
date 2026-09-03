import { cn } from '@/lib/cn'

interface NumberOrbProps {
  value: number
  isMaster?: boolean
  size?: 'sm' | 'lg'
  className?: string
}

/**
 * A core number rendered as the visual hero it should be: a large display numeral inside a thin
 * orbit ring, with a single accent dot travelling the ring.
 *
 * The rotation is applied to the whole <svg> rather than to the dot's group — the rings are
 * perfect circles, so rotating them is invisible, and this sidesteps SVG transform-origin
 * inconsistencies entirely. The numeral sits outside the SVG so it never rotates.
 */
export default function NumberOrb({ value, isMaster = false, size = 'sm', className }: NumberOrbProps) {
  const px = size === 'lg' ? 132 : 96
  const outer = px / 2 - 5
  const inner = outer - 8

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: px, height: px }}>
      <svg viewBox={`0 0 ${px} ${px}`} className="orbit-medium absolute inset-0 size-full" aria-hidden="true">
        <circle cx={px / 2} cy={px / 2} r={outer} fill="none" stroke="var(--color-line-strong)" strokeWidth={1} />
        <circle
          cx={px / 2}
          cy={px / 2}
          r={inner}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={1}
          strokeOpacity={0.3}
          strokeDasharray="2 8"
        />
        <circle cx={px / 2} cy={px / 2 - outer} r={size === 'lg' ? 3.2 : 2.6} fill="var(--color-accent)" />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            'nums-tabular font-display leading-none text-ink',
            size === 'lg' ? 'text-6xl' : 'text-4xl',
          )}
        >
          {value}
        </span>
      </div>

      {isMaster && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-accent/40 bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-strong">
          Master
        </span>
      )}
    </div>
  )
}
