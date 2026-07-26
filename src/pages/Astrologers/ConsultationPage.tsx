import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { ASTROLOGER_PERSONAS } from '@/data/astrologerPersonas'
import { useWalletStore } from '@/store/walletStore'
import { pick } from '@/lib/seededHash'
import { CONSULTATION_OPENERS, CONSULTATION_REPLIES } from '@/mocks/consultationReplies'
import { cn } from '@/lib/cn'

interface Message {
  role: 'user' | 'astrologer' | 'system'
  text: string
}

/** Each tick represents 1 simulated billed minute — shortened from real-time so the demo is legible. */
const TICK_MS = 10000

export default function ConsultationPage() {
  const { id } = useParams()
  const credits = useWalletStore((s) => s.credits)
  const debit = useWalletStore((s) => s.debit)

  const astrologer = ASTROLOGER_PERSONAS.find((a) => a.id === id)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [minutesBilled, setMinutesBilled] = useState(0)
  const [ended, setEnded] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!astrologer) return
    setMessages([{ role: 'astrologer', text: pick(CONSULTATION_OPENERS, astrologer.id) }])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!astrologer || ended) return
    const interval = setInterval(() => {
      const ok = debit(astrologer.ratePerMin, `Consultation with ${astrologer.name}`)
      if (!ok) {
        setEnded(true)
        setMessages((m) => [
          ...m,
          { role: 'system', text: "You're out of credits — this session has ended." },
        ])
        return
      }
      setMinutesBilled((m) => m + 1)
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [astrologer, ended, debit])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!astrologer) {
    return (
      <div>
        <p>Astrologer not found.</p>
        <Link to="/astrologers" className="text-accent hover:underline">
          Back to astrologers
        </Link>
      </div>
    )
  }

  function send(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim() || ended) return
    const text = draft
    setMessages((m) => [...m, { role: 'user', text }])
    setDraft('')
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { role: 'astrologer', text: pick(CONSULTATION_REPLIES, `${text}|${m.length}`) },
      ])
    }, 700)
  }

  function endChat() {
    setEnded(true)
    setMessages((m) => [...m, { role: 'system', text: 'You ended the session.' }])
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-140px)] max-w-2xl flex-col">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <Link
          to={`/astrologers/${astrologer.id}`}
          className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          {astrologer.name}
        </Link>
        <div className="nums-tabular text-right text-xs text-ink-muted">
          <p>
            {minutesBilled} min · {minutesBilled * astrologer.ratePerMin} credits
          </p>
          <p className="text-ink-faint">{credits} credits left</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto py-6">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              'flex',
              m.role === 'user' ? 'justify-end' : m.role === 'system' ? 'justify-center' : 'justify-start',
            )}
          >
            {m.role === 'system' ? (
              <span className="text-xs text-ink-faint">{m.text}</span>
            ) : (
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                  m.role === 'user' ? 'bg-ink text-paper' : 'border border-line bg-paper-raised',
                )}
              >
                {m.text}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {ended ? (
        <div className="border-t border-line pt-4 text-center">
          <p className="text-sm text-ink-muted">This session has ended.</p>
          <Link to="/astrologers" className="mt-2 inline-block text-sm text-accent hover:underline">
            Back to astrologers
          </Link>
        </div>
      ) : (
        <form onSubmit={send} className="flex items-center gap-2 border-t border-line pt-4">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
            className="h-12 flex-1 rounded-full border border-line-strong bg-paper px-5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink disabled:opacity-40"
          >
            <Send className="size-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={endChat}
            className="shrink-0 rounded-full border border-line-strong px-4 py-3 text-xs text-ink-muted hover:bg-paper-raised"
          >
            End
          </button>
        </form>
      )}
    </div>
  )
}
