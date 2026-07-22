-- ============================================================================
-- Migration 0004: victory points per player
-- Adds game_results.vp (nullable), threads it through the create_game /
-- update_game RPCs, and exposes it on the results_detail view.
-- Run this whole file once in the Supabase SQL editor.
-- ============================================================================

alter table game_results add column if not exists vp smallint;

-- VP is a non-negative count; guard so re-runs don't fail.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'game_results_vp_check'
  ) then
    alter table game_results add constraint game_results_vp_check check (vp is null or vp >= 0);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RPCs: carry vp from the results payload (missing/blank -> null)
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
-- View: expose gr.vp
-- ---------------------------------------------------------------------------

-- vp is appended LAST: create-or-replace can only add columns at the end of an
-- existing view, not insert them mid-list.
create or replace view results_detail
with (security_invoker = on) as
  select gr.id, gr.game_id, g.played_on, gr.placement,
         p.id as player_id, p.name as player_name,
         l.id as leader_id, l.name as leader_name, l.image_url, gr.vp
  from game_results gr
  join games   g on g.id = gr.game_id and g.deleted_at is null
  join players p on p.id = gr.player_id
  join leaders l on l.id = gr.leader_id;
