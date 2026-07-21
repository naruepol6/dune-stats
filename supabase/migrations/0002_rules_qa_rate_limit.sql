-- Per-IP rate limiting for the Rules Q&A endpoint (api/rules-qa.ts).
--
-- The endpoint calls an LLM, so an open, unauthenticated caller is a cost
-- exposure. This table + function let the serverless function cap how many
-- questions a single IP can ask per rolling window. The function is only
-- reachable with the service-role key (which the frontend never has), so the
-- table is not exposed through the public API.
--
-- Rate limiting is optional: if SUPABASE_SERVICE_ROLE_KEY is not configured for
-- the function, it simply skips this check and the endpoint stays open.
--
-- Apply this in the Supabase SQL editor (same place you ran schema.sql).

create table if not exists public.rules_qa_rate_limit (
  ip text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);

-- RLS on with no policies: anon/authenticated cannot read or write. Only the
-- service role (which bypasses RLS) and the SECURITY DEFINER function below
-- can touch it.
alter table public.rules_qa_rate_limit enable row level security;

-- Atomically records a hit for p_ip and returns whether it is within the limit.
-- Resets the counter once the current window has elapsed.
create or replace function public.rules_qa_rate_check(
  p_ip text,
  p_max int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.rules_qa_rate_limit as r (ip, window_start, count)
    values (p_ip, now(), 1)
  on conflict (ip) do update
    set
      count = case
        when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
        else r.count + 1
      end,
      window_start = case
        when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
        else r.window_start
      end
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

revoke all on function public.rules_qa_rate_check(text, int, int) from public, anon, authenticated;
grant execute on function public.rules_qa_rate_check(text, int, int) to service_role;
