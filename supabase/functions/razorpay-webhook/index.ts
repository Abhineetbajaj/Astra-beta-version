// Razorpay webhook receiver. Verifies the HMAC-SHA256 signature against
// RAZORPAY_WEBHOOK_SECRET before trusting anything in the payload — this is
// the only place wallet credits are granted or Premium is activated, so an
// unverified request must never reach that logic.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

const WALLET_CREDITS_PER_RUPEE = 1 // 1 credit per ₹1 topped up — adjust to actual pricing when defined.
const PREMIUM_PERIOD_DAYS = 30

async function verifySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return expected === signature
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')
    if (!secret) throw new Error('Missing RAZORPAY_WEBHOOK_SECRET')

    const signature = req.headers.get('X-Razorpay-Signature')
    if (!signature) return errorResponse('Missing signature', 400)

    const rawBody = await req.text()
    const valid = await verifySignature(rawBody, signature, secret)
    if (!valid) return errorResponse('Invalid signature', 401)

    const event = JSON.parse(rawBody)
    const admin = supabaseAdmin()

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity
      const orderId = payment.order_id as string

      const { data: order } = await admin.from('payment_orders').select('*').eq('razorpay_order_id', orderId).single()
      if (!order) {
        console.error(`Webhook for unknown order ${orderId}`)
        return jsonResponse({ received: true })
      }
      if (order.status === 'paid') return jsonResponse({ received: true }) // already processed, idempotent

      await admin.from('payment_orders').update({ status: 'paid' }).eq('id', order.id)

      if (order.purpose === 'wallet_topup') {
        const credits = Math.floor(order.amount / 100) * WALLET_CREDITS_PER_RUPEE
        await admin.from('wallet_transactions').insert({
          user_id: order.user_id,
          type: 'topup',
          amount: credits,
          label: 'Wallet top-up',
          razorpay_payment_id: payment.id,
        })
      } else if (order.purpose === 'premium_subscription') {
        const periodEnd = new Date(Date.now() + PREMIUM_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString()
        await admin
          .from('subscriptions')
          .update({ plan: 'premium', status: 'active', current_period_end: periodEnd, updated_at: new Date().toISOString() })
          .eq('user_id', order.user_id)
        await admin.from('profiles').update({ is_premium: true }).eq('id', order.user_id)
      }
    }

    return jsonResponse({ received: true })
  } catch (err) {
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
