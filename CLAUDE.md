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
present.

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
   (`BackendNotConfigured.tsx`) rather than degrading to placeholder content.
6. RLS is on for every user-data table. Generated content and billing rows are written only by
   edge functions using the service-role client (`_shared/supabaseAdmin.ts`), which bypasses RLS
   by design — the client can only ever *read* its own rows for those tables.
7. Never commit `.env` or any file with a real secret value. Root `.gitignore` blocks `.env` and
   `.env.*` (except `*.example` files) at every depth, so `supabase/functions/.env` is covered too
   — verified with `git check-ignore`.
8. **A `birth_profiles` row existing does not guarantee a chart exists for it.** `compute-chart` can
   fail after the profile is saved (a bad geocode, a transient Gemini/DB error, the tab closing
   mid-request), and `AuthGate` only checks that `selfBirthProfile` exists, not that its chart does
   — this is deliberate (see point 2 below), not an oversight. Anywhere that reads a chart
   (`DashboardPage`, `NatalChartPage`, and any future page built the same way) must handle the
   "no chart found" case with a **self-heal "Compute my chart" button** that calls `compute-chart`
   on demand, rather than a dead-end error. `OnboardingPage` also tracks the saved profile id across
   retries so a failed first attempt can be retried without hitting the one-self-profile-per-user
   unique constraint on a duplicate insert.

## Key files & folders

```
src/
  astro-engine/         pure TS astrology engine — ephemeris, ayanamsa, houses, nakshatra, dasha, guna
  data/                 static reference data (rashis, nakshatras, dasha sequence, astrologer personas)
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
                         Financial, Medical, Wallet, Pricing, Astrologers, History, Profile, Onboarding, Auth
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
      computeAndPersistChart.ts   compute + persist a chart for a birth_profile or company_profile
      loadChartFacts.ts           read a persisted chart back out as compact LLM-ready JSON
      yogas.ts                    deterministic wealth-yoga detection (3 yogas, honestly scoped)
      houseLords.ts               whole-sign house-lord lookup
      premium.ts                  requirePremium() guard, throws PremiumRequiredError (→ 402)
      gemini.ts                   direct Gemini API call + factsGroundingPreamble()
      supabaseAdmin.ts            service-role client + requireUser() (resolves caller from JWT)
      cors.ts
    compute-chart/         explicit "compute my chart" — also the one client-callable entry point
    daily-reading/         Dashboard: paragraph + 4 cards, idempotent per (profile, date)
    weekly-report/         Premium — 4-paragraph deep-dive, idempotent per (profile, ISO week)
    chat/                  Ask Astra — priority Gemini integration, facts + history grounded
    compatibility/         real guna score (3 of 8 kutas) + Gemini prose
    financial-reading/     Premium — wealth yogas, 2nd/11th strength, dasha favorability, disclaimer
    medical-reading/       Premium — 6th/8th/12th house, soft language only, disclaimer
    razorpay-create-order/ creates a Razorpay order for wallet_topup or premium_subscription
    razorpay-webhook/      HMAC-verified; the ONLY place credits/Premium are actually granted
  .env.example            documents GEMINI_API_KEY / RAZORPAY_* — copy to .env for local dev
```

## Setup checklist (what's real vs. what needs your credentials)

Live project: `uejyelsygtgfkufugwvw` (Supabase, `ap-south-1`/Mumbai).

| Piece | Status |
|---|---|
| Astro engine (client + server) | ✅ Real, tested, no external dependency |
| `GEMINI_API_KEY` | ✅ Live secret, **end-to-end verified**: compute-chart → daily-reading, chat, compatibility, financial-reading, medical-reading, weekly-report all produce real, grounded, high-quality prose against production data |
| DB schema + RLS + seed data | ✅ **Pushed to the live project** via `supabase db push` — 3 migrations applied cleanly against real Postgres |
| Edge functions | ✅ **Deployed** — all 9 live at `https://uejyelsygtgfkufugwvw.supabase.co/functions/v1/<name>`, every one exercised end-to-end with a real test account (signup → onboarding → chart → all 6 Gemini-backed functions → cleanup) |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | ✅ Set in `.env`, dev server picks them up |
| Google OAuth | ✅ **Enabled and end-to-end verified** — Google Cloud OAuth client created, wired into Supabase via the Management API, real sign-in tested through to onboarding |
| Razorpay account/keys | ❌ Not set — `razorpay-create-order`/`razorpay-webhook` are deployed but will throw clearly (not silently mock) until `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET` are set via `supabase secrets set` |
| Prokerala | Deliberately unused — see above |

Remaining to fully close out: set the three `RAZORPAY_*` secrets once you have real keys, and point
a Razorpay webhook at `https://uejyelsygtgfkufugwvw.supabase.co/functions/v1/razorpay-webhook`.
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
  simulated consultation now write real rows to `wallet_transactions`.
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

## Conventions

- Edge functions: one per concern, thin `Deno.serve` wrapper delegating to `_shared/` helpers.
  Always `requireUser(req)` first, `requirePremium()` where relevant, then do the work.
- Never construct Gemini prompts inline without going through `factsGroundingPreamble()`. Every
  reading/chat/compatibility system instruction should also append `CLASSICAL_VOICE_DIRECTIVE`
  (`_shared/gemini.ts`) — named planets/houses/signs/nakshatras/dasha periods, not therapy-speak.
  It deliberately excludes transit language since the app doesn't compute transits, only natal +
  dasha facts — extend it only once transit facts actually exist in the FACTS block.
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
