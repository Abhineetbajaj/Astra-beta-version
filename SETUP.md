# Running Astra on a new machine

See **CLAUDE.md** for architecture and **USERSTORE.md** for the data model. This file is only
about getting the app running locally.

## What you need installed

| Tool | Version used | Notes |
|---|---|---|
| **Node.js** | 22.14.0 | Anything on Node 20+ should work. `node -v` to check. |
| **npm** | 10.9.2 | Ships with Node. |
| **Git** | any | |
| **VS Code** | any | No required extensions; ESLint/Tailwind extensions are nice to have. |

Nothing else is needed to run the app. Docker, the Supabase CLI, and a local Postgres are **not**
required — the backend (database + edge functions) already runs in the cloud, and the local dev
server talks to it directly.

## 1. Clone and switch to the right branch

```bash
git clone https://github.com/Abhineetbajaj/Astra-beta-version.git
cd Astra-beta-version
git checkout beta
```

**Use the `beta` branch.** All current work lives there; `main` is an older stable baseline.

## 2. Install dependencies

```bash
npm install
```

(`package-lock.json` is committed, so `npm ci` also works and is faster/more reproducible.)

## 3. Create the `.env` file

`.env` is gitignored, so it does **not** come with the clone — you have to create it:

```bash
cp .env.example .env
```

Then fill in the two values. Both come from the Supabase dashboard →
**Project Settings → API** (project `uejyelsygtgfkufugwvw`):

```
VITE_SUPABASE_URL=https://uejyelsygtgfkufugwvw.supabase.co
VITE_SUPABASE_ANON_KEY=<the "anon public" key>
```

The anon key is safe to put here — it is public by design, ships inside the browser bundle, and
every table it can reach is protected by row-level security. It is **not** an admin key.

If `.env` is missing or blank the app boots to a clear "backend not configured" screen
(`BackendNotConfigured.tsx`) rather than failing silently.

## 4. Run it

```bash
npm run dev
```

Open the printed URL (usually http://localhost:5173).

You can sign in with an existing account, or sign up fresh — you'll be pointed at the same live
database either way, so accounts and readings carry across machines.

## Other useful commands

```bash
npm run build     # type-check (tsc -b) + production build
npm test          # run the test suite once
npm run test:watch
npm run lint
```

## Only if you need to change the backend

The above is enough to run and develop the **frontend**. You only need the following to deploy
database migrations or edge functions:

```bash
npx supabase login          # opens a browser; log in as the project owner
npx supabase link --project-ref uejyelsygtgfkufugwvw
```

Then `npx supabase db push` (migrations) or `npx supabase functions deploy <name>`.

Edge function secrets (`GEMINI_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `SITE_URL`,
`RAZORPAY_*`) live in the Supabase project, not in the repo — see
`supabase/functions/.env.example` for the list. You do not need them to run the frontend, because
the deployed edge functions already hold them server-side.

## Deployment

Pushing to `beta` on GitHub auto-deploys the frontend to Render:
**https://astra-beta-version-1314.onrender.com**

Backend changes do **not** deploy on push — run the `supabase` commands above for those.
