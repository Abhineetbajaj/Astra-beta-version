// A restrained celestial scene behind the natal chart: two orbital arcs (one rotating at the same
// 150s pace as the landing page's zodiac wheel, so the whole app shares one "ambient" rotation
// speed) and a few fixed glow points reusing the existing glow-breathe pulse, staggered so they
// don't beat in sync. Deliberately NOT drifting/floating particles — the Step 4 brief explicitly
// warns against "floating random elements," so position stays fixed and only opacity/scale pulses,
// same restraint already established elsewhere in the app.
export default function ChartAtmosphere() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full overflow-visible"
      viewBox="0 0 240 240"
    >
      <g className="orbit-ambient" style={{ transformOrigin: '120px 120px' }}>
        <ellipse
          cx="120"
          cy="120"
          rx="118"
          ry="80"
          fill="none"
          stroke="var(--color-accent)"
          strokeOpacity="0.14"
          strokeWidth="1"
          strokeDasharray="1 7"
        />
        <ellipse
          cx="120"
          cy="120"
          rx="90"
          ry="112"
          fill="none"
          stroke="var(--color-spirit)"
          strokeOpacity="0.1"
          strokeWidth="1"
          strokeDasharray="1 9"
        />
      </g>

      {/* glow-breathe animates opacity as an absolute value (0.45<->0.75), so no separate base
          opacity is set here — it would just be overridden the instant the animation starts. */}
      <circle cx="18" cy="46" r="2" className="glow-breathe" style={{ animationDelay: '0s' }} fill="var(--color-accent)" />
      <circle cx="224" cy="70" r="1.6" className="glow-breathe" style={{ animationDelay: '1.4s' }} fill="var(--color-spirit)" />
      <circle cx="206" cy="196" r="2.2" className="glow-breathe" style={{ animationDelay: '2.8s' }} fill="var(--color-accent)" />
      <circle cx="24" cy="188" r="1.6" className="glow-breathe" style={{ animationDelay: '4.2s' }} fill="var(--color-spirit)" />
    </svg>
  )
}
