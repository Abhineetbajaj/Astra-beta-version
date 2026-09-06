import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-xl border bg-paper px-3.5 text-sm text-ink placeholder:text-ink-faint',
        'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        'disabled:cursor-not-allowed disabled:opacity-60',
        error ? 'border-negative' : 'border-line-strong focus:border-accent',
        className,
      )}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
