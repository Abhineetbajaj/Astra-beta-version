import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Heart, Check } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { logMeditationPlay, toggleMeditationFavorite } from '@/lib/useMeditationTracks'
import type { MeditationTrackRow } from '@/types/db'

/** Exported for reuse by Mind's leading "today" card — same "why this, for me" line, one place. */
export function caption(track: MeditationTrackRow): string | null {
  if (track.need_tag && track.planet_context) return `Framed through ${track.planet_context}`
  if (track.panchang_event) return `In observance of ${track.panchang_event}`
  if (track.category === 'mantra' && track.planet_context) return `${track.planet_context} beej mantra`
  if (track.planet_context) return `Grounded in your ${track.planet_context} placement`
  return null
}

export default function TrackReader({
  track,
  userId,
  onClose,
}: {
  track: MeditationTrackRow
  userId: string
  onClose: () => void
}) {
  const [favorited, setFavorited] = useState(false)
  const [reflected, setReflected] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    logMeditationPlay(userId, track.id, false)
  }, [userId, track.id])

  async function handleFavorite() {
    const next = !favorited
    setFavorited(next)
    await toggleMeditationFavorite(userId, track.id, next)
  }

  async function handleReflected() {
    setReflected(true)
    await logMeditationPlay(userId, track.id, true)
  }

  const trackCaption = caption(track)
  const paragraphs = track.script_text.split('\n').filter(Boolean)
  // Opens with the first two paragraphs; the rest is one tap away. Nothing is truncated or hidden
  // permanently — the same full script, just not delivered all at once.
  const hasMore = paragraphs.length > 2
  const visibleParagraphs = hasMore && !expanded ? paragraphs.slice(0, 2) : paragraphs

  return (
    <Card className="border-mind/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          {/* The caption is a real, already-computed line ("Framed through Saturn") — promoted to
              an eyebrow above the title so the reader gets the "why this, for me" context first,
              rather than finding it as a footnote underneath. */}
          {trackCaption && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-mind-strong">{trackCaption}</p>
          )}
          <h2 className={cn('font-display text-xl', trackCaption && 'mt-1')}>{track.title}</h2>
        </div>
        <button onClick={onClose} className="rounded-full p-1.5 text-ink-faint hover:bg-paper-raised hover:text-ink">
          <X className="size-4" strokeWidth={1.75} />
        </button>
      </div>

      <div className="mt-5 max-w-2xl space-y-3">
        {visibleParagraphs.map((paragraph, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.15 }}
            className="leading-relaxed text-ink-muted"
          >
            {paragraph}
          </motion.p>
        ))}
        {hasMore && !expanded && (
          <button onClick={() => setExpanded(true)} className="text-sm text-ink-muted underline hover:text-ink">
            Continue reading
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3 border-t border-line pt-4">
        <Button variant={reflected ? 'outline' : 'accent'} size="sm" onClick={handleReflected} disabled={reflected}>
          <Check className="size-4" strokeWidth={1.75} />
          {reflected ? 'Marked as reflected on' : 'Mark as reflected on'}
        </Button>
        <button
          onClick={handleFavorite}
          className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
          title={favorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={favorited ? 'size-4 fill-mind text-mind' : 'size-4'} strokeWidth={1.75} />
          {favorited ? 'Favorited' : 'Favorite'}
        </button>
      </div>
    </Card>
  )
}
