import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Lift + warm glow on hover. Opt-in rather than the default: reserved for cards worth
      calling out (the daily reading, numerology results), so the effect keeps its meaning. */
  interactive?: boolean
}

export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-paper-raised/60 p-6',
        'bg-gradient-to-br from-white/[0.03] to-transparent',
        'shadow-[0_10px_36px_-26px_rgba(0,0,0,0.45)]',
        interactive && 'card-interactive',
        className,
      )}
      {...props}
    />
  )
}
