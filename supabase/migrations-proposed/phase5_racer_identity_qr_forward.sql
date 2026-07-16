-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 5 — RACER IDs, PROFILE PICTURES, QR IDENTITY, PHYSICAL-CARD RECORDS
--
-- PREREQUISITES: Phase 1-4 live (members.auth_user_id, staff_roles, RLS,
--   real admin auth). Profile pictures already have a home —
--   `members.avatar_url` already exists in the live schema; this phase does
--   NOT add a duplicate column for that, only racer_id/qr_token/cards.
--
-- CODE DEPENDENCIES (not applied in this pass): the mock QR payload format
--   already used across this branch's POS/scanner code
--   (`g4w:racer:<token>`, see lib/scanner/qrPayload.ts and
--   lib/posRacerDirectory.ts) should read `members.qr_token` as the
--   `<token>` once this phase ships, and `lookupRacerByQrToken()` should
--   become a real Supabase query instead of an in-memory mock lookup.
--
-- DATA BACKFILL: every existing member gets a racer_id and qr_token
--   assigned below. racer_id numbering is deliberately offset by 1000
--   (G4W-R-1001, G4W-R-1002, ...) specifically to avoid colliding with the
--   low mock/demo racer ID `G4W-R-0047` already hardcoded in
--   lib/posRedemption.ts's DEMO_VALID_REDEMPTION_TOKEN / test-sheet
--   constants — those are Preview-only test fixtures and must never
--   coincidentally match a real member's ID.
--
-- TESTING: confirm every members row has a non-null racer_id/qr_token after
--   backfill; confirm both unique indexes hold (no duplicates possible).
--
-- VERIFICATION QUERIES:
--   select count(*) from members where racer_id is null or qr_token is null; -- expect 0
--   select racer_id, count(*) from members group by racer_id having count(*) > 1; -- expect 0 rows
--
-- RISKS: qr_token is effectively a bearer credential (whoever holds/scans it
--   is treated as that racer at the POS) — it must be rotatable (see
--   rotate_qr_token() below) in case a card/QR is lost or compromised, and
--   never displayed/logged outside the racer's own profile view and the
--   physical card printed for them.
--
-- STOP CONDITIONS: racer_id collision detected in the verification query
--   above — do not proceed to Phase 6 until resolved.
--
-- ROLLBACK TRIGGERS: qr_token or racer_id shown to have leaked outside its
--   intended audience (e.g. logged, included in an unrelated API response).

begin;

alter table public.members
  add column if not exists racer_id text,
  add column if not exists qr_token text;

create unique index if not exists members_racer_id_key on public.members (racer_id) where racer_id is not null;
create unique index if not exists members_qr_token_key on public.members (qr_token) where qr_token is not null;

-- Backfill existing members. Offset avoids collision with the G4W-R-0047
-- mock/demo constant used by the Preview-only test tooling.
with numbered as (
  select id, row_number() over (order by created_at) as rn
  from public.members
  where racer_id is null
)
update public.members m
set racer_id = 'G4W-R-' || lpad((1000 + numbered.rn)::text, 4, '0')
from numbered
where m.id = numbered.id;

update public.members
set qr_token = encode(gen_random_bytes(16), 'hex')
where qr_token is null;

create or replace function public.rotate_qr_token(target_member_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token text;
begin
  if not (public.current_member_id() = target_member_id or public.has_staff_role(array['registration_staff','admin']::public.staff_role[])) then
    raise exception 'not authorized to rotate this racer''s QR token';
  end if;
  new_token := encode(gen_random_bytes(16), 'hex');
  update public.members set qr_token = new_token where id = target_member_id;
  return new_token;
end;
$$;

-- Physical card issuance/revocation history — one member can have several
-- rows over time (lost/replaced cards), only the latest 'active' one is
-- valid at the POS.
create table public.racer_cards (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  card_uid text not null unique,
  status text not null default 'active' check (status in ('active', 'revoked', 'lost')),
  issued_at timestamptz not null default now(),
  issued_by uuid references auth.users(id),
  revoked_at timestamptz,
  revoked_reason text
);

alter table public.racer_cards enable row level security;
create policy "racer read own cards" on public.racer_cards
  for select using (member_id = public.current_member_id());
create policy "staff manage racer cards" on public.racer_cards
  for all using (public.has_staff_role(array['registration_staff','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['registration_staff','admin']::public.staff_role[]));

commit;
