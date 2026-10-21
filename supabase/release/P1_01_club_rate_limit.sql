-- ============================================================================================================
-- DEV-ONLY - NOT APPLIED ANYWHERE. Persistent rate limiting for PUBLIC server routes (registration, inquiry, ...).
-- A fixed-window counter in the database, shared by every server instance (the in-memory limiter is per instance only).
-- Callable by the anonymous role because the public routes themselves are anonymous. Known limit, accepted for low-value public
-- forms: a caller who talks to the database directly can name any bucket, so they could use up another visitor's allowance
-- (a nuisance for one address, not a data exposure). The counters table is sealed: nobody can read or write it directly.
-- Production alternative with the same interface: a managed KV (Upstash / Vercel KV). Decision pending with the owner.
-- ============================================================================================================
begin;

create table public.rate_limit_counters (
  bucket       text not null check (char_length(bucket) between 1 and 160),
  window_start timestamptz not null,
  hits         int not null default 0 check (hits >= 0),
  primary key (bucket, window_start)
);
alter table public.rate_limit_counters enable row level security; alter table public.rate_limit_counters force row level security;
revoke all on public.rate_limit_counters from public, anon, authenticated;

create function public.rate_limit_hit(p_bucket text, p_window_seconds int, p_max int)
returns table(allowed boolean, retry_after int)
language plpgsql volatile security definer set search_path = pg_catalog, pg_temp as $$
declare ws timestamptz; h int;
begin
  if p_bucket is null or char_length(p_bucket) not between 1 and 160 or p_window_seconds is null or p_window_seconds not between 1 and 86400 or p_max is null or p_max not between 1 and 10000 then
    raise exception 'invalid rate limit request' using errcode = '22023';
  end if;
  ws := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limit_counters(bucket, window_start, hits) values (p_bucket, ws, 1)
  on conflict (bucket, window_start) do update set hits = public.rate_limit_counters.hits + 1
  returning public.rate_limit_counters.hits into h;
  if random() < 0.02 then delete from public.rate_limit_counters where window_start < now() - interval '2 days'; end if;   -- bounded table size
  allowed := h <= p_max;
  retry_after := greatest(1, ceil(extract(epoch from (ws + make_interval(secs => p_window_seconds) - now())))::int);
  return next;
end $$;

revoke all on function public.rate_limit_hit(text, int, int) from public;
grant execute on function public.rate_limit_hit(text, int, int) to anon, authenticated;
commit;
