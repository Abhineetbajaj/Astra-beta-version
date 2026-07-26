import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/lib/cn'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id?: string
  className?: string
}

export function Switch({ checked, onCheckedChange, id, className }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        'relative h-6 w-10 shrink-0 rounded-full border border-line-strong bg-paper-sunken transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        className,
      )}
    >
      <SwitchPrimitive.Thumb className="block size-4 translate-x-1 rounded-full bg-paper shadow transition-transform will-change-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-accent-ink" />
    </SwitchPrimitive.Root>
  )
}
