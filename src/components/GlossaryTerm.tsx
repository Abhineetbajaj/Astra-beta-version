import type { ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import { GLOSSARY } from '@/data/glossary'

interface GlossaryTermProps {
  /** Glossary key, e.g. "saturn", "house-8", "sade sati" — matched case-insensitively. */
  term: string
  children: ReactNode
  /** Set false when wrapping content that already has its own affordance (e.g. a Badge pill). */
  underline?: boolean
}

/** Wraps jargon with a tap-to-define popover. Renders plain (unwrapped) children if the term isn't in the glossary. */
export default function GlossaryTerm({ term, children, underline = true }: GlossaryTermProps) {
  const definition = GLOSSARY[term.toLowerCase()]
  if (!definition) return <>{children}</>

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={
            underline
              ? 'underline decoration-dotted decoration-ink-faint underline-offset-2 hover:decoration-accent focus-visible:outline-none focus-visible:decoration-accent'
              : 'focus-visible:outline-none'
          }
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent>{definition}</PopoverContent>
    </Popover>
  )
}
