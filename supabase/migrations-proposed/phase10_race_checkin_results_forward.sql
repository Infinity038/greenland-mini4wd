-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 10 — RACE CHECK-IN, EVENT PAYMENTS, OFFICIAL RESULTS, LEADERBOARD
--
-- PREREQUISITES: Phase 1-9 live. `race_entries`, `race_results`,
--   `race_tickets`/`tickets`, `tournaments`, and the fixed `season_standings`
--   view (Phase 3) already exist and already have RLS — this phase adds the
--   missing check-in workflow and result accountability columns, it does
--   not recreate the base tables.
--
-- CODE DEPENDENCIES (not applied in this pass): app/race-check-in/page.tsx
--   (already exists in this branch as an in-person RSVP+payment flow) calls
--   check_in_racer() below at the point staff confirm a racer has physically
--   arrived, instead of a raw client UPDATE on race_entries.status.
--
-- DATA BACKFILL: none — the 1 live `race_entries` row keeps
--   checked_in_at/checked_in_by NULL (unknown historically), which is
--   correct (means "not recorded," not "didn't check in").
--
-- TESTING: check_in_racer() rejects non-staff callers; calling it twice on
--   the same race_entries row is a no-op the second time (idempotent, since
--   the WHERE clause requires checked_in_at is null).
--
-- VERIFICATION QUERIES:
--   select count(*) from race_entries where checked_in_at is not null and checked_in_by is null;
--     -- expect 0: every checked-in row must record who did it.
--
-- RISKS: `race_entries.status` has no CHECK constraint in the live schema
--   (confirmed via audit), so adding the 'checked_in' value needs no schema
--   change, but also means nothing currently prevents an arbitrary string —
--   worth a follow-up CHECK constraint once the full status vocabulary is
--   finalized with the project owner.
--
-- STOP CONDITIONS: none specific beyond the general per-phase gate.
--
-- ROLLBACK TRIGGERS: see phase10_race_checkin_results_rollback.sql.

begin;

alter table public.race_entries
  add column if not exists checked_in_at timestamptz,
  add column if not exists checked_in_by uuid references auth.users(id);

create or replace function public.check_in_racer(p_race_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_staff_role(array['checkin_staff', 'race_marshal', 'admin']::public.staff_role[]) then
    raise exception 'not authorized to check in racers';
  end if;
  update public.race_entries
  set checked_in_at = now(), checked_in_by = auth.uid(), status = 'checked_in'
  where id = p_race_entry_id and checked_in_at is null;
end;
$$;

alter table public.race_results
  add column if not exists recorded_by uuid references auth.users(id);

create or replace function public.record_race_result(
  p_season_id uuid, p_member_id uuid, p_member_name text, p_race_date date,
  p_position integer, p_lap_time_seconds numeric, p_wins integer,
  p_points_earned integer, p_race_category text, p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if not public.has_staff_role(array['race_marshal', 'admin']::public.staff_role[]) then
    raise exception 'not authorized to record race results';
  end if;
  insert into public.race_results (
    season_id, member_id, member_name, race_date, position,
    lap_time_seconds, wins, points_earned, race_category, notes, recorded_by
  ) values (
    p_season_id, p_member_id, p_member_name, p_race_date, p_position,
    p_lap_time_seconds, p_wins, p_points_earned, p_race_category, p_notes, auth.uid()
  ) returning id into new_id;
  return new_id;
end;
$$;

commit;
