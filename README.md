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

`vercel.json` rewrites all routes to `index.html` so client-side routing works on refresh.

## Notes

- The Supabase free tier pauses a project after ~7 days of zero activity. Active use keeps
  it awake; if it pauses, click "Restore" in the Supabase dashboard.
- Leaders/players with game history are hidden rather than deleted, so old stats stay intact.
- A game must have exactly 4 results; this is enforced inside the `create_game` /
  `update_game` database functions.
