import { cn } from '@/lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('skeleton-shimmer relative overflow-hidden rounded-md bg-paper-sunken', className)} />
  )
}
