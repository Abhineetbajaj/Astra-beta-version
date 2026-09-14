// Astra AI — the voice-first astrologer. Speak or type a question; Astra answers from your real
// chart and reads the answer aloud.
//
// This page owns the entire conversation state machine and every backend call. The child components
// are presentational: one state drives the orb, the microphone, the status copy and the controls,
// so they can never disagree about what's happening.
//
// Two backend endpoints, both already in production and unchanged by this page:
//   voice-chat      multipart audio  -> { transcript, answer, messageId }
//   get-voice-audio { messageId }    -> audio/mpeg
// Both need a direct authenticated fetch rather than callEdgeFunction — one sends binary, the other
// receives it, and that helper is built around JSON. Typed questions use callEdgeFunction('chat').
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import { callEdgeFunction } from '@/lib/edgeFunctions'
import { type OrbState } from '@/components/astrologer/AstraOrb'
import AstraField from '@/components/astrologer/AstraField'
import HeroVisual from '@/components/astrologer/HeroVisual'
import VoiceControl from '@/components/astrologer/VoiceControl'
import ConversationView, { type Turn } from '@/components/astrologer/ConversationView'
import TextComposer from '@/components/astrologer/TextComposer'
import FollowUpSuggestions from '@/components/astrologer/FollowUpSuggestions'
import type { SpeechState } from '@/components/astrologer/AssistantAnswer'
import type { ChatMessageRow } from '@/types/db'

/** Reserved for "Ask Astra about this" entry points (chart, dasha, house, numerology, wellness,
    founder). Declared so the contract is stable; nothing constructs one yet. */
export interface AstraContext {
  source: 'chart' | 'dasha' | 'house' | 'numerology' | 'wellness' | 'founder'
  ref: string
  label: string
}

type PageState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error'

const OPENING_TOPICS = ['Career', 'Money', 'Love', 'Timing'] as const

/** Natural-language openers shown beneath the topic chips. Selecting one submits it as the user's
    own question through the same text path — nothing is ever rendered as though they asked it. */
const OPENING_PROMPTS = [
  "What's favourable right now?",
  'What is this phase teaching me?',
  'What should I avoid?',
] as const

const FOLLOW_UPS = [
  'What about the next 6 months?',
  'What should I avoid?',
  'Is this a good time to change jobs?',
  'What is my current dasha?',
] as const

const STATUS_COPY: Record<PageState, string | null> = {
  idle: null,
  listening: 'Listening…',
  processing: 'Reading your chart…',
  speaking: 'Speaking',
  error: null,
}

/** Topic buttons submit a real question, not a bare keyword. */
const TOPIC_QUESTION: Record<string, string> = {
  Career: 'What does my chart say about my career right now?',
  Money: 'What does my chart say about money and finances right now?',
  Love: 'What does my chart say about my relationships right now?',
  Timing: "What's favourable for me right now, and what should I wait on?",
}

export default function AstrologerPage() {
  const [state, setState] = useState<PageState>('idle')
  const [recording, setRecording] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [error, setError] = useState<string | null>(null)
  const [speech, setSpeech] = useState<SpeechState>('idle')
  const [speechNotice, setSpeechNotice] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  /** Bumped whenever a turn is superseded, so a late response can't overwrite newer state. */
  const requestRef = useRef(0)

  const releaseAudio = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  useEffect(() => releaseAudio, [releaseAudio])

  /** Authenticated fetch against an edge function. Returns the raw Response so callers can read
      JSON or binary as needed — the shared helper can do neither for these two endpoints. */
  const callFunction = useCallback(async (name: string, init: { body: BodyInit; json?: boolean }) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('signed-out')

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    }
    // FormData must set its own Content-Type so the browser can add the multipart boundary.
    if (init.json) headers['Content-Type'] = 'application/json'

    return fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers,
      body: init.body,
    })
  }, [])

  /** Fetches and plays Astra's answer. Failures here are soft: the text is already on screen, so a
      voice problem should never read as the answer having failed. */
  const speak = useCallback(
    async (messageId: string, requestId: number) => {
      setSpeech('preparing')
      setSpeechNotice(null)
      try {
        const res = await callFunction('get-voice-audio', {
          body: JSON.stringify({ messageId }),
          json: true,
        })
        if (requestRef.current !== requestId) return

        if (!res.ok) {
          setSpeech('idle')
          setState('idle')
          if (res.status === 429) {
            setSpeechNotice("You've listened to this answer a few times. Ask Astra something new to continue.")
          } else {
            setSpeechNotice("I couldn't play that just now. The answer is above.")
          }
          return
        }

        const blob = await res.blob()
        if (requestRef.current !== requestId) return

        releaseAudio()
        const url = URL.createObjectURL(blob)
        objectUrlRef.current = url

        const audio = new Audio(url)
        audio.addEventListener('play', () => {
          setSpeech('playing')
          setState('speaking')
        })
        audio.addEventListener('pause', () => setSpeech((s) => (s === 'playing' ? 'paused' : s)))
        audio.addEventListener('ended', () => {
          setSpeech('idle')
          setState('idle')
        })
        audioRef.current = audio
        await audio.play()
      } catch {
        if (requestRef.current !== requestId) return
        setSpeech('idle')
        setState('idle')
        setSpeechNotice("I couldn't play that just now. The answer is above.")
      }
    },
    [callFunction, releaseAudio],
  )

  /** Shared tail for both voice and typed turns. */
  const completeTurn = useCallback(
    (requestId: number, question: string, answer: string, messageId: string | null) => {
      if (requestRef.current !== requestId) return
      setTurns((t) => [...t, { id: messageId ?? `turn-${requestId}`, question, answer, messageId }])
      if (messageId) {
        void speak(messageId, requestId)
      } else {
        setState('idle')
      }
    },
    [speak],
  )

  const failTurn = useCallback((requestId: number, message: string) => {
    if (requestRef.current !== requestId) return
    setState('error')
    setError(message)
  }, [])

  /** Voice turn: recording -> voice-chat -> answer -> speak. */
  const askByVoice = useCallback(
    async (audio: Blob) => {
      releaseAudio()
      setSpeech('idle')
      setSpeechNotice(null)
      setError(null)
      setState('processing')
      const requestId = ++requestRef.current

      try {
        const form = new FormData()
        // The server reads the `audio` field and validates its MIME type.
        form.append('audio', audio, 'question.webm')

        const res = await callFunction('voice-chat', { body: form })
        if (requestRef.current !== requestId) return

        if (!res.ok) {
          const body = await res.json().catch(() => null)
          const detail = typeof body?.error === 'string' ? body.error : null
          failTurn(
            requestId,
            res.status === 422
              ? "I couldn't catch that. Try again."
              : res.status === 429
                ? 'Astra needs a short break. Please try again in a moment.'
                : res.status === 409
                  ? detail ?? 'Add your birth details so Astra can read your chart.'
                  : "I couldn't reach Astra right now. Please try again.",
          )
          return
        }

        const { transcript, answer, messageId } = await res.json()
        completeTurn(requestId, transcript, answer, messageId ?? null)
      } catch (err) {
        failTurn(
          requestId,
          err instanceof Error && err.message === 'signed-out'
            ? 'Please sign in again to talk to Astra.'
            : "I couldn't reach Astra right now. Please try again.",
        )
      }
    },
    [callFunction, completeTurn, failTurn, releaseAudio],
  )

  /** Typed turn: reuses the existing /chat contract, so reasoning is never duplicated here. */
  const askByText = useCallback(
    async (question: string) => {
      releaseAudio()
      setSpeech('idle')
      setSpeechNotice(null)
      setError(null)
      setState('processing')
      const requestId = ++requestRef.current

      try {
        const { message } = await callEdgeFunction<{ message: ChatMessageRow }>('chat', { message: question })
        completeTurn(requestId, question, message.content, message.id)
      } catch (err) {
        const detail = err instanceof Error ? err.message : ''
        failTurn(
          requestId,
          detail.toLowerCase().includes('birth profile')
            ? detail
            : "I couldn't reach Astra right now. Please try again.",
        )
      }
    },
    // callEdgeFunction is a module import, not reactive state, so it isn't a dependency.
    [completeTurn, failTurn, releaseAudio],
  )

  const busy = state === 'processing' || state === 'listening'
  const orbState: OrbState = recording ? 'listening' : (state as OrbState)
  const status = STATUS_COPY[recording ? 'listening' : state]
  const hasConversation = turns.length > 0

  return (
    <div className="relative mx-auto max-w-2xl">
      {/* Cinematic layer, behind everything and load-deferred. Only shown before a conversation
          starts — once there are answers to read, the page belongs to the text. */}
      {!hasConversation && <HeroVisual className="h-[78vh] min-h-[560px]" />}
      {/* 01 — ARRIVAL. The headline leads, the field answers it. Both retreat once there's a
          conversation to read, so the answer becomes the page. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center"
      >
        {!hasConversation && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
              Personal astrologer
            </p>
            <h1 className="mt-5 font-display leading-[0.95] tracking-tight text-ink [font-size:clamp(2.75rem,11vw,4.5rem)]">
              Your chart.
              <br />
              Your questions.
            </h1>
            <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-ink-muted sm:max-w-sm">
              Talk to Astra about what's shaping your life.
            </p>
          </>
        )}

        {/* 02 — THE FIELD. The microphone lives inside the system, not beside it. */}
        <AstraField state={orbState} compact={hasConversation} className={hasConversation ? "mt-0" : "mt-6"}>
          <VoiceControl
            onRecorded={askByVoice}
            onError={(message) => {
              setState('error')
              setError(message)
            }}
            disabled={busy || state === 'speaking'}
            recording={recording}
            onRecordingChange={(rec) => {
              setRecording(rec)
              // Starting to speak is a new attempt: drop whatever failed last time so the user
              // isn't talking over a stale error message.
              if (rec) {
                setError(null)
                setState((s) => (s === 'error' ? 'idle' : s))
              }
            }}
          />
        </AstraField>

        {status && (
          <motion.p
            key={status}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-sm text-ink-muted"
          >
            {status}
          </motion.p>
        )}

        {/* Bound to the state machine, not just to `error` being non-null. Previously a message
            could outlive the state that produced it and linger over an otherwise healthy page. */}
        {state === 'error' && error && (
          <div className="mt-5 w-full rounded-2xl border border-negative/30 bg-negative/5 px-4 py-3">
            <p className="text-sm text-negative">{error}</p>
            <button
              onClick={() => {
                setError(null)
                setState('idle')
              }}
              className="mt-1.5 rounded text-sm text-ink-muted underline underline-offset-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Dismiss
            </button>
          </div>
        )}
      </motion.div>

      {hasConversation && (
        <div className="mt-6 border-t border-line pt-7">
          <ConversationView
            turns={turns}
            speech={speech}
            speechNotice={speechNotice}
            onPlay={() => {
              const audio = audioRef.current
              if (audio) void audio.play()
              else {
                const last = turns[turns.length - 1]
                if (last?.messageId) void speak(last.messageId, requestRef.current)
              }
            }}
            onPause={() => audioRef.current?.pause()}
            onReplay={() => {
              const audio = audioRef.current
              if (!audio) return
              audio.currentTime = 0
              void audio.play()
            }}
          />
        </div>
      )}

      <div className="mt-10 space-y-5">
        <FollowUpSuggestions
          suggestions={hasConversation ? FOLLOW_UPS : OPENING_TOPICS.map((t) => t)}
          onSelect={(s) => void askByText(hasConversation ? s : (TOPIC_QUESTION[s] ?? s))}
          disabled={busy || state === 'speaking'}
          label={hasConversation ? 'Ask a follow-up' : 'Try asking'}
        />

        {/* A second, quieter tier: full questions rather than categories, for anyone who would
            rather pick a thought than a topic. Same real text path as everything else. */}
        {!hasConversation && (
          <div className="flex flex-col items-start gap-1.5">
            {OPENING_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={busy || state === 'speaking'}
                onClick={() => void askByText(q)}
                className="rounded text-left text-sm text-ink-faint underline-offset-4 transition-colors hover:text-ink-muted hover:underline disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <TextComposer onSubmit={(q) => void askByText(q)} disabled={busy || state === 'speaking'} />
      </div>

      {/* 03 — GROUNDED. The one thing that separates Astra from a chatbot, stated once and quietly.
          These are the real inputs the backend reads; no counts, no claims, no invented data. */}
      {!hasConversation && (
        <div className="mt-9 pt-2">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            Grounded in your chart
          </p>
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-sm text-ink-muted">
            <span>Birth chart</span>
            <span aria-hidden="true" className="size-1 rounded-full bg-line-strong" />
            <span>Current dasha</span>
            <span aria-hidden="true" className="size-1 rounded-full bg-line-strong" />
            <span>Current transits</span>
          </div>
        </div>
      )}
    </div>
  )
}
