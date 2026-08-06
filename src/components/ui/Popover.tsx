import type { ComponentPropsWithoutRef } from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/cn'

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

export function PopoverContent({
  className,
  children,
  sideOffset = 6,
  ...props
}: ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 max-w-xs rounded-xl border border-line bg-paper-raised px-3.5 py-2.5 text-sm leading-snug text-ink shadow-lg',
          className,
        )}
        {...props}
      >
        {children}
        <PopoverPrimitive.Arrow className="fill-paper-raised" />
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}
