-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 10 ROLLBACK

begin;

drop function if exists public.record_race_result(uuid, uuid, text, date, integer, numeric, integer, integer, text, text);
alter table public.race_results drop column if exists recorded_by;

drop function if exists public.check_in_racer(uuid);
alter table public.race_entries
  drop column if exists checked_in_at,
  drop column if exists checked_in_by;

commit;
