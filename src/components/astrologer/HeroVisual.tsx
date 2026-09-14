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
            ready ? 'opacity-90' : 'opacity-0',
          )}
        >
          <source src={SRC_WEBM} type="video/webm" />
          <source src={SRC_MP4} type="video/mp4" />
        </video>
      )}

      {/* Protects text where text actually is — heavy at the top behind the headline and at the
          bottom behind the controls, opening up through the middle band where the orbital
          structure reads and nothing needs to stay legible. A uniform scrim dimmed the asset to
          the point of invisibility. */}
      <div className="absolute inset-0 bg-gradient-to-b from-paper/85 via-paper/25 to-paper/95" />
    </div>
  )
}
