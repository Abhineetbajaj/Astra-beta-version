import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Send, MessageCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import { callEdgeFunction } from '@/lib/edgeFunctions'
import { cn } from '@/lib/cn'
import type { ChatMessageRow } from '@/types/db'

const SUGGESTIONS = [
  'What does my chart say about this week?',
  'How do I work with my Saturn placement?',
  'Best day this week for a big decision?',
  "What's my rising sign really about?",
]

export default function ChatPage() {
  const session = useAuthStore((s) => s.session)

  const [messages, setMessages] = useState<ChatMessageRow[]>([])
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!session) return
    supabase
      .from('chat_messages')
      .select('id, user_id, role, content, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages((data as ChatMessageRow[]) ?? []))
  }, [session])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  async function send(text: string) {
    if (!text.trim() || thinking) return
    setError(null)
    setDraft('')
    setThinking(true)
    // Optimistic local echo — the real row (with server-assigned id) replaces this on response.
    setMessages((m) => [...m, { id: `pending-${Date.now()}`, user_id: '', role: 'user', content: text, created_at: new Date().toISOString() }])

    try {
      const { message } = await callEdgeFunction<{ message: ChatMessageRow }>('chat', { message: text })
      setMessages((m) => [...m, message])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong asking Astra.')
    } finally {
      setThinking(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    send(draft)
  }

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
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                    m.role === 'user' ? 'bg-ink text-paper' : 'border border-line bg-paper-raised text-ink',
                  )}
                >
                  {m.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {thinking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl border border-line bg-paper-raised px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="size-1.5 rounded-full bg-ink-faint"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {error && <p className="pb-2 text-sm text-negative">{error}</p>}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-line pt-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about your chart, a decision, a person…"
          className="h-12 flex-1 rounded-full border border-line-strong bg-paper px-5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <button
          type="submit"
          disabled={!draft.trim() || thinking}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink disabled:opacity-40"
        >
          <Send className="size-4" strokeWidth={1.75} />
        </button>
      </form>
    </div>
  )
}
