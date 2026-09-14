import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

/**
 * The cinematic layer behind the Astra field. Purely decorative: it carries no state, no text and
 * no interaction, so nothing breaks if it never loads.
 *
 * Load order is deliberate. The 41 KB poster renders immediately and is the only thing the first
 * paint waits on; the video is requested afterwards and fades in once it can actually play. That
 * means no layout shift, no blocked paint, and a page that is fully usable whether or not the
 * video ever arrives.
 *
 * Visibility rides on --cosmic-opacity, the same token CosmicBackdrop uses: 0 in light, 1 in dark.
 * That makes it dark-mode-first without a line of theme-detection JS, and correct in all three
 * theme states including "system".
 *
 * Reduced motion is handled by never requesting the video at all — the poster is the whole
 * experience, which is both the accessible answer and the cheap one.
 */

const SRC_WEBM = '/media/astra-hero.webm'
const SRC_MP4 = '/media/astra-hero.mp4'
const POSTER = '/media/astra-hero.webp'

export default function HeroVisual({ className }: { className?: string }) {
  const [wantsVideo, setWantsVideo] = useState(false)
  const [ready, setReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (reduced?.matches) return
    // Deferred a frame so the poster paints first and the video never competes with it.
    const id = requestAnimationFrame(() => setWantsVideo(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      aria-hidden="true"
      // `fixed` with inset-x-0, matching CosmicBackdrop: a full-bleed layer that is pinned to the
      // viewport rather than stretched past its container, so it cannot widen the document. An
      // absolutely-positioned 100vw bleed would have reintroduced horizontal overflow.
      className={cn('pointer-events-none fixed inset-x-0 top-0 -z-10 overflow-hidden', className)}
      style={{ opacity: 'var(--cosmic-opacity)' }}
    >
      {/* Always present, always instant. Also the permanent fallback when the video is refused. */}
      <img
        src={POSTER}
        alt=""
        className={cn(
          'absolute inset-0 size-full object-cover object-center transition-opacity duration-1000',
          ready ? 'opacity-0' : 'opacity-70',
        )}
      />

      {wantsVideo && (
        <video
          ref={videoRef}
          poster={POSTER}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          onCanPlay={() => setReady(true)}
          onError={() => setReady(false)}
          className={cn(
            'absolute inset-0 size-full object-cover object-center transition-opacity duration-1000',
            ready ? 'opacity-100' : 'opacity-0',
          )}
        >
          <source src={SRC_WEBM} type="video/webm" />
          <source src={SRC_MP4} type="video/mp4" />
        </video>
      )}

      {/* Two scrims doing different jobs, rather than one flat wash that dimmed the asset into
          near-invisibility. The vertical pass protects the headline at the top and the controls at
          the bottom; the radial pass keeps the centre clear, which is exactly where the celestial
          architecture sits and where nothing needs to stay legible. */}
      <div className="absolute inset-0 bg-gradient-to-b from-paper/80 via-transparent to-paper/90" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 50% 48%, transparent 0%, transparent 42%, var(--color-paper) 100%)',
          opacity: 0.55,
        }}
      />
    </div>
  )
}
