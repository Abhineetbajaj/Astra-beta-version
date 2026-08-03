# USERSTORE.md — what Astra knows about a user, and where it lives

Living document. Update this in the same commit as any schema change. See `CLAUDE.md` for
architecture rules and the setup checklist.

Backend: Supabase Postgres, RLS on every table below unless noted. Full schema:
`supabase/migrations/20260728174833_initial_schema.sql`. Seed data (reference tables +
astrologers): `supabase/migrations/20260728174834_seed_reference_data.sql`.

## Auth identity

**`auth.users`** (Supabase-managed) — email, hashed password or OAuth identity (Google). Created
by `supabase.auth.signUp`/`signInWithPassword`/`signInWithOAuth` (client-side, via
`src/services/authService.ts`).

**`profiles`** — one row per `auth.users` row, auto-created by the `handle_new_user()` Postgres
trigger on `auth.users` insert (works identically for email sign-up and first-time Google login —
neither skips onboarding). Columns: `email`, `display_name` (from Google's `name`/`full_name` or
the email sign-up form), `avatar_url` (Google's `picture`, if present), `is_premium` (denormalized
convenience flag, kept in sync with `subscriptions` by `razorpay-webhook`). Read by
`src/store/authStore.ts` on every auth state change; updated by `ProfilePage.tsx` and by
`razorpay-webhook`.

## Birth profile(s)

**`birth_profiles`** — name, date of birth, time of birth (nullable — see below), place name +
resolved lat/lon (via `geocodingService.ts`, real Nominatim lookup), UTC offset at that
date/place/time (via `timezoneService.ts`, real `tz-lookup` + Luxon). `relation` is `'self'`
(exactly one per user, enforced by a partial unique index) or `'other'` (any number, saved for
compatibility checks). Created by `OnboardingPage.tsx` (self) and `CompatibilityPage.tsx` (other);
edited by `ProfilePage.tsx` (self only). When `time_known = false`, `time_of_birth` is null and the
chart is computed from local solar noon instead (`localSolarNoonUTC` in the astro-engine) —
`natal_charts.houses_reliable` is then `false` and the UI hides the ascendant/houses.

**`company_profiles`** — same shape, subject is a company: `company_name`,
`incorporation_date`/`incorporation_time` instead of person fields. Created by
`FinancialPage.tsx`'s business-chart form. Same computation pipeline as a person's chart (Section
6 of the original brief: "incorporation date treated like a birth chart").

## Computed chart data

Always written by an edge function (`compute-chart`, or the shared
`computeAndPersistChart`/`ensureChart` helpers called from `compatibility`/`financial-reading`/
`medical-reading` when a chart doesn't exist yet), never by the client, never by the LLM.

- **`natal_charts`** — one row per `birth_profiles` row *or* `company_profiles` row (exactly one of
  the two FK columns is set). Ayanamsa, ascendant sign+degree, `houses_reliable`,
  `computation_basis` (the human-readable string shown on `/chart`, e.g. "Calculated from Lucknow,
  Uttar Pradesh, India, 2000-10-13 — Lahiri ayanamsa, whole-sign houses"). Idempotent: recomputing
  deletes and replaces the existing row (and its children, via `on delete cascade`) rather than
  accumulating history.
- **`chart_placements`** — one row per planet (9: Sun–Saturn, Rahu, Ketu) per chart: sign, degree
  in sign, nakshatra + pada, house, retrograde, dignity.
- **`dasha_periods`** — Vimshottari Mahadasha (9 rows, `level='maha'`) each with 9 Antardasha
  children (`level='antar'`, `parent_id` → the maha row). Read by `_shared/loadChartFacts.ts` to
  find the currently-active maha/antar lord, and by `financial-reading`/`medical-reading` to
  classify each mahadasha as favorable/cautious or rest-prone/steady.
- **`chart_yogas`** — detected wealth yogas (`_shared/yogas.ts`), FK to `ref_yoga_definitions`.

Read by: `src/lib/useNatalChart.ts` (direct RLS-scoped read, used by Dashboard/Chart pages) and
`_shared/loadChartFacts.ts` (server-side, used by every Gemini-backed function to ground its
prompt).

## Reference data (static, seeded, public-read)

`ref_rashis`, `ref_nakshatras`, `ref_grahas`, `ref_bhavas`, `ref_vimshottari_sequence`,
`ref_kuta_rules`, `ref_yoga_definitions` — mirror `src/data/rashis.ts`, `nakshatras.ts`,
`dashaSequence.ts`, and `src/astro-engine/guna.ts` exactly. Not user data, but every user-specific
row references these by index/key.

## Subscription / wallet state

- **`subscriptions`** — one row per user (`plan`: free/premium, `status`, `current_period_end`),
  created by `handle_new_user()` at `'free'`, updated only by `razorpay-webhook` on
  `payment.captured` for a `premium_subscription` order. Read by `authStore.refreshUserData()` →
  `isPremium`, which gates `PremiumGate.tsx` (Financial/Medical routes).
- **`wallet_transactions`** — append-only ledger (`type`: topup/debit, `amount`, `label`). Balance
  is *derived* (`src/lib/useWalletBalance.ts` sums it live) — there's no separate balance column to
  drift out of sync. Top-ups are written only by `razorpay-webhook`; debits are written client-side
  during a simulated astrologer consultation (`ConsultationPage.tsx`) — see the "known gaps" note
  in CLAUDE.md about that flow still being templated, not a real live-chat backend.
- **`payment_orders`** — one row per Razorpay order created (`razorpay-create-order`), `status`
  flips `created` → `paid` when the webhook confirms it. Used for idempotency (a webhook retry
  won't double-credit).

## Consultation history

**`astrologers`** (seeded, 4 personas) / **`consultations`** / **`consultation_messages`** — schema
exists; the marketplace UI (`src/pages/Astrologers/`) still uses the original static personas and
templated replies rather than reading these tables. Treat as a scaffold for future real
implementation, not a live data path yet.

## Generated content history

All of these are written only by their corresponding edge function (service role), and carry a
`facts_used`/equivalent column recording exactly what grounded the generation, for auditability.

- **`daily_readings`** — one per `(birth_profile, date)`, idempotent (`daily-reading` function).
  Powers the Dashboard paragraph + 4 cards.
- **`weekly_reports`** — one per `(birth_profile, ISO week)`, idempotent (`weekly-report` function,
  Premium-gated). A longer 4-paragraph synthesis than the daily reading — throughline, relationships,
  work, and one honest growth edge — surfaced on the Dashboard for Premium users.
- **`compatibility_reports`** — one per compatibility check (`compatibility` function): guna
  breakdown (jsonb, matches `GunaBreakdown`), total/max, Gemini prose.
- **`chat_messages`** — Ask Astra history, one row per turn (`role`: user/assistant), read on
  `ChatPage.tsx` mount for continuity, appended to by the `chat` function on every exchange.
- **`financial_readings`** — personal or company (`kind`), `wealth_yogas` (6 detectable yogas, see
  CLAUDE.md), `house_strength` (2nd/5th/9th/10th/11th lords' dignity/placement/occupants),
  `favorable_periods` (every mahadasha classified), `current_period_outlook` (current
  mahadasha+antardasha lords and their classification specifically), prose, fixed `disclaimer`
  column. Company readings link `company_profile_id` instead of `birth_profile_id` (exactly one is
  set, same pattern as `natal_charts`). `FinancialPage.tsx` lists all of a user's saved
  `company_profiles` and generates a reading per company on demand — readings aren't cached/deduped
  the way `daily_readings` are, each generation is a fresh row.
- **`medical_readings`** — `indications` jsonb: 6th/8th/12th house occupants + lords (with
  `afflicted`/`mitigated` flags — malefic-occupied-or-weak-lord vs. a strong benefic also present),
  `ascendantLordVitality` (dignity/placement/retrograde of the 1st lord), rest-prone/steady dasha
  periods, `currentPeriodOutlook`. Prose, fixed `disclaimer` column.

`HistoryPage.tsx` reads `daily_readings` + `compatibility_reports` + `financial_readings` +
`medical_readings` for the current user and merges them chronologically.

## Required secrets and where each is consumed

See CLAUDE.md's setup checklist table for status (real vs. not-yet-configured). Summary of
*where* each is used:

| Secret | Consumed by |
|---|---|
| `GEMINI_API_KEY` | `supabase/functions/_shared/gemini.ts` (server-only edge function secret) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | `razorpay-create-order` (Basic auth to Razorpay Orders API) |
| `RAZORPAY_WEBHOOK_SECRET` | `razorpay-webhook` (HMAC-SHA256 signature verification) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | auto-injected by the Supabase Edge Runtime, every function's `_shared/supabaseAdmin.ts` |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | `src/lib/supabaseClient.ts` (frontend, public-safe anon key) |
| Google OAuth Client ID/Secret | Supabase Dashboard → Authentication → Providers → Google (not an env var in this codebase) |
| `PROKERALA_CLIENT_ID` / `PROKERALA_CLIENT_SECRET` | **Not used anywhere** — see CLAUDE.md "Why Prokerala isn't used" |
