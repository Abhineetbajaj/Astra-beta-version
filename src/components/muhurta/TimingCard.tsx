import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, Clock } from 'lucide-react'
import { sunriseUTC, sunsetUTC } from '@/astro-engine/sunTimes'
import {
  rahuKaal,
  yamaganda,
  gulikaKaal,
  choghadiyaForDay,
  choghadiyaForNight,
  currentChoghadiya,
  horasForVara,
  currentHora,
  abhijitMuhurta,
  CHOGHADIYA_BLURBS,
  type ChoghadiyaPeriod,
} from '@/astro-engine/muhurta'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function isNow(now: Date, start: Date, end: Date): boolean {
  return now >= start && now < end
}

function ChoghadiyaRow({ period, now }: { period: ChoghadiyaPeriod; now: Date }) {
  const active = isNow(now, period.start, period.end)
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm',
        active ? 'bg-accent-soft text-accent-strong' : 'text-ink-muted',
      )}
    >
      <span className="flex items-center gap-1.5">
        {period.name}
        {!period.auspicious && <span className="text-xs text-ink-faint">(avoid)</span>}
      </span>
      <span className="nums-tabular text-xs">
        {formatTime(period.start)}–{formatTime(period.end)}
      </span>
    </div>
  )
}

/**
 * A real horizontal timeline built entirely from already-computed period boundaries — no new
 * astrology logic, just a visualization of the same dayPeriods/nightPeriods/rahuKaal data the
 * rest of this card already renders as text. Percent math only; nothing fabricated.
 */
function DayTimeline({
  periods,
  rahu,
  now,
  spanStart,
  spanEnd,
}: {
  periods: ChoghadiyaPeriod[]
  rahu: { start: Date; end: Date }
  now: Date
  spanStart: Date
  spanEnd: Date
}) {
  const total = spanEnd.getTime() - spanStart.getTime()
  const pct = (d: Date) => Math.min(100, Math.max(0, ((d.getTime() - spanStart.getTime()) / total) * 100))
  const nowPct = pct(now)
  const rahuLeft = pct(rahu.start)
  const rahuWidth = pct(rahu.end) - rahuLeft

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
        Today's progression
      </p>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-paper-sunken">
        {periods.map((p, i) => (
          <div
            key={i}
            className={cn('absolute inset-y-0', p.auspicious ? 'bg-accent/30' : 'bg-ink/10')}
            style={{ left: `${pct(p.start)}%`, width: `${Math.max(0, pct(p.end) - pct(p.start))}%` }}
          />
        ))}
        {/* Rahu Kaal overlay — low-opacity, not alarming, but real: this is the one period the
            classical system marks as inauspicious, same as the primary card above. */}
        <div
          className="absolute inset-y-0 bg-negative/35"
          style={{ left: `${rahuLeft}%`, width: `${Math.max(0, rahuWidth)}%` }}
        />
        <div
          className="absolute inset-y-0 w-[2px] bg-ink"
          style={{ left: `${nowPct}%` }}
          title={`Now — ${formatTime(now)}`}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-ink-faint">
        <span>{formatTime(spanStart)}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-accent/60" /> Favorable
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-negative/60" /> Rahu Kaal
          </span>
        </span>
        <span>{formatTime(spanEnd)}</span>
      </div>
    </div>
  )
}

export default function TimingCard({ lat, lon }: { lat: number; lon: number }) {
  const [expanded, setExpanded] = useState(false)
  const now = useMemo(() => new Date(), [])

  const timing = useMemo(() => {
    const sunrise = sunriseUTC(now, lat, lon)
    const sunset = sunsetUTC(now, lat, lon)
    if (!sunrise || !sunset) return null

    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const nextSunrise = sunriseUTC(tomorrow, lat, lon)
    if (!nextSunrise) return null

    const weekday = sunrise.getUTCDay()
    const dayPeriods = choghadiyaForDay(sunrise, sunset, weekday)
    const nightPeriods = choghadiyaForNight(sunset, nextSunrise, weekday)
    const horas = horasForVara(sunrise, sunset, nextSunrise, weekday)

    return {
      sunrise,
      sunset,
      nextSunrise,
      rahu: rahuKaal(sunrise, sunset, weekday),
      yama: yamaganda(sunrise, sunset, weekday),
      gulika: gulikaKaal(sunrise, sunset, weekday),
      abhijit: abhijitMuhurta(sunrise, sunset),
      dayPeriods,
      nightPeriods,
      current: currentChoghadiya([...dayPeriods, ...nightPeriods], now),
      hora: currentHora(horas, now),
    }
  }, [now, lat, lon])

  // Polar-latitude edge case where the sun doesn't rise/set on this date — extremely rare for
  // Astra's actual user base, but fail with a clear message rather than silently showing nothing.
  if (!timing) {
    return (
      <Card>
        <p className="text-sm text-ink-muted">Today's timing couldn't be computed for this location.</p>
      </Card>
    )
  }

  const rahuActive = isNow(now, timing.rahu.start, timing.rahu.end)
  const SECONDARY = [
    { label: 'Yamaganda', start: timing.yama.start, end: timing.yama.end, accent: false },
    { label: 'Gulika Kaal', start: timing.gulika.start, end: timing.gulika.end, accent: false },
    { label: 'Abhijit Muhurta', start: timing.abhijit.start, end: timing.abhijit.end, accent: true },
  ] as const

  return (
    <Card interactive>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-ink-muted">
          <Clock className="size-4 text-accent" strokeWidth={1.75} />
          <span className="text-xs font-semibold uppercase tracking-[0.08em]">Today's Timing</span>
        </div>
        {timing.current && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent-strong">
            <span className="glow-breathe size-1.5 rounded-full bg-accent" aria-hidden="true" />
            {timing.current.name} now
          </span>
        )}
      </div>

      {/* PRIMARY: Rahu Kaal gets the visual weight the brief asks for — larger type, its own
          panel — while only turning warning-toned when it's genuinely active right now, same
          condition the card already used before this pass. */}
      <div
        className={cn(
          'mt-4 rounded-2xl border px-5 py-4 transition-colors duration-300',
          rahuActive ? 'border-negative/35 bg-negative/5' : 'border-line-strong bg-paper-raised/40',
        )}
      >
        <div className="flex items-center gap-2">
          {rahuActive && <AlertTriangle className="size-4 shrink-0 text-negative" strokeWidth={1.75} />}
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            Rahu Kaal{rahuActive && ' · Active now'}
          </p>
        </div>
        <p className="mt-1.5 font-display text-2xl text-ink">
          {formatTime(timing.rahu.start)} <span className="text-ink-faint">—</span> {formatTime(timing.rahu.end)}
        </p>
      </div>

      {/* SECONDARY: Yamaganda / Gulika Kaal / Abhijit Muhurta / current Hora, in a responsive grid. */}
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {SECONDARY.map((s) => (
          <div
            key={s.label}
            className={cn(
              'rounded-xl border px-3 py-2.5 transition-colors duration-200',
              s.accent
                ? 'border-accent/30 bg-accent-soft hover:border-accent/50'
                : 'border-line hover:border-line-strong',
            )}
          >
            <p className={cn('text-[10px] uppercase tracking-wide', s.accent ? 'text-accent-strong' : 'text-ink-faint')}>
              {s.label}
            </p>
            <p className="nums-tabular mt-0.5 text-sm text-ink">
              {formatTime(s.start)}–{formatTime(s.end)}
            </p>
          </div>
        ))}
        <div className="rounded-xl border border-line px-3 py-2.5 transition-colors duration-200 hover:border-line-strong">
          <p className="text-[10px] uppercase tracking-wide text-ink-faint">Current Hora</p>
          <p className="mt-0.5 text-sm text-ink">{timing.hora?.planet ?? '—'}</p>
        </div>
      </div>

      <div className="mt-5">
        <DayTimeline
          periods={[...timing.dayPeriods, ...timing.nightPeriods]}
          rahu={timing.rahu}
          now={now}
          spanStart={timing.sunrise}
          spanEnd={timing.nextSunrise}
        />
      </div>

      {timing.current && (
        <p className="mt-4 text-xs text-ink-faint">{CHOGHADIYA_BLURBS[timing.current.name]}</p>
      )}

      <button
        onClick={() => setExpanded((e) => !e)}
        className="mt-4 flex w-full items-center justify-between border-t border-line pt-3 text-sm text-ink-muted hover:text-ink"
      >
        Full Choghadiya table
        <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} strokeWidth={1.75} />
      </button>

      {expanded && (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint">
              Day ({formatTime(timing.sunrise)}–{formatTime(timing.sunset)})
            </p>
            <div className="space-y-0.5">
              {timing.dayPeriods.map((p, i) => (
                <ChoghadiyaRow key={i} period={p} now={now} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint">Night</p>
            <div className="space-y-0.5">
              {timing.nightPeriods.map((p, i) => (
                <ChoghadiyaRow key={i} period={p} now={now} />
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
