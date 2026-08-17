import { forwardRef } from 'react'
import type { NumerologyCompatibility } from '@/numerology-engine'
import { verdictForScore } from '@/data/compatibilityVerdicts'

// Fixed 540x960 (half of Instagram Story's 1080x1920) — captured at pixelRatio 2 by
// shareCardImage.ts to produce a full-resolution PNG. Deliberately uses the theme-invariant
// "fixed-dark" tokens (same ones AuthPage's hero panel uses) rather than the light/dark theme
// tokens — a shared card should look the same brand regardless of the viewer's device theme.
const CARD_WIDTH = 540
const CARD_HEIGHT = 960

interface CardShellProps {
  eyebrow: string
  children: React.ReactNode
}

function CardShell({ eyebrow, children }: CardShellProps) {
  return (
    <div
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      className="flex flex-col justify-between bg-fixed-dark px-10 py-12 text-fixed-dark-ink"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-fixed-dark-ink/60">{eyebrow}</p>
      <div className="flex flex-1 flex-col justify-center">{children}</div>
      <div className="flex items-center justify-between border-t border-fixed-dark-ink/15 pt-5">
        <span className="font-display text-xl">Astra</span>
        <span className="text-xs text-fixed-dark-ink/50">Get your numbers →</span>
      </div>
    </div>
  )
}

export interface CompatibilityShareData {
  selfName: string
  partnerName: string
  compatibility: NumerologyCompatibility
}

export interface PersonalDayShareData {
  dateLabel: string
  value: number
  isMaster: boolean
  title: string
  blurb: string
}

type ShareCardProps =
  | { variant: 'compatibility'; data: CompatibilityShareData }
  | { variant: 'personalDay'; data: PersonalDayShareData }

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>((props, ref) => {
  if (props.variant === 'compatibility') {
    const { selfName, partnerName, compatibility } = props.data
    const verdict = verdictForScore(compatibility.total, compatibility.max)
    return (
      <div ref={ref}>
        <CardShell eyebrow="Numerology Compatibility">
          <p className="font-display text-2xl italic leading-tight">
            {selfName} <span className="text-fixed-dark-ink/50">&amp;</span> {partnerName}
          </p>
          <p className="mt-4 font-display text-5xl">{verdict.headline}</p>
          <p className="mt-3 text-fixed-dark-ink/70">{verdict.blurb}</p>

          <div className="mt-10 space-y-4">
            {compatibility.dimensions.map((d) => (
              <div key={d.key} className="flex items-center justify-between border-b border-fixed-dark-ink/15 pb-3">
                <span className="text-sm uppercase tracking-wide text-fixed-dark-ink/60">{d.label}</span>
                <span className="nums-tabular text-lg">
                  {d.valueA} <span className="text-fixed-dark-ink/40">·</span> {d.valueB}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-8 font-display text-6xl">
            {compatibility.total}
            <span className="text-3xl text-fixed-dark-ink/50">/{compatibility.max}</span>
          </p>
        </CardShell>
      </div>
    )
  }

  const { dateLabel, value, isMaster, title, blurb } = props.data
  return (
    <div ref={ref}>
      <CardShell eyebrow={`Today's Numerology · ${dateLabel}`}>
        <p className="text-sm uppercase tracking-wide text-fixed-dark-ink/60">Personal Day</p>
        <p className="mt-2 font-display text-8xl">{value}</p>
        {isMaster && <p className="mt-2 text-sm uppercase tracking-wide text-fixed-dark-ink/70">Master Number</p>}
        <p className="mt-6 font-display text-3xl">{title}</p>
        <p className="mt-3 text-fixed-dark-ink/70">{blurb}</p>
      </CardShell>
    </div>
  )
})
ShareCard.displayName = 'ShareCard'

export default ShareCard
