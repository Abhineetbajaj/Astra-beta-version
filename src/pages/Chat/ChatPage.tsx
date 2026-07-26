import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useEffect } from 'react'
import { Send, MessageCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useChartStore } from '@/store/chartStore'
import { generateChatReply, type ChatTopic } from '@/mocks/chatGenerator'
import { cn } from '@/lib/cn'

interface Message {
  role: 'user' | 'astra'
  text: string
}

const SUGGESTIONS = [
  'What does my chart say about this week?',
  'How do I work with my Saturn placement?',
  'Best day this week for a big decision?',
  "What's my rising sign really about?",
]

export default function ChatPage() {
  const user = useAuthStore((s) => s.user)
  const ensureChart = useChartStore((s) => s.ensureChart)
  const chart = useMemo(() => (user?.birthData ? ensureChart(user.birthData) : null), [user, ensureChart])

  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const lastTopicRef = useRef<ChatTopic>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  function send(text: string) {
    if (!text.trim() || !chart) return
    const userMessage: Message = { role: 'user', text }
    setMessages((m) => [...m, userMessage])
    setDraft('')
    setThinking(true)

    const seed = `${chart.birthMoment.getTime()}|${messages.length}|${text}`
    setTimeout(
      () => {
        const reply = generateChatReply(text, chart, seed, lastTopicRef.current)
        lastTopicRef.current = reply.topic
        setMessages((m) => [...m, { role: 'astra', text: reply.text }])
        setThinking(false)
      },
      500 + Math.random() * 500,
    )
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    send(draft)
  }

  if (!chart) return null

  return (
    <div className="mx-auto flex h-[calc(100vh-140px)] max-w-2xl flex-col">
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <MessageCircle className="size-8 text-accent" strokeWidth={1.5} />
          <h1 className="mt-4 font-display text-3xl">
            What do you want to <span className="italic text-accent">ask the stars?</span>
          </h1>
          <p className="mt-2 max-w-md text-ink-muted">
            I know your real chart. Ask me anything — a decision, a person, a pattern you've
            noticed.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-xl border border-line px-4 py-3 text-left text-sm hover:border-line-strong hover:bg-paper-raised"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto py-6">
          {messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                  m.role === 'user'
                    ? 'bg-ink text-paper'
                    : 'border border-line bg-paper-raised text-ink',
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-line bg-paper-raised px-4 py-3 text-sm text-ink-faint">
                thinking…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-line pt-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about your chart, a decision, a person…"
          className="h-12 flex-1 rounded-full border border-line-strong bg-paper px-5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink disabled:opacity-40"
        >
          <Send className="size-4" strokeWidth={1.75} />
        </button>
      </form>
    </div>
  )
}
