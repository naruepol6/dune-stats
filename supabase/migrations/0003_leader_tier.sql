-- ============================================================================
-- Migration 0003: leader tier (A / B / C)
-- Adds leaders.tier (constrained to A/B/C), seeds each leader's tier, and
-- exposes the column through the leader_stats view.
-- Run this whole file once in the Supabase SQL editor.
-- ============================================================================

alter table leaders add column if not exists tier text;

-- Constrain to the three tiers; guard so re-runs don't fail.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leaders_tier_check'
  ) then
    alter table leaders add constraint leaders_tier_check check (tier in ('A', 'B', 'C'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Seed: tier per leader
-- ---------------------------------------------------------------------------

-- A tier
update leaders set tier = 'A' where name = 'Staban Tuek';
update leaders set tier = 'A' where name = 'Esmar Tuek';
update leaders set tier = 'A' where name = 'Count Hasimir Fenring';
update leaders set tier = 'A' where name = 'Kota Odax of Ix';
update leaders set tier = 'A' where name = 'Tessia Vernius';
update leaders set tier = 'A' where name = 'Liet Kynes';
update leaders set tier = 'A' where name = 'Piter De Vries';
update leaders set tier = 'A' where name = 'Ilesa Ecaz';
update leaders set tier = 'A' where name = 'Prince Rhombur Vernius';

-- B tier
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

-- C tier
update leaders set tier = 'C' where name = 'Baron Vladimir Harkonnen';
update leaders set tier = 'C' where name = 'Feyd-Rautha Harkonnen';
update leaders set tier = 'C' where name = 'Shaddam Corrino IV';
update leaders set tier = 'C' where name = 'Lady Margot Fenring';
update leaders set tier = 'C' where name = 'Lady Jessica';
update leaders set tier = 'C' where name = '"Princess" Yuna Moritani';
update leaders set tier = 'C' where name = 'Archduke Armand Ecaz';
update leaders set tier = 'C' where name = 'Duke Leto Atreides';
update leaders set tier = 'C' where name = 'Paul Atreides';

-- ---------------------------------------------------------------------------
-- View: expose l.tier
-- ---------------------------------------------------------------------------

-- tier is appended LAST: create-or-replace can only add columns at the end of
-- an existing view, not insert them mid-list.
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
