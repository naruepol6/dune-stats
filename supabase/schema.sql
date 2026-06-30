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
    insert into game_results(game_id, player_id, leader_id, placement)
      values (gid, (r->>'player_id')::uuid, (r->>'leader_id')::uuid, (r->>'placement')::smallint);
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
    insert into game_results(game_id, player_id, leader_id, placement)
      values (p_game_id, (r->>'player_id')::uuid, (r->>'leader_id')::uuid, (r->>'placement')::smallint);
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
         l.id as leader_id, l.name as leader_name
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
         round(avg(rd.placement), 2) as avg_placement
  from leaders l
  left join results_detail rd on rd.leader_id = l.id
  group by l.id, l.name, l.expansion, l.hidden;

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
