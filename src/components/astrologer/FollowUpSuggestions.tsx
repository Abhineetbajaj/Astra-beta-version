/**
 * Suggested next questions. These are prompts the user chooses — selecting one submits it as their
 * own question, exactly as if they had typed it. Nothing here is ever rendered as though the user
 * already asked it.
 */
interface FollowUpSuggestionsProps {
  suggestions: readonly string[]
  onSelect: (question: string) => void
  disabled: boolean
  label?: string
}

export default function FollowUpSuggestions({
  suggestions,
  onSelect,
  disabled,
  label,
}: FollowUpSuggestionsProps) {
  if (suggestions.length === 0) return null

  return (
    <div className="space-y-2.5">
      {label && <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(s)}
            className="rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-muted transition-colors hover:border-accent/50 hover:text-ink disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
