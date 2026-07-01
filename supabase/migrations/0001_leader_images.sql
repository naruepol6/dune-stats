-- ============================================================================
-- Migration 0001: leader card preview images
-- Adds leaders.image_url, seeds thumbnail URLs, and exposes the column through
-- the results_detail and leader_stats views.
-- Run this whole file once in the Supabase SQL editor.
-- ============================================================================

alter table leaders add column if not exists image_url text;

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
update leaders set image_url = 'https://dunecardshub.com/thumbnails/rise-of-ix-leader-tessia-vernius.webp' where name = 'Tessia Vernius';

-- ---------------------------------------------------------------------------
-- Views: expose l.image_url
-- ---------------------------------------------------------------------------

create or replace view results_detail
with (security_invoker = on) as
  select gr.id, gr.game_id, g.played_on, gr.placement,
         p.id as player_id, p.name as player_name,
         l.id as leader_id, l.name as leader_name, l.image_url
  from game_results gr
  join games   g on g.id = gr.game_id and g.deleted_at is null
  join players p on p.id = gr.player_id
  join leaders l on l.id = gr.leader_id;

create or replace view leader_stats
with (security_invoker = on) as
  select l.id as leader_id, l.name as leader_name, l.expansion, l.image_url, l.hidden,
         count(rd.id) as games,
         count(*) filter (where rd.placement = 1) as wins,
         coalesce(round(count(*) filter (where rd.placement = 1)::numeric
                        / nullif(count(rd.id), 0), 4), 0) as winrate,
         round(avg(rd.placement), 2) as avg_placement
  from leaders l
  left join results_detail rd on rd.leader_id = l.id
  group by l.id, l.name, l.expansion, l.image_url, l.hidden;
