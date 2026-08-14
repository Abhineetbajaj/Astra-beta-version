# Shipping changes live — shared-project handoff

Read **SETUP.md** first (clone, `.env`, `npm run dev`). This file covers what's different when
**two people on two laptops share one live backend**, and the account access needed to deploy.

## The three places this project lives

| Thing | Where | Who owns it |
|---|---|---|
| **Code** | https://github.com/Abhineetbajaj/Astra-beta-version.git — branch **`beta`** | Abhineetbajaj |
| **Frontend hosting** | https://astra-beta-version-1314.onrender.com | Render, "Abhineet's workspace" |
| **Backend** (DB + edge functions) | Supabase project `uejyelsygtgfkufugwvw` | `suryasharma6066-hash` |

Supabase details:
- Project ref: `uejyelsygtgfkufugwvw`
- API URL: `https://uejyelsygtgfkufugwvw.supabase.co`
- Dashboard: https://supabase.com/dashboard/project/uejyelsygtgfkufugwvw
- Region: `ap-south-1` (Mumbai)

Render details:
- Service ID: `srv-d9o9ne942hec7390mqa0`
- Dashboard: https://dashboard.render.com/static/srv-d9o9ne942hec7390mqa0
- Auto-deploys on every push to **`beta`**. Nothing to run by hand.
- Its build env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are already set there.

## Access you need before you can deploy anything

This is the step that actually blocks people, so check it first.

1. **GitHub** — push access to `Abhineetbajaj/Astra-beta-version`.
2. **Supabase** — `npx supabase login` must authenticate as an account with access to the project
   above. **Logging in with a different Google account fails with a confusing error**, not a
   permissions prompt:
   ```
   403: Your account does not have the necessary privileges to access this endpoint
   ```
   If you see that, you're logged in as the wrong account. Fix:
   ```
   npx supabase logout
   npx supabase login
   ```
   and on the browser page that opens, **switch accounts before authorizing**. Either use the
   project owner's login, or have the owner invite you to the org
   (Dashboard → Organization → Team → Invite) so your own account works.
3. **Render** — only needed to read build logs. Deploys happen automatically from GitHub.

## Frontend vs backend deploy — they are separate

A feature usually needs **both**. Doing one without the other looks broken.

**Frontend** (pages, components, anything under `src/`):
```bash
git add -A
git commit -m "..."
git push origin beta        # Render picks it up and rebuilds automatically
```

**Backend** (anything under `supabase/`) — a git push does **nothing** for these:
```bash
npx supabase link --project-ref uejyelsygtgfkufugwvw   # once per machine
npx supabase db push                                    # applies new migrations
npx supabase functions deploy <function-name>           # one per function
```

Still commit and push your `supabase/` changes to git as well — otherwise the other laptop's repo
doesn't know the migration exists, and the next `db push` from that machine gets confused.

## Things that will bite you

- **`WARNING: Docker is not running` is harmless.** `db push` and `functions deploy` talk to the
  cloud project directly. Docker is only for running Supabase locally, which nobody here does.
- **New migration filenames must sort after the existing ones.** The latest applied is
  `20260807120000_meditation_listen.sql`. Use a `YYYYMMDDHHMMSS_name.sql` timestamp later than
  that, or `db push` will skip it.
- **`npx supabase db query` needs `--linked`.** Without it, the CLI tries a direct Postgres
  connection and fails on network restrictions.
- **A function with no user session needs `verify_jwt = false`** in `supabase/config.toml`, or the
  platform rejects it *before* your code runs (`UNAUTHORIZED_NO_AUTH_HEADER`). This applies to
  anything called by cron or opened from an email link. See the existing entries in that file.
- **Edge function secrets already exist server-side** — `GEMINI_API_KEY`, `RESEND_API_KEY`,
  `CRON_SECRET`, `SITE_URL`. A new function that reads them just works after deploying; you don't
  need the values locally, and you should not put them in the repo.
- **The Gemini free tier is 20 requests/day for the whole project**, shared across every feature
  and every user. New AI-backed features draw from the same budget. When it runs out, functions
  return "Astra's AI reading limit has been reached for today". See CLAUDE.md architecture rule 7
  for how pages are expected to handle that.
- **`.env` is gitignored on purpose.** Never commit it.

## Because the database is shared and live

Family testers and reviewers use the same project you're deploying to. There is no staging copy.

- `db push` adding *new* tables is safe. Altering or dropping existing ones affects live data.
- **Pull before you start**: `git pull origin beta` — the other laptop may have deployed
  migrations already.
- Say what you deployed. A backend deploy is instantly live for everyone, with no review step.

## Scheduled jobs already running

These fire automatically against the live project — don't be surprised by rows appearing:

| Job | Schedule (UTC) | What it does |
|---|---|---|
| `send-daily-digest` | `30 1 * * *` | Emails opted-in users their daily reading |
| `generate-meditation-tracks` | `0 2 * * *` | Generates Listen's daily/weekly/panchang content |
| `revert-family-premium-trial` | one-shot | Ends the temporary Premium grant, then removes itself |

## Verifying a deploy actually landed

```bash
npx supabase functions list                                   # is the function there?
npx supabase db query --linked "select table_name from information_schema.tables
  where table_schema='public' order by table_name;"           # did the table get created?
git log --oneline -3 origin/beta                              # did the code reach GitHub?
```
Then load the Render URL and click through the feature itself.
