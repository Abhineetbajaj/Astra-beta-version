import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Press-and-hold microphone capture. This is the only code in the app that touches getUserMedia or
 * MediaRecorder, so the lifecycle discipline lives here rather than being spread across the page.
 *
 * Two rules drive the implementation:
 *   1. The MediaStream's tracks are stopped the moment recording ends — otherwise the browser's
 *      recording indicator stays lit and the mic stays warm for the rest of the session.
 *   2. Exactly one recording can be in flight. A pointer that goes down twice, or a release that
 *      fires after the parent has already started processing, must not produce a second submission.
 *
 * Accessibility: pointer events cover mouse, touch and pen uniformly. Keyboard users get Space/Enter
 * as a hold — keydown starts, keyup stops — with the browser's auto-repeat suppressed.
 */

/** Ordered by preference; the first the browser can actually record is used. webm/opus is what
    Chrome, Edge and Firefox produce, mp4 is Safari's. Both are on the server's allow-list. */
const PREFERRED_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']

function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  for (const type of PREFERRED_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return null
}

/** Below this, the user tapped rather than held and there is no speech worth sending. */
const MIN_RECORDING_BYTES = 1024

interface VoiceControlProps {
  /** Receives the finished recording. The parent owns the upload and all conversation state. */
  onRecorded: (audio: Blob) => void
  onError: (message: string) => void
  /** True while the parent is busy (uploading, thinking, speaking) — blocks a new recording. */
  disabled: boolean
  recording: boolean
  onRecordingChange: (recording: boolean) => void
}

export default function VoiceControl({
  onRecorded,
  onError,
  disabled,
  recording,
  onRecordingChange,
}: VoiceControlProps) {
  const [supported, setSupported] = useState(true)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  /** Guards against a second start before the first has finished tearing down. */
  const busyRef = useRef(false)

  useEffect(() => {
    setSupported(typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && !!pickMimeType())
  }, [])

  /** Releases the microphone. Safe to call repeatedly. */
  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    recorderRef.current = null
  }, [])

  // Whatever happens — navigation, an error, a dropped pointer — the mic must not stay open.
  useEffect(() => releaseStream, [releaseStream])

  const start = useCallback(async () => {
    if (disabled || busyRef.current) return
    const mimeType = pickMimeType()
    if (!mimeType) {
      setSupported(false)
      onError("This browser can't record audio. You can type your question instead.")
      return
    }

    busyRef.current = true
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const chunks = chunksRef.current
        chunksRef.current = []
        releaseStream()
        busyRef.current = false
        onRecordingChange(false)

        const blob = new Blob(chunks, { type: mimeType })
        if (blob.size < MIN_RECORDING_BYTES) {
          onError("I couldn't catch that. Hold the button while you speak, then let go.")
          return
        }
        onRecorded(blob)
      }
      recorder.onerror = () => {
        chunksRef.current = []
        releaseStream()
        busyRef.current = false
        onRecordingChange(false)
        onError("Something went wrong while recording. Please try again.")
      }

      recorderRef.current = recorder
      recorder.start()
      onRecordingChange(true)
    } catch (err) {
      releaseStream()
      busyRef.current = false
      onRecordingChange(false)
      const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
      onError(
        denied
          ? 'Astra needs microphone access to hear you. Enable it in your browser settings, or type your question instead.'
          : "I couldn't start recording. Please try again, or type your question instead.",
      )
    }
  }, [disabled, onError, onRecorded, onRecordingChange, releaseStream])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    // `onstop` does the teardown; calling stop twice would be a no-op but the guard keeps intent clear.
    if (recorder && recorder.state === 'recording') recorder.stop()
  }, [])

  if (!supported) {
    return (
      <p className="max-w-xs text-center text-sm text-ink-muted">
        Voice isn't available in this browser — you can type your question below.
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={disabled}
        // Pointer events cover mouse, touch and pen with one code path. Capture keeps the release
        // event coming to this button even if the finger drifts off it mid-hold.
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          void start()
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault()
            void start()
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            stop()
          }
        }}
        // Stops the long-press text-selection / context menu on mobile.
        onContextMenu={(e) => e.preventDefault()}
        aria-label={recording ? 'Release to send your question' : 'Hold to speak to Astra'}
        className={cn(
          'touch-none select-none rounded-full transition-all duration-300 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
          'disabled:pointer-events-none disabled:opacity-40',
          recording
            ? 'size-20 scale-105 bg-accent text-accent-ink shadow-[0_18px_40px_-16px_color-mix(in_srgb,var(--color-accent)_70%,transparent)] sm:size-24'
            : 'size-20 bg-ink text-paper hover:-translate-y-0.5 hover:bg-ink/85 sm:size-24',
        )}
      >
        <Mic className="mx-auto size-7 sm:size-8" strokeWidth={1.75} />
      </button>
      <p className="text-sm text-ink-muted">{recording ? 'Release to send' : 'Hold to speak'}</p>
    </div>
  )
}
