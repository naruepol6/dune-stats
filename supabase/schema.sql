-- ============================================================================
-- Dune Imperium Uprising (Community mod) - stats tracker schema
-- Run this whole file once in the Supabase SQL editor (Dashboard -> SQL).
-- Safe to re-run: it drops and recreates the objects it owns.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists players (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  hidden     boolean not null default false,   -- hidden, never hard-deleted
  created_at timestamptz not null default now()
);

create table if not exists leaders (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  expansion  text,
  tier       text check (tier in ('A', 'B', 'C')),
  image_url  text,
  hidden     boolean not null default false,
  created_at timestamptz not null default now()
);

-- A game is exactly 4 players, strict placements 1-4. Soft-deletable.
create table if not exists games (
  id         uuid primary key default gen_random_uuid(),
  played_on  date not null default current_date,
  note       text,
  deleted_at timestamptz,                       -- null => active; set => soft-deleted
  created_at timestamptz not null default now()
);

create table if not exists game_results (
  id        uuid primary key default gen_random_uuid(),
  game_id   uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete restrict,
  leader_id uuid not null references leaders(id) on delete restrict,
  placement smallint not null check (placement between 1 and 4),
  vp        smallint check (vp is null or vp >= 0),  -- victory points at game end (optional)
  unique (game_id, placement),   -- one player per rank
  unique (game_id, player_id),   -- a player appears once per game
  unique (game_id, leader_id)    -- a leader appears once per game
);

create index if not exists game_results_game_idx   on game_results(game_id);
create index if not exists game_results_player_idx on game_results(player_id);
create index if not exists game_results_leader_idx on game_results(leader_id);

-- ---------------------------------------------------------------------------
-- Audit / edit log (filled by triggers; the integrity safety net)
-- ---------------------------------------------------------------------------

create table if not exists audit_log (
  id         bigint generated always as identity primary key,
  table_name text not null,
  op         text not null,          -- INSERT | UPDATE | DELETE
  row_id     uuid,
  game_id    uuid,                   -- groups result changes under their game
  old_data   jsonb,
  new_data   jsonb,
  at         timestamptz not null default now()
);

create index if not exists audit_log_game_idx on audit_log(game_id);

create or replace function log_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  newj jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  oldj jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  rowj jsonb := coalesce(newj, oldj);
  gid  uuid;
begin
  -- Read ids from the JSON snapshot so we never reference a column that does
  -- not exist on the triggering table (games has no game_id column).
  if tg_table_name = 'games' then
    gid := (rowj->>'id')::uuid;
  else
    gid := (rowj->>'game_id')::uuid;
  end if;
  insert into audit_log(table_name, op, row_id, game_id, old_data, new_data)
    values (tg_table_name, tg_op, (rowj->>'id')::uuid, gid, oldj, newj);
  return coalesce(new, old);
end $$;

drop trigger if exists audit_games on games;
create trigger audit_games after insert or update or delete on games
  for each row execute function log_audit();

drop trigger if exists audit_results on game_results;
create trigger audit_results after insert or update or delete on game_results
  for each row execute function log_audit();

-- ---------------------------------------------------------------------------
-- Atomic game writes via RPC (enforces exactly-4 in one transaction)
-- ---------------------------------------------------------------------------

create or replace function create_game(p_played_on date, p_note text, p_results jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare gid uuid; r jsonb;
begin
  if jsonb_array_length(p_results) <> 4 then
    raise exception 'A game must have exactly 4 results (got %)', jsonb_array_length(p_results);
  end if;
  insert into games(played_on, note)
    values (coalesce(p_played_on, current_date), p_note)
    returning id into gid;
  for r in select * from jsonb_array_elements(p_results) loop
    insert into game_results(game_id, player_id, leader_id, placement, vp)
      values (gid, (r->>'player_id')::uuid, (r->>'leader_id')::uuid,
              (r->>'placement')::smallint, (r->>'vp')::smallint);
  end loop;
  return gid;
end $$;

create or replace function update_game(p_game_id uuid, p_played_on date, p_note text, p_results jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if jsonb_array_length(p_results) <> 4 then
    raise exception 'A game must have exactly 4 results (got %)', jsonb_array_length(p_results);
  end if;
  update games set played_on = coalesce(p_played_on, played_on), note = p_note
    where id = p_game_id;
  delete from game_results where game_id = p_game_id;
  for r in select * from jsonb_array_elements(p_results) loop
    insert into game_results(game_id, player_id, leader_id, placement, vp)
      values (p_game_id, (r->>'player_id')::uuid, (r->>'leader_id')::uuid,
              (r->>'placement')::smallint, (r->>'vp')::smallint);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Views (stat logic lives here; the frontend just selects)
-- All views exclude soft-deleted games.
-- ---------------------------------------------------------------------------

create or replace view results_detail
with (security_invoker = on) as
  select gr.id, gr.game_id, g.played_on, gr.placement,
         p.id as player_id, p.name as player_name,
         l.id as leader_id, l.name as leader_name, l.image_url, gr.vp
  from game_results gr
  join games   g on g.id = gr.game_id and g.deleted_at is null
  join players p on p.id = gr.player_id
  join leaders l on l.id = gr.leader_id;

create or replace view player_stats
with (security_invoker = on) as
  select p.id as player_id, p.name as player_name, p.hidden,
         count(rd.id) as games,
         count(*) filter (where rd.placement = 1) as wins,
         coalesce(round(count(*) filter (where rd.placement = 1)::numeric
                        / nullif(count(rd.id), 0), 4), 0) as winrate,
         round(avg(rd.placement), 2) as avg_placement
  from players p
  left join results_detail rd on rd.player_id = p.id
  group by p.id, p.name, p.hidden;

create or replace view leader_stats
with (security_invoker = on) as
  select l.id as leader_id, l.name as leader_name, l.expansion, l.hidden,
         count(rd.id) as games,
         count(*) filter (where rd.placement = 1) as wins,
         coalesce(round(count(*) filter (where rd.placement = 1)::numeric
                        / nullif(count(rd.id), 0), 4), 0) as winrate,
         round(avg(rd.placement), 2) as avg_placement,
         l.image_url, l.tier
  from leaders l
  left join results_detail rd on rd.leader_id = l.id
  group by l.id, l.name, l.expansion, l.hidden, l.image_url, l.tier;

-- ---------------------------------------------------------------------------
-- Row Level Security: fully open (anyone can read & write). The audit_log +
-- soft-delete are the safety net, not auth.
-- ---------------------------------------------------------------------------

alter table players      enable row level security;
alter table leaders      enable row level security;
alter table games        enable row level security;
alter table game_results enable row level security;
alter table audit_log    enable row level security;

drop policy if exists open_all on players;
create policy open_all on players      for all to anon, authenticated using (true) with check (true);
drop policy if exists open_all on leaders;
create policy open_all on leaders      for all to anon, authenticated using (true) with check (true);
drop policy if exists open_all on games;
create policy open_all on games        for all to anon, authenticated using (true) with check (true);
drop policy if exists open_all on game_results;
create policy open_all on game_results for all to anon, authenticated using (true) with check (true);
-- audit_log is read-only to clients; rows are written by the SECURITY DEFINER trigger.
drop policy if exists read_only on audit_log;
create policy read_only on audit_log   for select to anon, authenticated using (true);

-- Grants (RLS still gates access; grants make the objects visible to PostgREST).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on players, leaders, games, game_results to anon, authenticated;
grant select on audit_log, results_detail, player_stats, leader_stats to anon, authenticated;
grant execute on function create_game(date, text, jsonb) to anon, authenticated;
grant execute on function update_game(uuid, date, text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed: 28 leaders from dunecardshub.com deck 63
-- (April 2026 TTS Uprising Bloodlines Community version).
-- ---------------------------------------------------------------------------

insert into leaders (name, expansion) values
  ('"Princess" Yuna Moritani', 'Rise of Ix'),
  ('Archduke Armand Ecaz',     'Rise of Ix'),
  ('Baron Vladimir Harkonnen', 'Dune: Imperium'),
  ('Chani',                    'Bloodlines'),
  ('Count Hasimir Fenring',    'Bloodlines'),
  ('Count Ilban Richese',      'Dune: Imperium'),
  ('Countess Ariana Thorvald', 'Dune: Imperium'),
  ('Duke Leto Atreides',       'Dune: Imperium'),
  ('Duncan Idaho',             'Bloodlines'),
  ('Esmar Tuek',               'Bloodlines'),
  ('Feyd-Rautha Harkonnen',    'Uprising'),
  ('Gaius Helen Mohiam',       'Bloodlines'),
  ('Gurney Halleck',           'Uprising'),
  ('Ilesa Ecaz',               'Rise of Ix'),
  ('Kota Odax of Ix',          'Bloodlines'),
  ('Lady Amber Metulli',       'Uprising'),
  ('Lady Jessica',             'Uprising'),
  ('Lady Margot Fenring',      'Uprising'),
  ('Liet Kynes',               'Bloodlines'),
  ('Muad''Dib',                'Uprising'),
  ('Paul Atreides',            'Dune: Imperium'),
  ('Piter De Vries',           'Bloodlines'),
  ('Prince Rhombur Vernius',   'Rise of Ix'),
  ('Princess Irulan',          'Uprising'),
  ('Shaddam Corrino IV',       'Uprising'),
  ('Staban Tuek',              'Bloodlines'),
  ('Steersman Y''rkoon',       'Bloodlines'),
  ('Tessia Vernius',           'Rise of Ix')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Seed: leader card preview images (dunecardshub.com thumbnails)
-- ---------------------------------------------------------------------------

update leaders set image_url = 'https://dunecardshub.com/thumbnails/rise-of-ix-leader-princess-yuna-moritani.webp' where name = '"Princess" Yuna Moritani';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/rise-of-ix-leader-archduke-armand-ecaz.webp' where name = 'Archduke Armand Ecaz';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/dune-imperium-leader-baron-vladimir-harkonnen.webp' where name = 'Baron Vladimir Harkonnen';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/bloodlines-leader-chani.webp' where name = 'Chani';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/bloodlines-leader-count-hasimir-fenring.webp' where name = 'Count Hasimir Fenring';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/dune-imperium-leader-count-ilban-richese.webp' where name = 'Count Ilban Richese';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/dune-imperium-leader-countess-ariana-thorvald.webp' where name = 'Countess Ariana Thorvald';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/dune-imperium-leader-dune-leto-atreides.webp' where name = 'Duke Leto Atreides';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/bloodlines-leader-duncan-idaho.webp' where name = 'Duncan Idaho';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/bloodlines-leader-esmar-tuek.webp' where name = 'Esmar Tuek';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/uprising-leader-feyd-rautha-harkonnen.webp' where name = 'Feyd-Rautha Harkonnen';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/bloodlines-leader-gaius-helen-mohiam.webp' where name = 'Gaius Helen Mohiam';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/uprising-leader-gurney-halleck.webp' where name = 'Gurney Halleck';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/rise-of-ix-leader-ilesa-ecaz.webp' where name = 'Ilesa Ecaz';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/bloodlines-leader-kota-odax-of-ix.webp' where name = 'Kota Odax of Ix';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/uprising-leader-lady-amber-metulli.webp' where name = 'Lady Amber Metulli';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/uprising-leader-lady-jessica.webp' where name = 'Lady Jessica';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/uprising-leader-lady-margot-fenring.webp' where name = 'Lady Margot Fenring';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/bloodlines-leader-liet-kynes.webp' where name = 'Liet Kynes';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/uprising-leader-muad-dib.webp' where name = 'Muad''Dib';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/dune-imperium-leader-paul-atreides.webp' where name = 'Paul Atreides';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/bloodlines-leader-piter-de-vries.webp' where name = 'Piter De Vries';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/rise-of-ix-leader-prince-rhombur-vernius.webp' where name = 'Prince Rhombur Vernius';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/uprising-leader-princess-irulan.webp' where name = 'Princess Irulan';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/uprising-leader-shaddam-corrino-iv.webp' where name = 'Shaddam Corrino IV';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/uprising-leader-staban-tuek.webp' where name = 'Staban Tuek';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/bloodlines-leader-steersman-y-rkoon.webp' where name = 'Steersman Y''rkoon';
update leaders set image_url = 'https://dunecardshub.com/thumbnails/rise-of-ix-leader-tessia-vernius.webp' where name = 'Tessia Vernius';

-- ---------------------------------------------------------------------------
-- Seed: leader tier (A / B / C)
-- ---------------------------------------------------------------------------

update leaders set tier = 'A' where name = 'Staban Tuek';
update leaders set tier = 'A' where name = 'Esmar Tuek';
update leaders set tier = 'A' where name = 'Count Hasimir Fenring';
update leaders set tier = 'A' where name = 'Kota Odax of Ix';
update leaders set tier = 'A' where name = 'Tessia Vernius';
update leaders set tier = 'A' where name = 'Liet Kynes';
update leaders set tier = 'A' where name = 'Piter De Vries';
update leaders set tier = 'A' where name = 'Ilesa Ecaz';
update leaders set tier = 'A' where name = 'Prince Rhombur Vernius';

update leaders set tier = 'B' where name = 'Steersman Y''rkoon';
update leaders set tier = 'B' where name = 'Chani';
update leaders set tier = 'B' where name = 'Duncan Idaho';
update leaders set tier = 'B' where name = 'Gaius Helen Mohiam';
update leaders set tier = 'B' where name = 'Princess Irulan';
update leaders set tier = 'B' where name = 'Lady Amber Metulli';
update leaders set tier = 'B' where name = 'Gurney Halleck';
update leaders set tier = 'B' where name = 'Muad''Dib';
update leaders set tier = 'B' where name = 'Count Ilban Richese';
update leaders set tier = 'B' where name = 'Countess Ariana Thorvald';

update leaders set tier = 'C' where name = 'Baron Vladimir Harkonnen';
update leaders set tier = 'C' where name = 'Feyd-Rautha Harkonnen';
update leaders set tier = 'C' where name = 'Shaddam Corrino IV';
update leaders set tier = 'C' where name = 'Lady Margot Fenring';
update leaders set tier = 'C' where name = 'Lady Jessica';
update leaders set tier = 'C' where name = '"Princess" Yuna Moritani';
update leaders set tier = 'C' where name = 'Archduke Armand Ecaz';
update leaders set tier = 'C' where name = 'Duke Leto Atreides';
update leaders set tier = 'C' where name = 'Paul Atreides';
