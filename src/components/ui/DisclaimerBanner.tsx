import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Visible disclaimer banner — used both as the persistent top-of-page banner and repeated next
 * to individual insight text, per the non-negotiable that this must never read as buried fine print. */
export function DisclaimerBanner({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-line-strong bg-paper-raised px-4 py-3 text-sm text-ink-muted',
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.75} />
      <p>{text}</p>
    </div>
  )
}
