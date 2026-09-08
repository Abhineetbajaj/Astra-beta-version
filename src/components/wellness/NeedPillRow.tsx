// The "what do you need right now?" pill row — first built for the Wellness front door
// (WellnessFrontDoor.tsx), extracted here now that Mind needs the exact same interaction over the
// exact same real NEED_TAGS. Matches this project's own established rule: reuse a pattern inline
// until a second real use case appears, then extract — not before. Keeps both call sites visually
// and behaviorally identical by construction, rather than two hand-copied JSX blocks drifting apart.
import { Lock } from 'lucide-react'
import { NEED_TAGS } from '@/data/meditationCategories'
import { useAccessibleLibraryKeys } from '@/lib/useMeditationTracks'

export default function NeedPillRow({ onSelect }: { onSelect: (key: string, label: string) => void }) {
  const { keys: accessibleKeys } = useAccessibleLibraryKeys()

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-x-visible">
      {NEED_TAGS.map((need) => (
        <button
          key={need.key}
          onClick={() => onSelect(need.key, need.label)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-mind/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          {need.humanLabel ?? need.label}
          {!accessibleKeys.has(need.key) && <Lock className="size-3 text-ink-faint" strokeWidth={1.75} />}
        </button>
      ))}
    </div>
  )
}
