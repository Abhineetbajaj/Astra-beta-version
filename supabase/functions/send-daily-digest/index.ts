// Cron-triggered daily email digest — the retention hook pairing with the real transit work in
// daily-reading/chat. Invoked once a day by pg_cron via net.http_post (see the ad-hoc
// cron.schedule(...) run alongside this deploy, not committed to a migration since it embeds
// CRON_SECRET). Not a user-facing endpoint: authenticated by a shared secret header, not a JWT.
//
// Reuses generateDailyReading so the emailed content is byte-for-byte the same idempotent
// get-or-generate reading a user would see by opening the dashboard themselves — no separate
// "email version" of the Gemini prompt to maintain.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { generateDailyReading } from '../_shared/generateDailyReading.ts'

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing required environment variable: ${name}.`)
  return value
}

function digestHtml(opts: {
  displayName: string
  body: string
  focus: string
  love: string
  career: string
  watch: string
  siteUrl: string
  unsubscribeUrl: string
}): string {
  const card = (label: string, text: string) =>
    `<tr><td style="padding:10px 0;border-top:1px solid #e5e0d8;">` +
    `<div style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#8a8478;margin-bottom:4px;">${label}</div>` +
    `<div style="font-size:14px;color:#2a2a26;line-height:1.5;">${text}</div></td></tr>`

  return `
  <div style="max-width:560px;margin:0 auto;font-family:Georgia,serif;color:#2a2a26;">
    <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8478;">Astra · Today's reading</p>
    <h1 style="font-size:22px;margin:6px 0 16px;">Hi ${opts.displayName}, here's your sky today.</h1>
    <p style="font-size:15px;line-height:1.6;">${opts.body}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      ${card('Focus', opts.focus)}
      ${card('Love', opts.love)}
      ${card('Career', opts.career)}
      ${card('Watch for', opts.watch)}
    </table>
    <p style="margin-top:24px;">
      <a href="${opts.siteUrl}/dashboard" style="color:#9c6b3e;">View your full dashboard →</a>
    </p>
    <p style="margin-top:32px;font-size:11px;color:#a8a296;">
      You're receiving this because email updates are on for your Astra account.
      <a href="${opts.unsubscribeUrl}" style="color:#a8a296;">Unsubscribe</a>
    </p>
  </div>`
}

async function sendEmail(resendApiKey: string, to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Astra <onboarding@resend.dev>', to: [to], subject, html }),
  })
  if (!res.ok) throw new Error(`Resend API error (${res.status}): ${await res.text()}`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const cronSecret = requireEnv('CRON_SECRET')
    if (req.headers.get('x-cron-secret') !== cronSecret) return errorResponse('Forbidden', 403)

    const resendApiKey = requireEnv('RESEND_API_KEY')
    const siteUrl = requireEnv('SITE_URL')
    const supabaseUrl = requireEnv('SUPABASE_URL')
    const admin = supabaseAdmin()

    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id, email, display_name, unsubscribe_token')
      .eq('daily_digest_opt_in', true)
    if (error) throw new Error(`Failed to load opted-in profiles: ${error.message}`)

    let sent = 0
    let skipped = 0
    let failed = 0

    for (const profile of profiles ?? []) {
      try {
        const { data: selfProfile } = await admin
          .from('birth_profiles')
          .select('id')
          .eq('user_id', profile.id)
          .eq('relation', 'self')
          .maybeSingle()
        if (!selfProfile) {
          skipped++
          continue
        }

        const { reading } = await generateDailyReading(admin, profile.id, selfProfile.id)
        const dateLabel = new Date(reading.reading_date).toLocaleDateString('en-US', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })

        await sendEmail(
          resendApiKey,
          profile.email,
          `Your Astra reading for ${dateLabel}`,
          digestHtml({
            displayName: profile.display_name,
            body: reading.body,
            focus: reading.focus_card,
            love: reading.love_card,
            career: reading.career_card,
            watch: reading.watch_card,
            siteUrl,
            unsubscribeUrl: `${supabaseUrl}/functions/v1/unsubscribe-digest?token=${profile.unsubscribe_token}`,
          }),
        )
        sent++
      } catch (perUserErr) {
        // One user's failed send (bad email, transient Gemini/Resend error) must not block the rest of the batch.
        console.error(`send-daily-digest failed for profile ${profile.id}:`, perUserErr)
        failed++
      }
    }

    return jsonResponse({ total: profiles?.length ?? 0, sent, skipped, failed })
  } catch (err) {
    console.error(err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
