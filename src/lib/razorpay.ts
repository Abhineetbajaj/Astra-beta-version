// Thin wrapper around Razorpay's Checkout.js — loaded on demand so pages that never touch
// payments don't pay for it. Real money only ever moves after Razorpay confirms the payment;
// the webhook (server-side, signature-verified) is the sole place credits/Premium get granted.

let scriptPromise: Promise<void> | null = null

function loadCheckoutScript(): Promise<void> {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Razorpay checkout.'))
    document.body.appendChild(script)
  })
  return scriptPromise
}

interface OpenCheckoutParams {
  orderId: string
  amount: number
  currency: string
  keyId: string
  name: string
  description: string
  prefillEmail?: string
  onSuccess: () => void
  onDismiss?: () => void
}

export async function openRazorpayCheckout(params: OpenCheckoutParams): Promise<void> {
  await loadCheckoutScript()
  // deno-lint-ignore no-explicit-any
  const RazorpayCtor = (window as any).Razorpay
  if (!RazorpayCtor) throw new Error('Razorpay checkout script failed to load.')

  const rzp = new RazorpayCtor({
    key: params.keyId,
    order_id: params.orderId,
    amount: params.amount,
    currency: params.currency,
    name: params.name,
    description: params.description,
    prefill: { email: params.prefillEmail },
    handler: () => params.onSuccess(),
    modal: { ondismiss: params.onDismiss },
  })
  rzp.open()
}
