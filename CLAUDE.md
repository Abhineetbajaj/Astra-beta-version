# CLAUDE.md — Astra project context

Living document. Update this in the same commit as any change to the schema, data flow, or
user-facing behavior — don't let it go stale. See also **USERSTORE.md** for the per-entity map of
what data the app keeps about a user.

## Product overview

Astra is a Vedic (sidereal) astrology web app. Given a person's name, date of birth, time of
birth, and place of birth, it computes their real birth chart and generates personalized
natural-language content from that chart: a daily reading, a full chart breakdown, compatibility
between two people, freeform Q&A with an AI astrologer ("Ask Astra"), and Premium-gated financial
and medical astrology readings. A marketplace of human astrologers, backed by a wallet, is also
present. A free Numerology section (Pythagorean core numbers + a daily Personal Day reading) sits
alongside the astrology features as a second, independent daily-habit surface — see below.

**Non-negotiable architecture rule:** astrology facts (planetary positions, houses, nakshatras,
dasha periods, yogas) are always computed deterministically — never invented or "calculated" by an
LLM. The LLM (Gemini) only ever turns precomputed structured facts into readable prose. Every
reading/chat/compatibility/financial/medical edge function goes through
`supabase/functions/_shared/gemini.ts`'s `factsGroundingPreamble()`, which hands the model a JSON
facts blob and instructs it never to contradict or invent facts. If you're ever tempted to let the
model guess a placement, stop — that must come from the chart-computation pipeline.

## History note (read this before assuming Prokerala/Lovable are relevant)

This repo started as a **local, from-scratch, client-only redesign** of an earlier Lovable-hosted
project called "Celestial Compass" (workspace project `daily-cosmos`) — the original had a
Supabase/Prokerala/Gemini/Razorpay backend; this redesign deliberately shipped with everything
except the astrology math mocked client-side (localStorage auth, templated prose, simulated
payments), so it would run with zero setup. **As of this backend build-out, that's no longer
true** — real Supabase Auth, a real Postgres schema, real Gemini calls, and real Razorpay
integration have been added directly to *this* repo (not the Lovable project). Prokerala was
deliberately **not** wired in — see below.

## Why Prokerala isn't used

The original brief for this backend build named Prokerala's API as the planetary-position source.
This repo already had (before this backend work started) a real, independently-tested
sidereal-astrology engine (`src/astro-engine/`, built on the `astronomy-engine` npm package) — Sun
through Saturn via true geocentric ecliptic longitude, Rahu/Ketu via the mean lunar node, Lahiri
ayanamsa validated against 6 published historical values (1900–2024), whole-sign houses via the
standard RAMC/obliquity formula, and Vimshottari dasha math validated against a published
ephemeris row. Adding Prokerala on top would mean paying for and depending on an external OAuth2
API for something already correct, tested, and free to run. So: **the existing engine is the
source of truth**, now also running server-side (see below) instead of only in the browser.
`PROKERALA_CLIENT_ID`/`PROKERALA_CLIENT_SECRET` are intentionally not referenced anywhere in this
codebase.

## Tech stack

- **Frontend:** Vite + React 19 + TypeScript, Tailwind v4, React Router 7, Zustand, Radix UI,
  Framer Motion.
- **Backend:** Supabase — Postgres (with RLS), Supabase Auth (email + Google OAuth), Edge
  Functions (Deno).
- **AI:** Gemini (`gemini-3.5-flash`, set in `_shared/gemini.ts`) called directly from edge
  functions — no hosted AI gateway proxy. `GEMINI_API_KEY` is a server-only edge function secret.
  **Model availability drifts** — `gemini-2.5-flash` (the model this project's key started with)
  became unavailable to it ("no longer available to new users") partway through this build; if
  generation starts 404ing, re-check `GET /v1beta/models?key=...` and swap `GEMINI_MODEL`. Also
  note `thinkingConfig: { thinkingBudget: 0 }` is set deliberately — some Gemini models spend part
  of `maxOutputTokens` on invisible "thinking" tokens before the visible reply, which silently
  truncated the JSON the daily-reading function parses (`Unterminated string in JSON`) until this
  was disabled. If a future model requires thinking for quality, budget for it explicitly rather
  than removing this line blind.
- **Payments:** Razorpay — Orders API for wallet top-ups and Premium, webhook-verified.
- **Astrology math:** hand-written TypeScript (`src/astro-engine/`), duplicated (not
  re-exported, since Supabase Edge Functions bundle each function's own directory tree) into
  `supabase/functions/_shared/astro-engine/` and `_shared/data/` for Deno. **If you change the
  frontend engine, mirror the change in the `_shared` copy in the same commit** — there's a
  one-line "keep in sync" comment at the top of every duplicated file as a reminder.

## Architecture rules

1. Chart facts are computed once, server-side, by `compute-chart` (or the shared
   `computeAndPersistChart`/`ensureChart` helpers other functions call), and persisted to
   `natal_charts`/`chart_placements`/`dasha_periods`/`chart_yogas`. No other function recomputes
   them — they all read back through `_shared/loadChartFacts.ts`.
2. Every Gemini call passes facts as JSON via `factsGroundingPreamble()` and is instructed never to
   invent astrological facts.
3. Financial content never reads as investment advice; `disclaimer` is a **fixed DB column
   default**, never left to the LLM to remember to include (the prompt also asks the model to
   end with it, as defense in depth, but the UI should treat the DB column as authoritative).
4. Medical content never reads as diagnosis; same fixed-disclaimer pattern, plus the system prompt
   forbids naming specific diseases/conditions.
5. **No silent fallback to mock data.** If `GEMINI_API_KEY`, `RAZORPAY_KEY_ID`/`SECRET`,
   `RAZORPAY_WEBHOOK_SECRET`, or `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are missing, the
   relevant function/page throws or shows a clear "not configured" screen
   (`BackendNotConfigured.tsx`) rather than degrading to placeholder content. **Fail loud to the
   developer, not to the user**: an unconfigured-secret path should `console.error` the real
   env-var name server-side but return a plain-language message the user can act on. Surfacing
   `Missing required environment variable: RAZORPAY_KEY_ID` straight into the UI (which is what
   `razorpay-create-order` did until a pre-review audit caught it) is both meaningless to them and
   leaks internal config.
6. **Never persist a user's input before the operation that gives it meaning succeeds.** `chat`
   originally inserted the user's question, then called Gemini — so any generation failure (the
   free tier's daily quota is easy to hit) left an orphaned question in history forever, unanswered
   and un-retryable. Generate first, persist after. Same reasoning drives `CompatibilityPage`
   deleting the partner `birth_profiles` row it just created if report generation fails.
7. **Assume the AI budget is exhausted and design for it.** The free Gemini tier allows 20
   requests/day *project-wide* — shared across every feature and every user. Any page whose only
   content comes from a fresh Gemini call is a dead page whenever that runs out. So: read an
   existing saved row first (Financial/Wellness/weekly deep-dive all do this now), cache shared
   content by a deterministic key rather than per user (`daily_readings`, `rashi_horoscopes`,
   `meditation_tracks.dedupe_key`), and always offer a retry affordance on failure.
8. RLS is on for every user-data table. Generated content and billing rows are written only by
   edge functions using the service-role client (`_shared/supabaseAdmin.ts`), which bypasses RLS
   by design — the client can only ever *read* its own rows for those tables.
9. Never commit `.env` or any file with a real secret value. Root `.gitignore` blocks `.env` and
   `.env.*` (except `*.example` files) at every depth, so `supabase/functions/.env` is covered too
   — verified with `git check-ignore`.
10. **A `birth_profiles` row existing does not guarantee a chart exists for it.** `compute-chart` can
   fail after the profile is saved (a bad geocode, a transient Gemini/DB error, the tab closing
   mid-request), and `AuthGate` only checks that `selfBirthProfile` exists, not that its chart does
   — this is deliberate, not an oversight. Anywhere that reads a chart
   (`DashboardPage`, `NatalChartPage`, and any future page built the same way) must handle the
   "no chart found" case with a **self-heal "Compute my chart" button** that calls `compute-chart`
   on demand, rather than a dead-end error. `OnboardingPage` also tracks the saved profile id across
   retries so a failed first attempt can be retried without hitting the one-self-profile-per-user
   unique constraint on a duplicate insert.
11. **Transits (Gochara) are computed fresh on every call, never persisted.** Unlike the natal chart,
    where the planets are *today* changes daily, so `_shared/transitFacts.ts` /
    `src/astro-engine/transits.ts` always recompute from the current time — there's no
    `transits` table. Whatever snapshot fed a given day's `daily_readings`/`chat_messages` row is
    archived in that row's `facts_used` jsonb, same pattern as every other generated-content table.
12. **A function with no Supabase session (cron jobs, public email links) needs
    `verify_jwt = false` in `supabase/config.toml`, not just an internal auth check.** The platform's
    JWT gate runs *before* the function code, so a custom header check (`x-cron-secret`,
    `unsubscribe_token`) alone isn't enough — confirmed the hard way when `send-daily-digest` 401'd
    at the gateway (`UNAUTHORIZED_NO_AUTH_HEADER`) before its own secret check ever ran. See
    `[functions.send-daily-digest]`/`[functions.unsubscribe-digest]` in `config.toml`.

## Numerology

A free, independent daily-habit section alongside the astrology features — Pythagorean core
numbers (Life Path, Expression, Soul Urge, Personality, Birthday) plus a daily Personal
Year/Month/Day cycle, the retention hook. Deliberately **not Premium-gated** in MVP: it's a
brand-new feature and gating it before it can build a daily-open habit would defeat the point.
Chaldean (name-vibration + compound numbers) and Vedic (Mulank/Bhagyank/Lo Shu) are scaffolded in
the engine's type system (`NumerologySystem`) but not implemented — every number is tagged with
the system that produced it so those can ship later without a breaking change, and so the app
never silently mixes systems that disagree on letter values.

- **All core numbers and personal cycles are closed-form arithmetic — no ephemeris, no external
  dependency, never persisted.** Same architectural category as `panchang.ts`/`transits.ts`
  (compute it, don't source it): `src/numerology-engine/` renders the core-numbers table and the
  Personal Day number **instantly, client-side, for free**, same UX as the Dashboard's Panchang
  strip. Only two things cost Gemini budget and get a DB table + Edge Function: a one-time AI
  synthesis of the 5 core numbers (`numerology_readings`, `numerology-reading`) and the daily
  Personal Day AI blurb (`numerology_daily_readings`, `numerology-daily-reading`, idempotent per
  `(birth_profile, date)` exactly like `daily_readings`).
- `src/numerology-engine/reduction.ts`'s `reduceToSingleDigitOrMaster()` is the one shared
  master-number-preserving reduction rule — every calculator (core numbers AND personal cycles)
  routes through it rather than reimplementing digit-summing per-number.
- **Known simplification, disclosed rather than silent:** `birth_profiles.name` is a single field
  (no separate "full birth-certificate name" vs. "name currently goes by"), so name-based numbers
  (Expression/Soul Urge/Personality) run on whatever name is in that field — mathematically valid,
  just reduced-fidelity if it's not the complete birth name. The Numerology page has an inline
  "edit name" affordance; onboarding's name field is labeled "Full name (as on birth certificate)"
  to raise data quality at the source. No new column was added for this — same category of
  disclosed simplification as `guna.ts` covering 3-of-8 kutas rather than all 8.
- **Known simplification:** the Y vowel/consonant rule (`nameNumbers.ts`'s `isVowel()`) uses a
  documented heuristic — Y counts as a vowel only when it isn't immediately adjacent to another
  vowel letter — approximating "Y supplies the vowel sound in this syllable" without a real
  syllable parser. Correctly classifies the standard reference examples (Bryn, Kylie, Gypsy) but
  is a heuristic, not true syllable analysis.
- Duplicated into `supabase/functions/_shared/numerology-engine/` and
  `_shared/data/numerologyMeanings.ts` for Deno, same "keep in sync" convention as the astro-engine.
- Dashboard's Personal Day teaser card is deterministic-only — it does not call
  `numerology-daily-reading`; that Gemini call only fires when the user opens `/numerology`
  itself, so a third page doesn't add to Dashboard's existing `daily-reading` +
  conditional-`weekly-report` Gemini load (rule 7).
- **Compatibility** (`numerology-compatibility`, `numerology_compatibility_readings`): Life
  Path/Expression/Soul Urge matching between the user and a named partner — 3 numbers, an
  honestly-scoped subset, same convention as `guna.ts` covering 3 of 8 classical kutas. The
  partner is **not** stored as a `birth_profiles` row — that table's `place_name`/`lat`/`lon`/
  `utc_offset_minutes` columns are `NOT NULL` (astrology needs them; numerology doesn't), so
  partner name + date of birth are stored directly on the result row instead. The score itself
  (`src/numerology-engine/compatibility.ts`) is instant, client-side, free; only the narrated
  prose costs a Gemini call, fired by an explicit "Get the full reading" button, not automatically.
  The "Share" button builds a plain-text summary and uses `navigator.share()` (clipboard-copy
  fallback) — **no image-card generation**; that would need real server-side image rendering,
  not built here. Flag to the user if a designed shareable image (not just text) turns out to
  matter for growth — it's a bigger lift, deliberately deferred.
- **Daily digest email** (`send-daily-digest`) now includes a Personal Day line. Deliberately
  **deterministic only** — it does NOT call `generateNumerologyDailyReading`/Gemini a second time
  per user in the cron batch, which would double the Gemini load per digest run against the
  already-tight shared 20-req/day quota (see the Gemini quota row in the setup checklist below).
  The full AI-narrated Personal Day blurb still only generates when the user opens `/numerology`
  themselves. **True push notifications (browser/mobile) are not built** — there's no service
  worker, VAPID keys, or push-subscription table anywhere in this app; "notification" currently
  means this email digest only, which itself is still Resend-sandboxed to one recipient (see the
  existing digest gap below). Building real push would be new infrastructure, not an extension of
  what exists — treat as a separate, larger feature if it's wanted.

## Key files & folders

```
src/
  astro-engine/         pure TS astrology engine — ephemeris, ayanamsa, houses, nakshatra, dasha, guna
                         transits.ts computes Gochara (today's real planetary positions relative to
                         a natal chart) — pure composition of the same ephemeris/ayanamsa/house
                         functions, no new astronomy code, never persisted (see architecture rule 9)
                         panchang.ts computes Tithi/Nakshatra/Yoga/Vara for any date; panchangEvents.ts
                         (built for "Listen") detects Ekadashi/Amavasya/Purnima (exact, from tithi
                         naming), Sankranti (Sun's sidereal sign change), and Navratri (a documented
                         Gregorian-month heuristic, not true masa/lunar-month math — see Known gaps)
                         over a date range — no external calendar API, same "compute it, don't
                         source it externally" philosophy as the rest of the engine
  numerology-engine/     pure TS numerology engine — reduction (master-number-preserving),
                         letterValues, nameNumbers (Expression/Soul Urge/Personality), coreNumbers
                         (Life Path/Birthday), personalCycles (Personal Year/Month/Day). chaldean.ts/
                         vedic.ts are Phase-2 scaffolding, not wired into computeCoreNumbers yet.
  data/                 static reference data (rashis, nakshatras, dasha sequence, astrologer
                         personas, numerologyMeanings — 1-9/11/22/33 trait library)
  lib/
    supabaseClient.ts    Supabase client + isBackendConfigured guard
    edgeFunctions.ts     callEdgeFunction() — invokes an edge fn with the session's bearer token
    chartFromRows.ts     rebuilds astro-engine's NatalChart shape from DB rows, for UI reuse
    useNatalChart.ts     hook: reads a persisted chart for a birth/company profile
    useWalletBalance.ts  hook: wallet balance derived live from wallet_transactions
    razorpay.ts          Checkout.js loader + opener
  services/
    authService.ts       Supabase Auth (email + Google OAuth) — thin wrappers
    geocodingService.ts  Nominatim geocoding (unchanged, still real)
    timezoneService.ts   tz-lookup + Luxon historical UTC offset (unchanged, still real)
  store/
    authStore.ts          session + profile + selfBirthProfile + isPremium, synced via onAuthStateChange
    themeStore.ts          unchanged
  pages/                 one folder per route — Dashboard, NatalChart, Compatibility, Chat,
                         Financial, Medical, Wallet, Pricing, Astrologers, History, Profile,
                         Onboarding, Auth, Numerology (free, not Premium-gated)
  components/layout/
    AuthGate.tsx          redirect to /auth or /onboarding based on session + selfBirthProfile
    PremiumGate.tsx        route guard for Financial/Medical — shows upsell if not Premium
    BackendNotConfigured.tsx  fail-loud screen when Supabase env vars are missing
  mocks/consultationReplies.ts   the ONE remaining templated content — astrologer marketplace
                                  chat replies are still simulated (not in original scope for this
                                  backend build; see "Known gaps" below)

supabase/
  config.toml
  migrations/
    ..._initial_schema.sql       full schema + RLS policies (see USERSTORE.md for the narrative version)
    ..._seed_reference_data.sql  ref_* tables + astrologers, mirrors src/data/*.ts + guna.ts exactly
  functions/
    _shared/
      astro-engine/, data/        Deno copies of the frontend engine (see "keep in sync" note above)
      numerology-engine/         Deno copy of src/numerology-engine/ (see "keep in sync" note above)
      generateNumerologyDailyReading.ts   get-or-generate today's Personal Day reading, shared
                                  logic used by numerology-daily-reading, same idempotent-per-day
                                  shape as generateDailyReading.ts
      computeAndPersistChart.ts   compute + persist a chart for a birth_profile or company_profile
      loadChartFacts.ts           read a persisted chart back out as compact LLM-ready JSON
      transitFacts.ts             loads a chart's natal ascendant/Moon and computes today's Gochara
                                   fresh (Deno copy of astro-engine/transits.ts) — never persisted
      generateDailyReading.ts     the get-or-generate-today's-reading logic, shared by daily-reading
                                   (HTTP) and send-daily-digest (cron) so the Gemini prompt lives once
      yogas.ts                    deterministic wealth-yoga detection (3 yogas, honestly scoped)
      houseLords.ts               whole-sign house-lord lookup
      premium.ts                  requirePremium() guard, throws PremiumRequiredError (→ 402)
      gemini.ts                   direct Gemini API call + factsGroundingPreamble()
      supabaseAdmin.ts            service-role client + requireUser() (resolves caller from JWT)
      cors.ts
    compute-chart/         explicit "compute my chart" — also the one client-callable entry point
    daily-reading/         Dashboard: paragraph + 4 cards, idempotent per (profile, date); thin
                            wrapper around _shared/generateDailyReading.ts (transit-grounded)
    weekly-report/         Premium — 4-paragraph deep-dive, idempotent per (profile, ISO week)
    chat/                  Ask Astra — priority Gemini integration, facts + transits + history grounded
    compatibility/         real guna score (3 of 8 kutas) + Gemini prose
    financial-reading/     Premium — wealth yogas, 2nd/11th strength, dasha favorability, disclaimer
    medical-reading/       Premium — 6th/8th/12th house, soft language only, disclaimer
    numerology-reading/    Free — one-time/regenerate-able AI synthesis of the 5 core numbers
    numerology-daily-reading/   Free — Personal Day reading, idempotent per (profile, date)
    numerology-compatibility/   Free — Life Path/Expression/Soul Urge match vs. a named partner
    send-daily-digest/     pg_cron-triggered (see below) — emails opted-in users their reading via
                            Resend; verify_jwt=false, authenticates via x-cron-secret header instead
    unsubscribe-digest/    public link clicked from the email; verify_jwt=false, authenticates via
                            the profile's unsubscribe_token query param
    generate-meditation-tracks/    pg_cron-triggered daily (2:00 UTC) — "Listen" section's
                            time-triggered categories: For You Today (personalized, but generated
                            once per distinct dasha+natal-Moon-sign combination across all users,
                            not per user), This Week's Ritual, Panchang Calendar Drops. verify_jwt=
                            false, same x-cron-secret pattern as send-daily-digest.
    generate-meditation-library/   manually invoked (not scheduled) — the evergreen "Browse by
                            Need" (7 tags) and "Graha Mantras" (9 planets) libraries. Takes an
                            optional { maxItems } body param and is idempotent via meditation_
                            tracks.dedupe_key — re-invoke to resume a batch that hit a limit.
    razorpay-create-order/ creates a Razorpay order for wallet_topup or premium_subscription
    razorpay-webhook/      HMAC-verified; the ONLY place credits/Premium are actually granted
  .env.example            documents GEMINI_API_KEY / RAZORPAY_* — copy to .env for local dev
```

**Daily email digest scheduling:** `pg_cron` + `pg_net` extensions and the `profiles.daily_digest_opt_in`/
`unsubscribe_token` columns are in `supabase/migrations/20260806180000_daily_digest.sql`. The
`cron.schedule(...)` call itself (job name `send-daily-digest`, `30 1 * * *` = 7:00 AM IST) is
**not** in that migration — it embeds a secret (the shared `x-cron-secret` the cron job sends,
stored via `vault.create_secret('cron_secret', ...)`), so it was run once directly against the
live project instead, same "never commit a secret" rule as `.env` applied to a migration file.
Check `select * from cron.job` to see it; to change the schedule or rotate the secret, update both
the `CRON_SECRET` edge function secret (`supabase secrets set`) and the `vault.update_secret(...)`
value together, or the cron job's requests will start 403ing against `send-daily-digest`.

## Setup checklist (what's real vs. what needs your credentials)

Live project: `uejyelsygtgfkufugwvw` (Supabase, `ap-south-1`/Mumbai).

| Piece | Status |
|---|---|
| Astro engine (client + server) | ✅ Real, tested, no external dependency |
| `GEMINI_API_KEY` | ✅ Live secret, **end-to-end verified**: compute-chart → daily-reading, chat, compatibility, financial-reading, medical-reading, weekly-report all produce real, grounded, high-quality prose against production data |
| DB schema + RLS + seed data | ✅ **Pushed to the live project** via `supabase db push` — 3 migrations applied cleanly against real Postgres |
| Edge functions | ✅ **Deployed** — all 14 live at `https://uejyelsygtgfkufugwvw.supabase.co/functions/v1/<name>`, every one exercised end-to-end with a real test account (signup → onboarding → chart → all Gemini-backed functions → cleanup) |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | ✅ Set in `.env`, dev server picks them up |
| Google OAuth | ✅ **Enabled and end-to-end verified** — Google Cloud OAuth client created, wired into Supabase via the Management API, real sign-in tested through to onboarding |
| Razorpay account/keys | ❌ Not set — `razorpay-create-order`/`razorpay-webhook` are deployed but will throw clearly (not silently mock) until `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET` are set via `supabase secrets set` |
| Real transits (Gochara) | ✅ Live — `daily-reading`, `chat`, and the Dashboard "Today's Sky" card all ground content in today's actual planetary positions; Sade Sati/Guru Gochar math hand-verified against the real, publicly-known 2025-2027 Saturn-in-Pisces transit window |
| `RESEND_API_KEY` / `send-daily-digest` cron | ⚠️ **Live but sandboxed** — `pg_cron` fires daily, the function runs and generates real readings, but Resend's unverified-domain sandbox only delivers to the account owner's own email (`surya.sharma6066@gmail.com`); every other opted-in user's send fails with a clear `validation_error`, confirmed live (11 profiles, 1 sent, rest failed on this restriction). **Verify a domain at resend.com/domains and switch the `from` address off `onboarding@resend.dev` before this reaches real family testers.** |
| "Listen" meditation section | ✅ Deployed, schema live, RLS-gating verified live (a non-premium account's direct API query only ever sees the one free sample row — confirmed, not just UI-hidden). ⚠️ **Content generation is currently gated by a hard wall**, see the `GEMINI_API_KEY` quota row below — `generate-meditation-library` (evergreen need/mantra library) finished a full run; `generate-meditation-tracks` (today/weekly/panchang, now on a daily 2:00 UTC cron) has **not yet completed a successful run** — it hit the same daily quota before producing any rows. Re-run it (or wait for the next quota reset) before `/listen`'s "For You Today"/"This Week's Ritual" sections will show real content instead of the "still being prepared" placeholder. |
| `GEMINI_API_KEY` daily quota | ⚠️ **The free Gemini tier caps at 20 requests/day** (separate from the smaller per-minute cap already worked around with pacing in `generate-meditation-library`/`generate-meditation-tracks`) — discovered live when `generate-meditation-tracks` 429'd with `GenerateRequestsPerDayPerProjectPerModel-FreeTier`. **This budget is shared across every Gemini-backed feature in the whole app** — daily-reading, chat, financial/medical readings, weekly-report, the digest, and now Listen's generators all draw from the same 20/day, project-wide, not per-user. With ~10 active family accounts each potentially triggering a few calls a day, this is realistically already tight and will cause silent-looking failures (a function just 500s with a 429 body) once usage climbs. **Upgrading to a paid Gemini tier is the real fix** — flag to the user before this surprises them as "the app is broken." |
| Prokerala | Deliberately unused — see above |

Remaining to fully close out: set the three `RAZORPAY_*` secrets once you have real keys, point
a Razorpay webhook at `https://uejyelsygtgfkufugwvw.supabase.co/functions/v1/razorpay-webhook`, and
verify a Resend domain so the daily digest actually reaches family testers (see table above).
Everything else is live and verified, not just written.

## Known gaps / deliberate simplifications

- **Premium is a one-time Razorpay order, not a true recurring Razorpay Subscription.**
  `razorpay-webhook` extends `current_period_end` by 30 days on `payment.captured`; it doesn't use
  Razorpay's Subscriptions API or `RAZORPAY_PREMIUM_PLAN_ID`. Fine for a v1, but renewal requires
  the user to pay again manually — there's no auto-charge.
- **Astrologer marketplace / live consultations** still use the original templated mock replies
  (`src/mocks/consultationReplies.ts`) and static personas (`src/data/astrologerPersonas.ts`) —
  this wasn't in the explicit scope of this backend build (only Financial/Medical were named as
  "build if not already present"). The `astrologers`/`consultations`/`consultation_messages`
  tables exist in the schema for whenever this gets built out for real; wallet debits during a
  simulated consultation now write real rows to `wallet_transactions`. **`AstrologersPage` now
  states plainly that this is a preview with simulated replies** — it previously presented canned
  responses, fake ratings and "online" indicators as a live human service, which is a credibility
  problem, not just a missing feature. Keep that notice until the flow is genuinely real.
- **The consultation flow is effectively unreachable end-to-end**: new accounts get no starting
  credits, and topping up requires Razorpay (unconfigured), so "Start chat" stays disabled. Also
  `wallet_transactions` has only a `select` RLS policy, so the client-side debit insert in
  `useWalletBalance.ts` would be rejected even with credits — that write needs to move to an edge
  function (service role) whenever this flow is built for real.
- **Yoga detection is intentionally partial** — 6 wealth yogas computable from placement math alone
  (Dhana — any two of the 2nd/5th/9th/11th lords conjunct or exchanged; Lakshmi; Guru-Mangala;
  Kubera; Chandra-Mangal; Gajakesari), not full graha-drishti aspect rules, matching the existing
  `guna.ts` precedent of not claiming false classical completeness. Kubera Yoga in particular has
  several competing classical formulations — the one used is documented inline in
  `supabase/functions/_shared/yogas.ts` rather than presented as the only version.
- **Compatibility (`compatibility` function) is not Premium-gated** — no `requirePremium()` call,
  unlike `financial-reading`/`medical-reading`/`weekly-report`. This diverges from the original
  brief's "Premium unlocks... compatibility." Noticed while deepening Financial/Medical (which
  assumed matching gating); left as-is since fixing it wasn't in scope of that request — flag to
  the user before changing, since it's a product decision (see USERSTORE.md).
- **`src/types/db.ts` is hand-written, not generated.** Run `supabase gen types typescript --linked`
  and reconcile when convenient.
- **Daily digest sends are Resend-sandboxed to one recipient.** See the setup checklist table above
  — until a domain is verified at resend.com/domains, `send-daily-digest` can only actually deliver
  to the Resend account's own email; it still runs on schedule and generates real readings for
  everyone opted in, so switching the domain over is a config change, not more code.
- **`daily_digest_opt_in` defaults to `true` for everyone, including pre-existing accounts** — the
  migration used `not null default true`, which backfills existing rows, not just new ones. Every
  family tester who'd already signed up before this feature shipped was opted in without an
  explicit choice. Revisit whether that's the right default once the Resend domain is verified and
  sends actually reach them — an opt-out-by-default digest is a reasonable retention mechanic, but
  it's a product decision worth confirming, not something to leave silently assumed.
- **Numerology's migrations and Edge Functions are written but not yet applied/deployed to the
  live project** (`uejyelsygtgfkufugwvw`) or exercised end-to-end — unlike every other row in the
  setup checklist above, don't assume this one is live without running `supabase db push` and
  deploying `numerology-reading`/`numerology-daily-reading`/`numerology-compatibility` first, then
  verifying RLS and a real Gemini call the same way the rest of this checklist was verified. The
  CLI in this environment was never logged in (`supabase login`/`SUPABASE_ACCESS_TOKEN` not set),
  so this deploy has to happen from a machine with real project credentials.
- **Numerology compatibility's "Share" button is text-only** (native share sheet or
  clipboard-copy) — there's no generated shareable image/card. If growth data later shows text
  sharing underperforms, building a real image card is a separate, larger piece of work (needs
  server-side rendering), not a quick follow-up.
- **No real push notifications exist anywhere in this app** — "notification" today means the
  Resend-sandboxed daily digest email only. Building actual browser/mobile push (service worker,
  VAPID keys, a subscription table, permission UX) is new infrastructure, scoped out of this pass.
- **Two stale test accounts remain in the live `profiles` table**: `astra.debugtest.7734@gmail.com`
  and `astra.debugtest.9921@gmail.com` (from earlier ad-hoc testing). Left in place deliberately —
  flagged, not deleted, since ownership/purpose wasn't confirmed.
- **"Listen" (meditation/reflection section) ships text-only in this pass — no audio narration.**
  The original spec assumed `edge-tts`, a Python-only, unofficial, reverse-engineered client for
  Microsoft Edge's internal Read Aloud service — not an official API, doesn't run in this project's
  Deno backend, and carries real ToS/reliability risk for a paid product. `meditation_tracks.
  audio_url` stays a nullable column so real narration (most likely an official paid TTS API) can
  be added later without a schema change. Also English-only, matching the rest of the app — no
  multilingual system exists here.
- **"Listen"'s weekly-ritual theme detection is scoped, not exhaustive**: it checks Saturn/Jupiter
  sidereal sign changes and retrograde-station flips, falling back to the transiting Moon's
  nakshatra. It does **not** detect eclipses (would need real Sun-Moon-node alignment math beyond
  what `meanNode.ts`'s mean-node approximation supports) — a documented gap, not a silent omission.
- **"Listen"'s Navratri detection is a Gregorian-month heuristic** (Shukla Paksha Pratipada falling
  in March/April or September/October), not true luni-solar masa (lunar month) calculation, since
  no masa calculator exists in this engine yet. Ekadashi/Amavasya/Purnima/Sankranti are exact.
- **"Listen"'s premium gating gives every category exactly one free sample except For You Today/
  This Week's Ritual/Panchang, which are free for everyone** — a deliberate deviation from the
  original spec's "one free sample per category including the time-triggered ones." Reasoning:
  those three are the daily/weekly retention hook (one shared item, not a browsable library), and
  the real premium value is the evergreen need/mantra library — flag to the user if the intent was
  actually to gate the daily hook content too, since that's a product call, not a technical one.

## Conventions

- Edge functions: one per concern, thin `Deno.serve` wrapper delegating to `_shared/` helpers.
  Always `requireUser(req)` first, `requirePremium()` where relevant, then do the work.
- Never construct Gemini prompts inline without going through `factsGroundingPreamble()`. Every
  reading/chat/compatibility system instruction should also append `CLASSICAL_VOICE_DIRECTIVE`
  (`_shared/gemini.ts`) — named planets/houses/signs/nakshatras/dasha periods, not therapy-speak.
  The directive references a transit only when a `"transits"` key is actually present in that
  call's FACTS block — currently `daily-reading`/`send-daily-digest` (via the shared
  `_shared/generateDailyReading.ts`) and `chat` load transits (`_shared/transitFacts.ts`);
  `compatibility`/`financial-reading`/`medical-reading`/`weekly-report` don't yet. Extend those only
  once there's a product reason — grounding in a fact category doesn't have to be universal.
- DB writes to generated-content/billing tables happen only in edge functions (service role).
  Client-side Supabase calls are read-only for those tables, and read/write for the user's own
  `birth_profiles`/`company_profiles` (RLS-enforced).
- Chart visualization is `src/components/chart/NorthIndianChartSVG.tsx` (diamond/Kundli style,
  used on Dashboard + `/chart`) — a fixed-position house layout (Lagna always the top kite) driven
  entirely by each placement's already-computed `houseIndex`. The geometry is hand-derived and
  cross-checked (see the comment at the top of the file); don't "simplify" it without re-deriving,
  and always pass `housesReliable` — with an unknown birth time, this chart shows a placeholder
  rather than a house layout built on an unreliable local-solar-noon ascendant. The older
  sign-wheel component (`ZodiacWheelSVG.tsx`) is unused now except as marketing decoration on
  `LandingPage.tsx`.
