// Creates a Razorpay order for either a wallet top-up or a Premium subscription
// payment. The client then opens Razorpay Checkout with this order; the actual
// credit/entitlement grant happens only in razorpay-webhook, server-side,
// after Razorpay confirms payment — never on the client's say-so.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/supabaseAdmin.ts'

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user, admin } = await requireUser(req)
    const { purpose, amountInPaise } = (await req.json()) as {
      purpose: 'wallet_topup' | 'premium_subscription'
      amountInPaise: number
    }
    if (purpose !== 'wallet_topup' && purpose !== 'premium_subscription') {
      return errorResponse("purpose must be 'wallet_topup' or 'premium_subscription'")
    }
    if (!Number.isInteger(amountInPaise) || amountInPaise <= 0) {
      return errorResponse('amountInPaise must be a positive integer')
    }

    const keyId = requireEnv('RAZORPAY_KEY_ID')
    const keySecret = requireEnv('RAZORPAY_KEY_SECRET')
    const basicAuth = btoa(`${keyId}:${keySecret}`)

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        notes: { user_id: user.id, purpose },
      }),
    })
    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`Razorpay order creation failed (${res.status}): ${errBody}`)
    }
    const order = await res.json()

    const { error: insertError } = await admin.from('payment_orders').insert({
      user_id: user.id,
      razorpay_order_id: order.id,
      amount: amountInPaise,
      currency: 'INR',
      purpose,
      status: 'created',
    })
    if (insertError) throw new Error(`Failed to save payment_order: ${insertError.message}`)

    return jsonResponse({ orderId: order.id, amount: order.amount, currency: order.currency, keyId })
  } catch (err) {
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
