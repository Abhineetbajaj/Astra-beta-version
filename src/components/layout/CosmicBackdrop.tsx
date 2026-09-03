// Subtle constellation motif behind the authenticated app. Visibility is controlled entirely by
// --cosmic-opacity (0 in light mode, 0.11 in dark — see globals.css), so this component needs no
// theme-detection logic of its own; it renders identically in both themes and the token does the
// showing/hiding. Rendered once from AppShell so every authenticated page inherits it for free.
export default function CosmicBackdrop() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ opacity: 'var(--cosmic-opacity)' }}
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
  )
}
