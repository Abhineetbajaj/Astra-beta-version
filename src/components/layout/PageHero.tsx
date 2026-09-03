import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface PageHeroProps {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  /** The page's own nav icon, echoed large and faint behind the heading as atmosphere. */
  Icon?: LucideIcon
  /** Overrides the icon when a page has something more specific to say (Numerology uses the
      reader's own Life Path numeral). */
  atmosphere?: ReactNode
  align?: 'left' | 'center'
  className?: string
}

/** Entrance order: eyebrow, then title, then subtitle — one orchestrated moment per page. */
const rise = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: 0.07 * i, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

export default function PageHero({
  eyebrow,
  title,
  subtitle,
  Icon,
  atmosphere,
  align = 'left',
  className,
}: PageHeroProps) {
  const centered = align === 'center'

  return (
    <motion.div
      initial="hidden"
      animate="show"
      className={cn('relative', centered && 'text-center', className)}
    >
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -z-10 select-none',
          centered ? '-top-14 left-1/2 -translate-x-1/2' : '-top-12 right-0',
        )}
      >
        {atmosphere ??
          (Icon ? <Icon className="size-48 text-ink opacity-[0.045]" strokeWidth={0.6} /> : null)}
      </div>

      {centered && Icon && !atmosphere && (
        <motion.div custom={0} variants={rise}>
          <Icon className="mx-auto size-6 text-accent" strokeWidth={1.5} />
        </motion.div>
      )}

      {eyebrow && (
        <motion.p
          custom={1}
          variants={rise}
          className={cn('text-xs uppercase tracking-wide text-ink-faint', centered && 'mt-3')}
        >
          {eyebrow}
        </motion.p>
      )}

      <motion.h1 custom={2} variants={rise} className={cn('font-display text-4xl', (eyebrow || centered) && 'mt-2')}>
        {title}
      </motion.h1>

      {subtitle && (
        <motion.p
          custom={3}
          variants={rise}
          className={cn('mt-2 text-ink-muted', !centered && 'max-w-xl')}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  )
}
