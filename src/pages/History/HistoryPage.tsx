import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/Card'
import PageHero from '@/components/layout/PageHero'
import { Clock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import type { CompatibilityReportRow, DailyReadingRow, FinancialReadingRow, MedicalReadingRow } from '@/types/db'

type HistoryEntry =
  | { kind: 'daily'; at: string; row: DailyReadingRow }
  | { kind: 'compatibility'; at: string; row: CompatibilityReportRow }
  | { kind: 'financial'; at: string; row: FinancialReadingRow }
  | { kind: 'medical'; at: string; row: MedicalReadingRow }

const KIND_LABEL: Record<HistoryEntry['kind'], string> = {
  daily: 'Daily reading',
  compatibility: 'Compatibility',
  financial: 'Financial',
  medical: 'Wellness',
}

export default function HistoryPage() {
  const session = useAuthStore((s) => s.session)
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return setLoading(false)
    const userId = session.user.id
    Promise.all([
      supabase.from('daily_readings').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('compatibility_reports').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('financial_readings').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('medical_readings').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    ]).then(([daily, compat, financial, medical]) => {
      const all: HistoryEntry[] = [
        ...(daily.data ?? []).map((row) => ({ kind: 'daily' as const, at: row.created_at, row })),
        ...(compat.data ?? []).map((row) => ({ kind: 'compatibility' as const, at: row.created_at, row })),
        ...(financial.data ?? []).map((row) => ({ kind: 'financial' as const, at: row.created_at, row })),
        ...(medical.data ?? []).map((row) => ({ kind: 'medical' as const, at: row.created_at, row })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      setEntries(all)
      setLoading(false)
    })
  }, [session])

  return (
    <div className="mx-auto max-w-2xl">
      <PageHero
        Icon={Clock}
        eyebrow="History"
        title="Your reading history"
        subtitle="Your saved daily, compatibility, financial, and wellness readings, newest first."
      />

      <div className="mt-8 space-y-3">
        {loading && (
          <>
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-1.5 h-4 w-4/5" />
              </Card>
            ))}
          </>
        )}
        {!loading && entries.length === 0 && <p className="text-ink-muted">Nothing yet — visit Today or Ask Astra to generate your first reading.</p>}
        {entries.map((entry) => (
          <Card key={`${entry.kind}-${entry.row.id}`}>
            <div className="flex items-center justify-between">
              <Badge variant="neutral">{KIND_LABEL[entry.kind]}</Badge>
              <p className="text-xs text-ink-faint">
                {new Date(entry.at).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
            </div>
            <p className="mt-2 line-clamp-4 text-ink">
              {entry.kind === 'daily' && entry.row.body}
              {entry.kind === 'compatibility' && entry.row.prose}
              {entry.kind === 'financial' && entry.row.body}
              {entry.kind === 'medical' && entry.row.body}
            </p>
            {(entry.kind === 'financial' || entry.kind === 'medical') && (
              <p className="mt-2 text-xs italic text-ink-faint">{entry.row.disclaimer}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
