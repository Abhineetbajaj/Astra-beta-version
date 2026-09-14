import { Fragment, useState, type ReactNode } from 'react'
import { Pause, Play, RotateCcw, Volume2 } from 'lucide-react'
import { highlightGlossaryTerms } from '@/lib/highlightGlossaryTerms'
import { cn } from '@/lib/cn'

/**
 * One of Astra's answers. Deliberately does no parsing: the text is split on blank lines into
 * paragraphs and nothing more. No headings are inferred, no "Best move"/"Timing" sections are
 * extracted — inventing structure the answer doesn't contain would misrepresent it, and the exact
 * string rendered here is the same one get-voice-audio narrates from the stored row.
 *
 * Long answers collapse after a few paragraphs using the app's established disclosure pattern
 * ("Read the full answer" / "Show less", as in BodyPillar and TrackReader).
 */

/** Paragraphs shown before collapsing. Chosen so a typical 3-4 paragraph reply never collapses. */
const COLLAPSE_AFTER = 3

/** `**bold**` only. The model emits it around planet, dasha and yoga names, and without this the
    asterisks render literally — which is what users were seeing. Deliberately one pattern rather
    than a markdown dependency: no HTML is ever constructed, so there is nothing to sanitise and
    no dangerouslySetInnerHTML. Any other markdown syntax passes through untouched, as before. */
const BOLD_PATTERN = /\*\*(.+?)\*\*/g

/** Glossary-highlights `text`, honouring **bold** spans. Each highlight call is wrapped in a keyed
    Fragment because highlightGlossaryTerms restarts its own keys at 0 on every call. */
function renderInline(text: string, keyPrefix: string, seen: Set<string>): ReactNode[] {
  const out: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let i = 0
  const regex = new RegExp(BOLD_PATTERN.source, 'g')

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(
        <Fragment key={`${keyPrefix}-t${i}`}>
          {highlightGlossaryTerms(text.slice(lastIndex, match.index), { scope: 'concise', seen })}
        </Fragment>,
      )
    }
    out.push(
      <strong key={`${keyPrefix}-b${i}`} className="font-semibold text-ink">
        {highlightGlossaryTerms(match[1], { scope: 'concise', seen })}
      </strong>,
    )
    lastIndex = match.index + match[0].length
    i++
  }

  if (lastIndex < text.length) {
    out.push(
      <Fragment key={`${keyPrefix}-t${i}`}>
        {highlightGlossaryTerms(text.slice(lastIndex), { scope: 'concise', seen })}
      </Fragment>,
    )
  }
  return out
}

export type SpeechState = 'idle' | 'preparing' | 'playing' | 'paused' | 'unavailable'

interface AssistantAnswerProps {
  answer: string
  speech: SpeechState
  /** Absent when this answer predates playback support or its audio can't be produced. */
  onPlay?: () => void
  onPause?: () => void
  onReplay?: () => void
  /** Calm, non-alarming note — e.g. the listen limit. Not an error. */
  notice?: string | null
  muted?: boolean
}

export default function AssistantAnswer({
  answer,
  speech,
  onPlay,
  onPause,
  onReplay,
  notice,
  muted = false,
}: AssistantAnswerProps) {
  const [expanded, setExpanded] = useState(false)

  const paragraphs = answer.split(/\n+/).map((p) => p.trim()).filter(Boolean)
  const collapsible = paragraphs.length > COLLAPSE_AFTER
  const visible = collapsible && !expanded ? paragraphs.slice(0, COLLAPSE_AFTER) : paragraphs

  // One memory for the whole answer, so a term is defined on first mention and reads as plain prose
  // everywhere after. Rebuilt each render, which is what keeps it in sync with `visible`.
  const seenTerms = new Set<string>()

  return (
    <div className={cn('space-y-3', muted && 'opacity-60')}>
      <div className={cn('space-y-3 text-[15px] leading-relaxed', muted ? 'text-ink-muted' : 'text-ink')}>
        {visible.map((p, i) => (
          <p key={i}>{renderInline(p, `p${i}`, seenTerms)}</p>
        ))}
      </div>

      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="rounded text-sm text-ink-muted underline underline-offset-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          {expanded ? 'Show less' : 'Read the full answer'}
        </button>
      )}

      {!muted && (onPlay || onPause || onReplay) && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {speech === 'playing' ? (
            <AudioControl icon={Pause} label="Pause" onClick={onPause} />
          ) : speech === 'paused' ? (
            <AudioControl icon={Play} label="Resume" onClick={onPlay} />
          ) : speech === 'preparing' ? (
            <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
              <span
                aria-hidden="true"
                className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
              />
              Preparing Astra's voice…
            </span>
          ) : speech === 'unavailable' ? null : (
            <AudioControl icon={Volume2} label="Listen" onClick={onPlay} />
          )}

          {(speech === 'playing' || speech === 'paused') && onReplay && (
            <AudioControl icon={RotateCcw} label="Replay" onClick={onReplay} />
          )}
        </div>
      )}

      {notice && <p className="text-sm text-ink-faint">{notice}</p>}
    </div>
  )
}

function AudioControl({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Volume2
  label: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-muted transition-colors hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
    >
      <Icon className="size-3.5" strokeWidth={1.75} />
      {label}
    </button>
  )
}
