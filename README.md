# Astra

A Vedic astrology app. The astrology engine is real — planetary positions, houses, nakshatras, and
dasha timing are computed, not templated — and now has a real backend: Supabase Auth (email +
Google), a Postgres schema with RLS, Edge Functions that call Gemini directly for reading/chat/
compatibility/financial/medical prose, and Razorpay for payments. See **CLAUDE.md** for the full
architecture writeup and setup checklist, and **USERSTORE.md** for what user data lives where.

Originally started as a from-scratch, deliberately client-only redesign (everything but the
astrology math mocked, zero setup). That's no longer the case — see CLAUDE.md's "History note".

## Stack

Vite + React 19 + TypeScript, Tailwind v4, React Router, Zustand, Radix UI primitives, Framer
Motion, backed by Supabase (Postgres + Auth + Edge Functions) and Gemini + Razorpay. `astronomy-engine`
is the only astronomy dependency — everything sidereal-specific (ayanamsa, houses, nakshatras,
dasha) is hand-written, and runs both in the browser (for tests) and server-side in Edge Functions
(via a Deno copy in `supabase/functions/_shared/`).

## What's real vs. what still needs your credentials

| Area | Status |
|---|---|
| Planetary positions, ayanamsa, houses, nakshatra/pada, Vimshottari dasha | ✅ Computed, tested — see `src/astro-engine/__tests__/` |
| Compatibility score | ✅ Real rule-based Bhakoot/Gana/Nadi kutas (3 of the classical 8 — see `astro-engine/guna.ts`) |
| Geocoding / timezone | ✅ Real Nominatim + `tz-lookup`/Luxon |
| Daily reading / Ask Astra chat / compatibility / financial / medical prose | ✅ Real Gemini calls, grounded in precomputed facts only — code complete, `GEMINI_API_KEY` verified working |
| Auth (email + Google OAuth) | ✅ Real Supabase Auth — needs a real Supabase project + Google provider enabled in the dashboard |
| Database schema + RLS | ✅ Written — not yet run against a real Postgres (no Docker in the build environment) |
| Payments (wallet top-up, Premium) | ✅ Real Razorpay Orders + webhook — needs real Razorpay keys |
| Astrologer marketplace / live consultations | Still templated/simulated — not in scope for this backend pass, see CLAUDE.md "Known gaps" |

Run `npm run test` to verify the astro-engine.

## Project structure

```
src/
  astro-engine/   pure TS astrology engine (ephemeris, ayanamsa, houses, nakshatra, dasha, guna)
  data/           static reference data (rashis, nakshatras, dasha sequence, astrologer personas)
  lib/            supabase client, edge-function caller, chart/wallet hooks, razorpay checkout
  services/       geocoding, timezone (real), Supabase Auth wrappers
  store/          Zustand stores (auth session/profile, theme)
  pages/          one folder per route, incl. Financial/ and Medical/ (Premium-gated)
  components/     ui/ (Button, Card, Input, Switch, Badge…), layout/ (AppShell, gates), chart/ (wheel, tables, timeline)
supabase/
  migrations/     full schema + RLS + seed reference data
  functions/      Edge Functions (compute-chart, daily-reading, chat, compatibility,
                  financial-reading, medical-reading, razorpay-create-order, razorpay-webhook)
```

## Design

"Quiet editorial precision" — deliberately the opposite of the dark-navy/gold/glassmorphism/
starfield look of the original Lovable version this was redesigned from. Light-first with a
genuinely separate (not inverted) dark palette, a terracotta accent used sparingly, Newsreader +
Manrope type pairing, and the zodiac wheel treated as a diagram rather than decoration. Toggle
light/dark/system from the theme switcher in the app header.

## Running it

```bash
npm install
cp .env.example .env                              # then fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
cp supabase/functions/.env.example supabase/functions/.env  # then fill in GEMINI_API_KEY / RAZORPAY_*
npm run dev      # http://localhost:5173 — shows a setup screen until .env is filled in
npm run test     # vitest — astro-engine correctness tests
npm run build    # production build
```

Without a real Supabase project + `.env`, the app intentionally shows a "Backend isn't configured"
screen rather than a broken or silently-mocked experience — see CLAUDE.md's setup checklist for
the full path to a working deployment.
