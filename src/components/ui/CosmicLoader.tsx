import { cn } from '@/lib/cn'

interface CosmicLoaderProps {
  label?: string
  className?: string
}

/**
 * Two counter-rotating arcs — the loading state for anything that takes a real moment
 * (chart computation, a Gemini-narrated reading) rather than a bare spinner.
 */
export default function CosmicLoader({ label = 'Reading the cosmic patterns…', className }: CosmicLoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-10', className)} role="status">
      <div className="relative size-12">
        <span className="absolute inset-0 rounded-full border border-line" />
        <span className="orbit-spin absolute inset-0 rounded-full border-2 border-transparent border-t-accent" />
        <span className="orbit-spin-reverse absolute inset-[6px] rounded-full border border-transparent border-b-accent/60" />
        <span className="glow-breathe absolute inset-[18px] rounded-full bg-accent/50" />
      </div>
      {label && <p className="text-sm text-ink-muted">{label}</p>}
      <span className="sr-only">Loading</span>
    </div>
  )
}
