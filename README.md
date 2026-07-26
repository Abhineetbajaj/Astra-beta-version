# Astra

A local, from-scratch redesign of a Vedic astrology app. The astrology engine is real — planetary
positions, houses, nakshatras, and dasha timing are computed, not templated. Everything around it
(payments, AI-generated prose, live consultations) is deliberately mocked so the whole thing runs
with `npm install && npm run dev` and no API keys.

## Stack

Vite + React 19 + TypeScript, Tailwind v4, React Router, Zustand (with `persist` standing in for a
backend), Radix UI primitives, Framer Motion. `astronomy-engine` is the only astronomy dependency —
everything sidereal-specific (ayanamsa, houses, nakshatras, dasha) is hand-written. No SSR, no
database, no server.

## What's real vs. mocked

| Area | Real | Mocked |
|---|---|---|
| Planetary positions | ✅ Computed via `astronomy-engine` (geocentric, apparent, true-equinox-of-date) | — |
| Ayanamsa | ✅ Lahiri, linear model validated against published historical values (1900–2024) | — |
| Houses / Ascendant | ✅ Standard RAMC/obliquity formula, whole-sign houses | — |
| Nakshatra / pada | ✅ | — |
| Vimshottari dasha | ✅ Mahadasha + Antardasha, correct 120-year cycle math | — |
| Compatibility score | ✅ Real rule-based Bhakoot/Gana/Nadi kutas (3 of the classical 8 — see `astro-engine/guna.ts`) | Prose wrapping the score |
| Daily reading / chat / consultation text | Reads real chart facts (dasha lord, placements, ascendant) | Prose is templated/pattern-matched, not a live LLM call |
| Auth | — | localStorage-backed fake accounts, fake "Google" sign-in |
| Payments (wallet top-up, Premium) | — | Fully simulated, no payment provider involved |
| Astrologer marketplace | — | 4 static personas |
| Geocoding | ✅ Real Nominatim (OpenStreetMap) lookup | — (the one real network call in the app) |
| Timezone / historical UTC offset | ✅ `tz-lookup` + Luxon, using the browser's IANA/ICU data | — |

The engine lives entirely in `src/astro-engine/` and is framework-agnostic — it doesn't import
React or any store. `src/astro-engine/__tests__/` validates it against reference data pulled from
external, independently-sourced material (not derived from this codebase):

- `ayanamsa.test.ts` — Lahiri ayanamsa checked against 6 published historical values (1900–2024).
- `natalChart.test.ts` — full pipeline (ephemeris → ayanamsa → nakshatra → houses → dasha) checked
  against a real published sidereal ephemeris row for 2026-05-15, plus internal-consistency and
  dasha-arithmetic checks.

Run `npm run test` to verify.

## Project structure

```
src/
  astro-engine/   pure TS astrology engine (ephemeris, ayanamsa, houses, nakshatra, dasha, guna)
  data/           static reference data (rashis, nakshatras, dasha sequence, astrologer personas)
  mocks/          deterministic "AI prose" generators — templated, never a live LLM call
  services/       geocoding, timezone, and localStorage-backed auth
  store/          Zustand stores (auth, chart cache, wallet, theme)
  pages/          one folder per route
  components/     ui/ (Button, Card, Input, Switch, Badge…), layout/ (AppShell, gates), chart/ (wheel, tables, timeline)
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
npm run dev      # http://localhost:5173
npm run test     # vitest — astro-engine correctness tests
npm run build    # production build
```

No environment variables or API keys are required.
