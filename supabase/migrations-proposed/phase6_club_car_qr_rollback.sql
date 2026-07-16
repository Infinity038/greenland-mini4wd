-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 6 ROLLBACK

begin;

drop function if exists public.rotate_car_qr_token(uuid);

drop index if exists public.cars_club_car_id_key;
drop index if exists public.cars_qr_token_key;
alter table public.cars
  drop column if exists club_car_id,
  drop column if exists qr_token;

commit;
