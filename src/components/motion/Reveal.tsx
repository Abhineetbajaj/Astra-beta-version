import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  /** Seconds to wait before this element animates — used to stagger siblings. */
  delay?: number
  className?: string
}

/**
 * Fades content up as it scrolls into view, once. Content stays in the DOM the whole time
 * (Framer only sets the transform/opacity on the client), so this costs nothing for crawlers
 * and nothing for reduced-motion users, who get the finished state immediately.
 */
export default function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
