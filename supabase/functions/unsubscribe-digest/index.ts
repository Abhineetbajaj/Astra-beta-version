// Public, unauthenticated endpoint — clicked directly from the digest email as a plain link, so
// there's no Supabase session to check. verify_jwt is disabled for this function in config.toml;
// authorization instead comes from possessing the unguessable per-profile unsubscribe_token.

import { corsHeaders } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

function htmlPage(message: string): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Astra</title></head>` +
      `<body style="font-family:Georgia,serif;max-width:480px;margin:80px auto;text-align:center;color:#2a2a26;">` +
      `<p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8478;">Astra</p>` +
      `<h1 style="font-size:20px;">${message}</h1>` +
      `</body></html>`,
    { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const token = new URL(req.url).searchParams.get('token')
  if (!token) return htmlPage('Missing unsubscribe link — nothing changed.')

  try {
    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('profiles')
      .update({ daily_digest_opt_in: false })
      .eq('unsubscribe_token', token)
      .select('id')
      .maybeSingle()
    if (error) throw new Error(error.message)

    if (!data) return htmlPage("That unsubscribe link isn't valid — nothing changed.")
    return htmlPage("You've been unsubscribed from Astra's daily email digest.")
  } catch (err) {
    console.error(err)
    return htmlPage('Something went wrong — please try again later.')
  }
})
