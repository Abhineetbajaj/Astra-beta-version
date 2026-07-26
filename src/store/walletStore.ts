import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WalletTransaction {
  id: string
  type: 'topup' | 'debit'
  amount: number
  label: string
  at: string
}

interface WalletState {
  credits: number
  transactions: WalletTransaction[]
  topUp: (amount: number, label: string) => void
  debit: (amount: number, label: string) => boolean
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      credits: 50,
      transactions: [
        { id: 'seed-1', type: 'topup', amount: 50, label: 'Welcome credits', at: new Date().toISOString() },
      ],
      topUp: (amount, label) =>
        set((state) => ({
          credits: state.credits + amount,
          transactions: [
            { id: crypto.randomUUID(), type: 'topup', amount, label, at: new Date().toISOString() },
            ...state.transactions,
          ],
        })),
      debit: (amount, label) => {
        const state = get()
        if (state.credits < amount) return false
        set({
          credits: state.credits - amount,
          transactions: [
            { id: crypto.randomUUID(), type: 'debit', amount, label, at: new Date().toISOString() },
            ...state.transactions,
          ],
        })
        return true
      },
    }),
    { name: 'astra-wallet' },
  ),
)
