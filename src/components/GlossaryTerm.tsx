import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import { GLOSSARY } from '@/data/glossary'

interface GlossaryTermProps {
  /** Glossary key, e.g. "saturn", "house-8", "sade sati" — matched case-insensitively. */
  term: string
  children: ReactNode
  /** Set false when wrapping content that already has its own affordance (e.g. a Badge pill). */
  underline?: boolean
}

/**
 * Wraps jargon with a tap-to-define popover. Renders plain (unwrapped) children if the term
 * isn't in the glossary. Deliberately a <span role="button"> rather than a real <button> — this
 * gets nested inside other interactive elements (DashaTimeline's row-toggle button, table cells,
 * badges), and a real <button> nested in a <button> is invalid HTML that breaks click handling.
 */
export default function GlossaryTerm({ term, children, underline = true }: GlossaryTermProps) {
  const definition = GLOSSARY[term.toLowerCase()]
  if (!definition) return <>{children}</>

  function stopAndKeyActivate(e: KeyboardEvent<HTMLSpanElement>) {
    e.stopPropagation()
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.currentTarget.click()
    }
  }

  function stopPropagation(e: MouseEvent<HTMLSpanElement>) {
    e.stopPropagation()
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          onClick={stopPropagation}
          onKeyDown={stopAndKeyActivate}
          className={
            underline
              ? 'cursor-pointer underline decoration-dotted decoration-ink-faint underline-offset-2 hover:decoration-accent focus-visible:outline-none focus-visible:decoration-accent'
              : 'cursor-pointer focus-visible:outline-none'
          }
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent>{definition}</PopoverContent>
    </Popover>
  )
}
