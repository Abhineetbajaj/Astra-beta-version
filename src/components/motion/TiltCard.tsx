import { useRef } from 'react'
import type { ReactNode } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/cn'

interface TiltCardProps {
  children: ReactNode
  className?: string
  /** Max rotation in degrees at the very edge of the card. Kept small deliberately — this should
      read as "the card noticed the cursor," not a gaming-UI card flip. */
  maxTilt?: number
}

/**
 * Cursor-tracking 3D tilt, applied selectively (the chart panel only, per the Step 4 brief's
 * "avoid exaggerated rotation... do not make this feel like a gaming website"). Springs back to
 * flat on mouse-leave. Touch devices never fire mousemove here, so this is inert there without
 * needing a separate touch check. Bails out entirely under prefers-reduced-motion.
 */
export default function TiltCard({ children, className, maxTilt = 5 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const springX = useSpring(px, { stiffness: 220, damping: 22 })
  const springY = useSpring(py, { stiffness: 220, damping: 22 })
  // Signs verified empirically (see Step 4 notes), not assumed: the edge nearest the cursor
  // should lift toward the viewer, like a glossy surface tilting to catch the light at that
  // point — not dip away from it.
  const rotateX = useTransform(springY, [0, 1], [-maxTilt, maxTilt])
  const rotateY = useTransform(springX, [0, 1], [maxTilt, -maxTilt])

  if (reducedMotion) {
    // Same position: relative requirement as the tilting path below — this must stay correct
    // relative to absolutely-positioned decorative siblings even with the tilt effect removed.
    return (
      <div style={{ position: 'relative' }} className={className}>
        {children}
      </div>
    )
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    px.set((e.clientX - rect.left) / rect.width)
    py.set((e.clientY - rect.top) / rect.height)
  }

  function handleMouseLeave() {
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      // position: relative is deliberate, not incidental — this wrapper commonly sits alongside
      // absolutely-positioned decorative siblings (e.g. ChartAtmosphere) that come earlier in the
      // DOM. Without an explicit position, this stays "static, non-positioned" and paints BELOW
      // any earlier absolutely-positioned sibling regardless of DOM order, which would bury the
      // actual content behind the decoration. Setting it here means every caller gets this right
      // automatically instead of needing to remember it.
      style={{ perspective: 900, position: 'relative' }}
      className={cn('will-change-transform', className)}
    >
      <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}>{children}</motion.div>
    </div>
  )
}
