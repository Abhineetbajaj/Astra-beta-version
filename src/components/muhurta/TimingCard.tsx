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
import { Badge } from '@/components/ui/Badge'
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

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-ink-muted">
          <Clock className="size-4" strokeWidth={1.75} />
          <span className="text-xs font-medium uppercase tracking-wide">Today's Timing</span>
        </div>
        {timing.current && (
          <Badge variant={timing.current.auspicious ? 'accent' : 'neutral'}>
            {timing.current.name} now
          </Badge>
        )}
      </div>

      <div
        className={cn(
          'mt-3 flex items-center justify-between rounded-xl border px-3.5 py-3',
          rahuActive ? 'border-negative/40 bg-negative/5' : 'border-line',
        )}
      >
        <div className="flex items-center gap-2">
          {rahuActive && <AlertTriangle className="size-4 shrink-0 text-negative" strokeWidth={1.75} />}
          <div>
            <p className="text-sm font-medium text-ink">Rahu Kaal</p>
            <p className="text-xs text-ink-faint">
              {formatTime(timing.rahu.start)} – {formatTime(timing.rahu.end)}
              {rahuActive && ' · active now'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-lg border border-line px-2.5 py-2">
          <p className="text-ink-faint">Yamaganda</p>
          <p className="nums-tabular mt-0.5 text-ink">
            {formatTime(timing.yama.start)}–{formatTime(timing.yama.end)}
          </p>
        </div>
        <div className="rounded-lg border border-line px-2.5 py-2">
          <p className="text-ink-faint">Gulika Kaal</p>
          <p className="nums-tabular mt-0.5 text-ink">
            {formatTime(timing.gulika.start)}–{formatTime(timing.gulika.end)}
          </p>
        </div>
        <div className="rounded-lg border border-accent/30 bg-accent-soft px-2.5 py-2">
          <p className="text-accent-strong">Abhijit Muhurta</p>
          <p className="nums-tabular mt-0.5 text-ink">
            {formatTime(timing.abhijit.start)}–{formatTime(timing.abhijit.end)}
          </p>
        </div>
        <div className="rounded-lg border border-line px-2.5 py-2">
          <p className="text-ink-faint">Current Hora</p>
          <p className="mt-0.5 text-ink">{timing.hora?.planet ?? '—'}</p>
        </div>
      </div>

      {timing.current && (
        <p className="mt-3 text-xs text-ink-faint">{CHOGHADIYA_BLURBS[timing.current.name]}</p>
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
