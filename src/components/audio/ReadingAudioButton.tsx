// "Listen" control for an already-generated reading. Calls the get-reading-audio edge function,
// which narrates the reading server-side and returns MP3 bytes — the Rumik key never reaches the
// browser, and the browser never talks to Rumik.
//
// Uses a direct authenticated fetch rather than the shared callEdgeFunction helper: that helper
// wraps supabase-js's functions.invoke, which is built around JSON responses, and this endpoint
// returns binary. Everything else in the app keeps using callEdgeFunction.
//
// Nothing is stored. The audio lives as a Blob object URL for this page view only, so pause/resume
// and replay are free, while a reload genuinely re-requests it (and is subject to the server's
// per-day cap). Object URLs are revoked on unmount and whenever the reading changes.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Pause, Play, Volume2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { cn } from '@/lib/cn'

type PlayerState = 'idle' | 'preparing' | 'playing' | 'paused' | 'error' | 'limited'

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper'

const LABELS: Record<PlayerState, string> = {
  idle: 'Listen',
  preparing: 'Preparing…',
  playing: 'Pause',
  paused: 'Resume',
  error: 'Try again',
  limited: 'Listen',
}

interface ReadingAudioButtonProps {
  /** Must match the edge function's allow-list. */
  table: 'daily_readings' | 'numerology_daily_readings'
  readingId: string
  className?: string
}

export default function ReadingAudioButton({ table, readingId, className }: ReadingAudioButtonProps) {
  const [state, setState] = useState<PlayerState>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  // Bumped by every reset (unmount, or the reading changing). An in-flight request compares the id
  // it started with against this: if they differ it has been superseded, and it must not create an
  // Audio element or object URL that nothing is left around to clean up.
  const requestRef = useRef(0)

  const reset = useCallback(() => {
    requestRef.current += 1
    audioRef.current?.pause()
    audioRef.current = null
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  // A different reading means audio already in memory no longer matches what's on screen.
  useEffect(() => {
    reset()
    setState('idle')
    setMessage(null)
  }, [table, readingId, reset])

  useEffect(() => reset, [reset])

  async function prepareAndPlay() {
    const requestId = ++requestRef.current
    setState('preparing')
    setMessage(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('You need to be signed in to listen.')

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-reading-audio`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ table, id: readingId }),
      })

      if (requestRef.current !== requestId) return

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        const detail = typeof body?.error === 'string' ? body.error : 'Could not prepare the audio.'
        // The daily cap is an expected boundary, not a failure — it gets its own calm state.
        if (response.status === 429) {
          setState('limited')
          setMessage(detail)
          return
        }
        throw new Error(detail)
      }

      const blob = await response.blob()
      if (requestRef.current !== requestId) return

      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url

      const audio = new Audio(url)
      // Let the element drive state, so scrubbing or an interrupted play stays in sync.
      audio.addEventListener('play', () => setState('playing'))
      audio.addEventListener('pause', () => setState((s) => (s === 'playing' ? 'paused' : s)))
      audio.addEventListener('ended', () => setState('idle'))
      audioRef.current = audio

      await audio.play()
    } catch (err) {
      if (requestRef.current !== requestId) return
      setState('error')
      setMessage(err instanceof Error ? err.message : 'Could not prepare the audio.')
    }
  }

  function handleClick() {
    const audio = audioRef.current
    if (audio) {
      if (audio.paused) void audio.play()
      else audio.pause()
      return
    }
    void prepareAndPlay()
  }

  const Icon = state === 'preparing' ? Loader2 : state === 'playing' ? Pause : state === 'paused' ? Play : Volume2

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'preparing' || state === 'limited'}
        aria-label={state === 'idle' ? 'Listen to this reading' : LABELS[state]}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors',
          'hover:border-line-strong hover:text-ink disabled:cursor-default disabled:opacity-60 disabled:hover:border-line disabled:hover:text-ink-muted',
          FOCUS_RING,
        )}
      >
        <Icon className={cn('size-3.5', state === 'preparing' && 'animate-spin')} strokeWidth={1.75} />
        {LABELS[state]}
      </button>
      {message && (
        <p className={cn('max-w-xs text-center text-xs', state === 'error' ? 'text-negative' : 'text-ink-faint')}>
          {message}
        </p>
      )}
    </div>
  )
}
