-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 6 — CLUB CAR IDs AND CAR QR RECORDS
--
-- PREREQUISITES: Phase 5 live (mirrors the same racer_id/qr_token pattern,
--   applied to `cars` instead of `members`).
--
-- CODE DEPENDENCIES (not applied in this pass): lib/posCarDirectory.ts's
--   mock `lookupCarByQrToken()` becomes a real query against
--   `cars.qr_token` once this ships.
--
-- DATA BACKFILL: every existing `cars` row (5 live rows) gets a
--   club_car_id and qr_token below, in the same numbering-offset style as
--   Phase 5 to avoid colliding with the `G4W-C-...`-shaped mock constants
--   used by the Preview-only POS/QR test tooling (verify the exact mock
--   prefix/format in lib/posCarDirectory.ts before running — this file
--   uses a placeholder offset, not a value copied from that mock data, to
--   avoid this migration silently going stale if the mock format changes).
--
-- TESTING / VERIFICATION QUERIES: same pattern as Phase 5.
--   select count(*) from cars where club_car_id is null or qr_token is null; -- expect 0
--   select club_car_id, count(*) from cars group by club_car_id having count(*) > 1; -- expect 0 rows
--
-- RISKS: a car's qr_token is scoped to identify the car, not its owner —
--   confirm the RLS policy below (owner + staff only) matches how the POS
--   is actually meant to use it (e.g. does event check-in staff need to
--   scan ANY car regardless of current owner, independent of the owning
--   racer's own session? if so, the "staff manage" policy already covers
--   that; this note exists so that's a deliberate, reviewed answer rather
--   than an assumption).
--
-- STOP CONDITIONS: club_car_id collision detected in the verification
--   query above.
--
-- ROLLBACK TRIGGERS: see phase6_club_car_qr_rollback.sql.

begin;

alter table public.cars
  add column if not exists club_car_id text,
  add column if not exists qr_token text;

create unique index if not exists cars_club_car_id_key on public.cars (club_car_id) where club_car_id is not null;
create unique index if not exists cars_qr_token_key on public.cars (qr_token) where qr_token is not null;

with numbered as (
  select id, row_number() over (order by created_at) as rn
  from public.cars
  where club_car_id is null
)
update public.cars c
set club_car_id = 'G4W-C-' || lpad((1000 + numbered.rn)::text, 4, '0')
from numbered
where c.id = numbered.id;

update public.cars
set qr_token = encode(gen_random_bytes(16), 'hex')
where qr_token is null;

create or replace function public.rotate_car_qr_token(target_car_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token text;
  owner_email text;
begin
  select member_email into owner_email from public.cars where id = target_car_id;
  if not (
    owner_email = (select email from public.members where auth_user_id = auth.uid())
    or public.has_staff_role(array['registration_staff','admin']::public.staff_role[])
  ) then
    raise exception 'not authorized to rotate this car''s QR token';
  end if;
  new_token := encode(gen_random_bytes(16), 'hex');
  update public.cars set qr_token = new_token where id = target_car_id;
  return new_token;
end;
$$;

commit;
