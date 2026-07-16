-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 12 — PRESERVE AND DEPRECATE MEMBERSHIP-DAY AND DIGITAL-TICKET SYSTEMS
--
-- PREREQUISITES: Phase 1-10 live, in particular the new in-person Race
--   Check-In model (race_entries + check_in_racer(), Phase 10) which is what
--   actually replaces `tickets` / `race_tickets` / `ticket_transactions` and
--   the `membership_expires_at`-driven membership-day concept. This phase
--   NEVER deletes a row — it freezes new writes to the legacy tables/columns
--   and marks them clearly, preserving every existing row for historical
--   reporting (member history, past purchases, past race participation).
--
-- CODE DEPENDENCIES (not applied in this pass): any remaining app code path
--   that still creates `tickets`/`race_tickets` rows or reads
--   `membership_expires_at` to gate a feature should already have been
--   replaced by the Race Check-In / Racer Identity flow (per this branch's
--   prior "Race-entry-in-person-only migration" and "Racer Identity & Race
--   Check-In model" work) before this phase ships — this phase's REVOKE
--   statements will turn any code that still tries to INSERT into these
--   tables into a hard failure (42501), which is the intended safety net,
--   not a bug.
--
-- DATA BACKFILL: none — existing rows are preserved exactly as-is, only
--   flagged with `deprecated_at`.
--
-- TESTING: confirm historical reads (member profile "past tickets" list,
--   admin reporting) still work read-only after this phase; confirm a
--   fresh INSERT attempt against any of the 3 tables fails for
--   `authenticated`.
--
-- VERIFICATION QUERIES:
--   select count(*) from tickets where deprecated_at is null; -- expect 0
--   select count(*) from race_tickets where deprecated_at is null; -- expect 0
--   select count(*) from ticket_transactions where deprecated_at is null; -- expect 0
--
-- RISKS: freezing writes before the replacement flow is fully live in
--   Production would break active ticket purchases — confirm Race Check-In
--   is the live, exclusive path before running this, not just built.
--
-- STOP CONDITIONS: any Production code path still depends on inserting into
--   these 3 tables at the time this phase is considered.
--
-- ROLLBACK TRIGGERS: a legitimate historical correction is needed and the
-- admin-only exception below turns out to be insufficient — re-open staff
-- write access via the rollback rather than editing this phase's policies
-- ad hoc.

begin;

alter table public.tickets add column if not exists deprecated_at timestamptz;
alter table public.race_tickets add column if not exists deprecated_at timestamptz;
alter table public.ticket_transactions add column if not exists deprecated_at timestamptz;

update public.tickets set deprecated_at = now() where deprecated_at is null;
update public.race_tickets set deprecated_at = now() where deprecated_at is null;
update public.ticket_transactions set deprecated_at = now() where deprecated_at is null;

comment on table public.tickets is
  'DEPRECATED as of Phase 12 — historical read-only, superseded by race_entries + in-person Race Check-In (Phase 10). Do not insert new rows.';
comment on table public.race_tickets is
  'DEPRECATED as of Phase 12 — historical read-only, superseded by race_entries + in-person Race Check-In (Phase 10). Do not insert new rows.';
comment on table public.ticket_transactions is
  'DEPRECATED as of Phase 12 — historical read-only, superseded by race_entries + in-person Race Check-In (Phase 10). Do not insert new rows.';
comment on column public.members.membership_expires_at is
  'DEPRECATED as of Phase 12 — legacy membership-day system, superseded by per-event Race Check-In payment. Preserved for historical member records only.';

-- Freeze new writes — historical corrections, if ever truly needed, are an
-- admin-only exception, not a general staff or racer capability anymore.
drop policy if exists "racer insert own tickets" on public.tickets;
drop policy if exists "staff manage tickets" on public.tickets;
create policy "admin manage legacy tickets" on public.tickets
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "racer insert own race tickets" on public.race_tickets;
drop policy if exists "staff manage race tickets" on public.race_tickets;
create policy "admin manage legacy race tickets" on public.race_tickets
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "staff manage ticket transactions" on public.ticket_transactions;
create policy "admin manage legacy ticket transactions" on public.ticket_transactions
  for all using (public.is_admin()) with check (public.is_admin());

commit;
