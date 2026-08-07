import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Heart, Check } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { logMeditationPlay, toggleMeditationFavorite } from '@/lib/useMeditationTracks'
import type { MeditationTrackRow } from '@/types/db'

function caption(track: MeditationTrackRow): string | null {
  if (track.need_tag) return `Framed through ${track.planet_context}`
  if (track.panchang_event) return `In observance of ${track.panchang_event}`
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

  return (
    <Card className="border-accent/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl">{track.title}</h2>
          {trackCaption && <p className="mt-1 text-sm text-ink-faint">{trackCaption}</p>}
        </div>
        <button onClick={onClose} className="rounded-full p-1.5 text-ink-faint hover:bg-paper-raised hover:text-ink">
          <X className="size-4" strokeWidth={1.75} />
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {paragraphs.map((paragraph, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.15 }}
            className="text-ink-muted"
          >
            {paragraph}
          </motion.p>
        ))}
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
          <Heart className={favorited ? 'size-4 fill-accent text-accent' : 'size-4'} strokeWidth={1.75} />
          {favorited ? 'Favorited' : 'Favorite'}
        </button>
      </div>
    </Card>
  )
}
