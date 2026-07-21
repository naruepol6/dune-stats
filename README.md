# Dune Imperium Uprising - Stats Tracker

A small website to track game results for a friend group playing Dune Imperium Uprising
with the Community mod.
Every game is exactly 4 players with strict 1-2-3-4 placements.
It shows a leaderboard, per-player profiles, per-leader stats, and a game log.

Stack: React + Vite + TypeScript, Tailwind CSS, Supabase (Postgres), deployed on Vercel.
There is no login - anyone with the link can view and edit.
Deletes are soft (recoverable) and all game changes are recorded in an audit log.

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
   Supabase SQL editor, and run it. This creates the tables, views, RPCs, row-level
   security policies, the audit log, and seeds the 28 Community-mod leaders.
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
relevant section in-line. The Gemini API key stays server-side; the browser only talks to
`/api/rules-qa`.

The FAQ PDF is bundled with the function (`functions.includeFiles` in `vercel.json`) and sent
inline on each request, with the document placed first so Gemini 2.5 implicit caching can reuse it
across questions. This avoids the Gemini Files API, whose uploads auto-expire after 48 hours, and
means there is no separate upload step to run.

Setup:

1. Add this environment variable (in `.env.local` for local dev, and in Vercel):
   - `GEMINI_API_KEY` - a Gemini API key from https://aistudio.google.com/apikey
2. (Optional but recommended, since the endpoint is open) enable per-IP rate limiting:
   run `supabase/migrations/0002_rules_qa_rate_limit.sql` in the Supabase SQL editor, then set
   the server-only vars `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL`. Without them the endpoint
   simply skips rate limiting.

The default model is `gemini-2.5-flash` (cheap, fast); switch `MODEL` in `api/rules-qa.ts` to
`gemini-2.5-pro` for higher-quality answers on tricky rulings.

Local dev note: the Vite dev server does not run the `/api` function. Use `vercel dev` (or deploy
a preview) to exercise the Rules AI endpoint end-to-end.

## Notes

- The Supabase free tier pauses a project after ~7 days of zero activity. Active use keeps
  it awake; if it pauses, click "Restore" in the Supabase dashboard.
- Leaders/players with game history are hidden rather than deleted, so old stats stay intact.
- A game must have exactly 4 results; this is enforced inside the `create_game` /
  `update_game` database functions.
