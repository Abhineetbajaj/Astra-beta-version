import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'

/** Wallet balance is derived from wallet_transactions — there is no separate balance column to drift out of sync. */
export function useWalletBalance() {
  const session = useAuthStore((s) => s.session)
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session) return
    const { data } = await supabase.from('wallet_transactions').select('type, amount').eq('user_id', session.user.id)
    const total = (data ?? []).reduce((sum, t) => sum + (t.type === 'topup' ? t.amount : -t.amount), 0)
    setCredits(total)
    setLoading(false)
  }, [session])

  useEffect(() => {
    refresh()
  }, [refresh])

  /** Client-side debit for the consultation demo — real money top-ups only ever come from the Razorpay webhook. */
  const debit = useCallback(
    async (amount: number, label: string): Promise<boolean> => {
      if (!session) return false
      if (credits < amount) return false
      const { error } = await supabase.from('wallet_transactions').insert({ user_id: session.user.id, type: 'debit', amount, label })
      if (error) return false
      setCredits((c) => c - amount)
      return true
    },
    [session, credits],
  )

  return { credits, loading, refresh, debit }
}
