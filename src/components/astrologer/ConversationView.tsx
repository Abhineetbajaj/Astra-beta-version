import { useState } from 'react'
import { motion } from 'framer-motion'
import AssistantAnswer, { type SpeechState } from '@/components/astrologer/AssistantAnswer'

/**
 * The conversation, weighted toward the present. Only the latest turn is shown at full strength;
 * everything before it collapses behind a count, because a wall of scrollback turns a conversation
 * into a transcript. Earlier turns render muted and without audio controls once revealed — their
 * audio is no longer in memory, and re-synthesising an old answer would spend a listen from its cap.
 */

export interface Turn {
  id: string
  question: string
  answer: string
  /** Absent for a turn whose answer can't be narrated (e.g. a typed reply before playback). */
  messageId: string | null
}

interface ConversationViewProps {
  turns: Turn[]
  speech: SpeechState
  speechNotice: string | null
  onPlay: () => void
  onPause: () => void
  onReplay: () => void
}

export default function ConversationView({
  turns,
  speech,
  speechNotice,
  onPlay,
  onPause,
  onReplay,
}: ConversationViewProps) {
  const [showHistory, setShowHistory] = useState(false)

  if (turns.length === 0) return null

  const previous = turns.slice(0, -1)
  const current = turns[turns.length - 1]

  return (
    <div className="space-y-8">
      {previous.length > 0 && !showHistory && (
        <button
          type="button"
          onClick={() => setShowHistory(true)}
          className="mx-auto block rounded text-sm text-ink-faint underline underline-offset-4 hover:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          Show {previous.length} earlier {previous.length === 1 ? 'question' : 'questions'}
        </button>
      )}

      {showHistory &&
        previous.map((turn) => (
          <div key={turn.id} className="space-y-3">
            <Question text={turn.question} muted />
            <AssistantAnswer answer={turn.answer} speech="unavailable" muted />
          </div>
        ))}

      <motion.div
        key={current.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        <Question text={current.question} />
        <AssistantAnswer
          answer={current.answer}
          speech={current.messageId ? speech : 'unavailable'}
          onPlay={current.messageId ? onPlay : undefined}
          onPause={current.messageId ? onPause : undefined}
          onReplay={current.messageId ? onReplay : undefined}
          notice={speechNotice}
        />
      </motion.div>
    </div>
  )
}

function Question({ text, muted = false }: { text: string; muted?: boolean }) {
  return (
    <p
      className={
        muted
          ? 'text-sm text-ink-faint'
          : 'font-display text-lg leading-snug text-ink-muted'
      }
    >
      {text}
    </p>
  )
}
