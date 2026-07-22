# Dune Imperium Uprising - Stats Tracker

A stats website for a friend group that plays the board game *Dune: Imperium - Uprising* (Community mod).
It records every game, ranks players and leaders, and even answers rules questions with an AI grounded in the official FAQ.

**Live:** https://ice-dune-stats.vercel.app/

Every game is exactly 4 players with strict 1-2-3-4 placements.
There is no login: anyone with the link can view and add games, which suits a small trusted group and keeps the barrier to entry at zero.

<!-- Recruiter tip: drop a screenshot or short GIF here, e.g. ![Leaderboard](docs/leaderboard.png) -->

## Features

- **Player leaderboard** and **leader leaderboard** with click-to-sort columns (win rate, average placement, games, wins).
- **Leader tiers (A/B/C)** with a grouped "tier list" view, reflecting the pools leaders are drafted from.
- **Per-player and per-leader profiles**: win rate, average placement, most-played leaders, and full game history.
- **Victory points** recorded per player for each game.
- **Game log** with add/edit, plus soft-delete so nothing is ever truly lost.
- **Rules AI**: ask a rules question and get an answer cited from the official Comprehensive Rules FAQ.
- Responsive layout with light and dark themes.

## Tech stack

- **Frontend:** React 19 + TypeScript, Vite, Tailwind CSS, React Router.
- **Backend:** Supabase (Postgres) with row-level security, database views, and RPCs.
- **Serverless:** Vercel functions (Node.js) for the Rules AI endpoint.
- **AI:** Google Gemini, grounded on a bundled FAQ PDF (retrieval-augmented Q&A).

## Engineering highlights

The interesting parts of this project live in the data layer, where correctness matters more than in a throwaway CRUD app.

- **Atomic, validated writes.**
  A game is written through a single Postgres RPC (`create_game` / `update_game`) that enforces "exactly 4 results" and unique placements inside one transaction, so a half-saved game can never exist.
- **Integrity without accounts.**
  Rather than bolt on auth, the app leans on an **audit-log trigger** (every insert/update/delete on games and results is recorded) and **soft-deletes** (games and roster entries are hidden, never dropped).
  These are the safety net that makes an open, login-free site reasonable.
- **Stats live in SQL.**
  Leaderboards come from Postgres views (`player_stats`, `leader_stats`, `results_detail`) using `security_invoker`, so aggregation logic has one home and the frontend just `select`s.
- **Schema as versioned migrations.**
  `supabase/schema.sql` is the canonical schema, with incremental, idempotent migrations under `supabase/migrations/` for each feature (leader images, rate limiting, tiers, VP).
- **Serverless RAG that stays cheap.**
  The Rules AI function sends the FAQ PDF inline with the document placed first, so Gemini's implicit caching can reuse it across questions.
  This avoids the Files API (whose uploads expire after 48 hours) and needs no upload step, and the API key never leaves the server.
- **Typed end to end.**
  A single `src/lib/types.ts` mirrors the database shapes, and a thin `src/lib/api.ts` is the only place that talks to Supabase.

## Local development

1. Install dependencies:
   ```
   npm install
   ```
2. Create `.env.local` from the example and fill in your Supabase values
   (Supabase dashboard -> Project Settings -> API):
   ```
   cp .env.example .env.local
   ```
   - `VITE_SUPABASE_URL` - the Project URL
   - `VITE_SUPABASE_ANON_KEY` - the `anon` / public key (safe to ship in the frontend)
3. Run the database schema once: open `supabase/schema.sql`, paste it into the
   Supabase SQL editor, and run it.
   This creates the tables, views, RPCs, row-level security policies, the audit log,
   and seeds the 28 Community-mod leaders with their tiers.
4. Start the dev server:
   ```
   npm run dev
   ```

## Deploying to Vercel (free, always-on)

1. Push this repo to GitHub.
2. In Vercel: New Project -> import the repo. Vercel auto-detects Vite.
3. Add two Environment Variables (same values as `.env.local`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. Every `git push` afterwards redeploys automatically.

`vercel.json` rewrites all non-`/api` routes to `index.html` so client-side routing works on
refresh, while letting the serverless function under `/api` handle its own requests.

## Rules AI (Q&A over the FAQ)

The `/rules` page lets anyone ask rules questions about the game.
It calls a Vercel serverless function (`api/rules-qa.ts`, Node.js runtime) that asks Google
Gemini, grounding answers in the official Comprehensive Rules FAQ (`Dune_Faq.pdf`) and citing the
relevant section in-line.
The Gemini API key stays server-side; the browser only talks to `/api/rules-qa`.

Setup:

1. Add this environment variable (in `.env.local` for local dev, and in Vercel):
   - `GEMINI_API_KEY` - a Gemini API key from https://aistudio.google.com/apikey
2. (Optional but recommended, since the endpoint is open) enable per-IP rate limiting:
   run `supabase/migrations/0002_rules_qa_rate_limit.sql` in the Supabase SQL editor, then set
   the server-only vars `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL`.
   Without them the endpoint simply skips rate limiting.

The default model is `gemini-2.5-flash` (cheap, fast); switch `MODEL` in `api/rules-qa.ts` to
`gemini-2.5-pro` for higher-quality answers on tricky rulings.

Local dev note: the Vite dev server does not run the `/api` function.
Use `vercel dev` (or deploy a preview) to exercise the Rules AI endpoint end-to-end.

## Notes

- The Supabase free tier pauses a project after ~7 days of zero activity.
  Active use keeps it awake; if it pauses, click "Restore" in the Supabase dashboard.
- Leaders/players with game history are hidden rather than deleted, so old stats stay intact.
- A game must have exactly 4 results; this is enforced inside the `create_game` /
  `update_game` database functions.
