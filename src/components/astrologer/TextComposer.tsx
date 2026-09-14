import { useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * The typed fallback. Deliberately secondary to the microphone — a single-line-height textarea that
 * grows with content rather than a large composer competing with the voice control for attention.
 */
interface TextComposerProps {
  onSubmit: (question: string) => void
  disabled: boolean
}

export default function TextComposer({ onSubmit, disabled }: TextComposerProps) {
  const [draft, setDraft] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  function send() {
    const question = draft.trim()
    if (!question || disabled) return
    setDraft('')
    if (ref.current) ref.current.style.height = 'auto'
    onSubmit(question)
  }

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-line bg-paper-raised/60 px-4 py-2.5 focus-within:border-line-strong">
      <textarea
        ref={ref}
        rows={1}
        value={draft}
        disabled={disabled}
        placeholder="Ask anything about your chart…"
        onChange={(e) => {
          setDraft(e.target.value)
          // Grow to fit, capped so the composer never dominates the page.
          e.target.style.height = 'auto'
          e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send()
          }
        }}
        className="max-h-[140px] flex-1 resize-none bg-transparent py-1 text-sm text-ink placeholder:text-ink-faint focus:outline-none disabled:opacity-50"
      />
      <button
        type="button"
        onClick={send}
        disabled={disabled || !draft.trim()}
        aria-label="Send question"
        className={cn(
          'mb-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
          draft.trim() && !disabled
            ? 'bg-ink text-paper hover:bg-ink/85'
            : 'bg-line text-ink-faint',
        )}
      >
        <ArrowUp className="size-4" strokeWidth={2} />
      </button>
    </div>
  )
}
