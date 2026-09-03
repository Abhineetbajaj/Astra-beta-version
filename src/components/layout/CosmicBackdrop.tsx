// Atmosphere behind the app: two slowly drifting warm light sources, a faint film grain, and a
// constellation motif. Every layer's visibility is driven by --cosmic-opacity (0 in light mode,
// nonzero in dark — see globals.css), so this component needs no theme-detection logic of its own
// and the token does all the showing and hiding. Rendered once from AppShell and from the landing
// page, so every page inherits it for free.
//
// All three layers are fixed and pointer-events-none, so they never affect layout or interaction,
// and the drift animations are neutralised by the global prefers-reduced-motion guard.
export default function CosmicBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ opacity: 'var(--cosmic-opacity)' }}
    >
      {/* Celestial light sources — blurred warm masses on long, mismatched cycles. */}
      <div className="drift-a absolute -left-[10%] top-[-15%] size-[55vw] rounded-full bg-accent/20 opacity-60 blur-[120px]" />
      <div className="drift-b absolute -right-[15%] bottom-[-20%] size-[50vw] rounded-full bg-spirit/15 opacity-50 blur-[130px]" />

      {/* Film grain. feTurbulence gives real noise without shipping an image asset. */}
      <svg className="absolute inset-0 size-full opacity-[0.035] mix-blend-overlay">
        <filter id="astra-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#astra-grain)" />
      </svg>

      {/* Constellation motif. */}
      <svg
        className="absolute inset-0 size-full opacity-[0.11]"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMin slice"
      >
        <g stroke="var(--color-ink)" strokeWidth="1" strokeLinecap="round" opacity="0.5" fill="none">
          <line x1="90" y1="640" x2="190" y2="560" />
          <line x1="190" y1="560" x2="150" y2="440" />
          <line x1="190" y1="560" x2="310" y2="600" />
          <line x1="900" y1="120" x2="980" y2="210" />
          <line x1="980" y1="210" x2="1090" y2="170" />
          <line x1="980" y1="210" x2="1010" y2="320" />
          <line x1="680" y1="700" x2="760" y2="630" />
          <line x1="760" y1="630" x2="870" y2="660" />
        </g>
        <g fill="var(--color-ink)">
          <circle cx="90" cy="640" r="2.2" />
          <circle cx="190" cy="560" r="2.6" />
          <circle cx="150" cy="440" r="1.8" />
          <circle cx="310" cy="600" r="2" />
          <circle cx="900" cy="120" r="2" />
          <circle cx="980" cy="210" r="2.6" />
          <circle cx="1090" cy="170" r="1.8" />
          <circle cx="1010" cy="320" r="2.2" />
          <circle cx="680" cy="700" r="2" />
          <circle cx="760" cy="630" r="2.4" />
          <circle cx="870" cy="660" r="1.8" />
        </g>
      </svg>
    </div>
  )
}
