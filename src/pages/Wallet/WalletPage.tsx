import { useState } from 'react'
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useWalletStore } from '@/store/walletStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const PACKAGES = [10, 25, 50, 100] as const
const CREDIT_PRICE_INR = 10

export default function WalletPage() {
  const credits = useWalletStore((s) => s.credits)
  const transactions = useWalletStore((s) => s.transactions)
  const topUp = useWalletStore((s) => s.topUp)
  const [custom, setCustom] = useState('')

  function buy(amount: number) {
    topUp(amount, `Top-up · ${amount} credits`)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs uppercase tracking-wide text-ink-faint">Wallet</p>
      <h1 className="mt-1 font-display text-4xl">Your credits</h1>

      <Card className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <WalletIcon className="size-6 text-accent" strokeWidth={1.5} />
          <div>
            <p className="nums-tabular font-display text-3xl">{credits}</p>
            <p className="text-xs text-ink-faint">credits available</p>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="font-display text-lg">Top up</h2>
        <p className="mt-1 text-sm text-ink-muted">₹{CREDIT_PRICE_INR} per credit. No real payment is processed in this prototype.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PACKAGES.map((amount) => (
            <button
              key={amount}
              onClick={() => buy(amount)}
              className="rounded-xl border border-line-strong py-4 text-center hover:border-accent hover:bg-accent-soft"
            >
              <p className="nums-tabular text-lg font-medium">{amount}</p>
              <p className="text-xs text-ink-faint">₹{amount * CREDIT_PRICE_INR}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            type="number"
            min={1}
            placeholder="Custom amount"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="h-11 flex-1 rounded-xl border border-line-strong bg-paper px-3.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <Button
            variant="outline"
            onClick={() => {
              const n = parseInt(custom, 10)
              if (n > 0) {
                buy(n)
                setCustom('')
              }
            }}
          >
            Add
          </Button>
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="font-display text-lg">Transaction history</h2>
        <ul className="mt-4 divide-y divide-line">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-3 text-sm">
              <div className="flex items-center gap-3">
                {t.type === 'topup' ? (
                  <ArrowUpRight className="size-4 text-positive" strokeWidth={1.75} />
                ) : (
                  <ArrowDownRight className="size-4 text-negative" strokeWidth={1.75} />
                )}
                <div>
                  <p>{t.label}</p>
                  <p className="text-xs text-ink-faint">
                    {new Date(t.at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              <span
                className={`nums-tabular font-medium ${t.type === 'topup' ? 'text-positive' : 'text-negative'}`}
              >
                {t.type === 'topup' ? '+' : '-'}
                {t.amount}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
