-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 5 ROLLBACK
--
-- ROLLBACK TRIGGERS: see phase5_racer_identity_qr_forward.sql.

begin;

drop policy if exists "racer read own cards" on public.racer_cards;
drop policy if exists "staff manage racer cards" on public.racer_cards;
drop table if exists public.racer_cards;

drop function if exists public.rotate_qr_token(uuid);

drop index if exists public.members_racer_id_key;
drop index if exists public.members_qr_token_key;
alter table public.members
  drop column if exists racer_id,
  drop column if exists qr_token;

commit;
