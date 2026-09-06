import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { DashaPeriod } from '@/astro-engine/types'
import { PLANET_ABBR } from '@/components/chart/glyphs'
import GlossaryTerm from '@/components/GlossaryTerm'
import { cn } from '@/lib/cn'

interface DashaTimelineProps {
  dashas: DashaPeriod[]
  now?: Date
}

function formatYear(date: Date): string {
  return date.getUTCFullYear().toString()
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function DashaTimeline({ dashas, now = new Date() }: DashaTimelineProps) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const start = dashas[0].startDate.getTime()
  const end = dashas[dashas.length - 1].endDate.getTime()
  const totalSpan = end - start

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full border border-line">
        {dashas.map((d, i) => {
          const width = ((d.endDate.getTime() - d.startDate.getTime()) / totalSpan) * 100
          const isCurrent = now >= d.startDate && now < d.endDate
          return (
            <div
              key={i}
              style={{ width: `${width}%` }}
              className={cn('h-full border-r border-paper', isCurrent ? 'bg-accent' : 'bg-paper-sunken')}
              title={`${d.lord} · ${formatYear(d.startDate)}–${formatYear(d.endDate)}`}
            />
          )
        })}
      </div>

      <ul className="mt-4 divide-y divide-line">
        {dashas.map((d, i) => {
          const isCurrent = now >= d.startDate && now < d.endDate
          const isOpen = expanded === i
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : i)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-3 text-left transition-colors duration-150 -mx-2 hover:bg-paper-raised/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full text-xs font-semibold nums-tabular',
                      isCurrent
                        ? 'bg-accent text-accent-ink'
                        : 'bg-paper-raised text-ink-muted',
                    )}
                  >
                    {PLANET_ABBR[d.lord]}
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {d.lord} <GlossaryTerm term="mahadasha">Mahadasha</GlossaryTerm>
                    </p>
                    <p className="nums-tabular text-xs text-ink-muted">
                      {formatDate(d.startDate)} – {formatDate(d.endDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isCurrent && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-strong">
                      Current
                    </span>
                  )}
                  <ChevronDown
                    className={cn('size-4 text-ink-faint transition-transform', isOpen && 'rotate-180')}
                  />
                </div>
              </button>

              {isOpen && d.children && (
                <ul className="mb-3 space-y-1.5 rounded-xl bg-paper-raised/60 p-3">
                  {d.children.map((antar, j) => {
                    const antarCurrent = now >= antar.startDate && now < antar.endDate
                    return (
                      <li
                        key={j}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs',
                          antarCurrent && 'bg-accent-soft text-accent-strong',
                        )}
                      >
                        <span>
                          {d.lord}–{antar.lord} <GlossaryTerm term="antardasha">Antardasha</GlossaryTerm>
                        </span>
                        <span className="nums-tabular text-ink-muted">
                          {formatDate(antar.startDate)} – {formatDate(antar.endDate)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
