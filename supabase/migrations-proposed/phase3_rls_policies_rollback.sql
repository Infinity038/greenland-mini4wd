-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 3 ROLLBACK
--
-- Restores the pre-Phase-3 state exactly: RLS disabled again on every table
-- this phase touched, all policies dropped, column-level GRANT/REVOKE
-- undone, and season_standings restored to its original SECURITY DEFINER
-- definition. This does not touch Phase 1/2 objects (auth_user_id,
-- staff_roles, has_staff_role/is_admin) — roll those back separately, and
-- only after this file, since Phase 3's policies reference them.
--
-- ROLLBACK TRIGGERS: see phase3_rls_policies_forward.sql.

begin;

-- Restore full UPDATE privilege on members/cars for `authenticated` (undo
-- the column-level REVOKE/GRANT from the forward file).
grant update on public.members to authenticated;
grant update on public.cars to authenticated;

-- Drop every policy this phase created, then disable RLS again, per table.
drop policy if exists "public read available products" on public.products;
drop policy if exists "staff manage products" on public.products;
alter table public.products disable row level security;

drop policy if exists "public read shop inventory" on public.shop_inventory;
drop policy if exists "staff manage shop inventory" on public.shop_inventory;
alter table public.shop_inventory disable row level security;

drop policy if exists "public read events" on public.events;
drop policy if exists "staff manage events" on public.events;
alter table public.events disable row level security;

drop policy if exists "public read tournaments" on public.tournaments;
drop policy if exists "staff manage tournaments" on public.tournaments;
alter table public.tournaments disable row level security;

drop policy if exists "public read race results" on public.race_results;
drop policy if exists "staff manage race results" on public.race_results;
alter table public.race_results disable row level security;

drop policy if exists "public read hall of fame" on public.hall_of_fame;
drop policy if exists "staff manage hall of fame" on public.hall_of_fame;
alter table public.hall_of_fame disable row level security;

drop policy if exists "public read hall of fame history" on public.hall_of_fame_history;
drop policy if exists "staff manage hall of fame history" on public.hall_of_fame_history;
alter table public.hall_of_fame_history disable row level security;

drop policy if exists "public read published news" on public.news_posts;
drop policy if exists "staff manage news" on public.news_posts;
alter table public.news_posts disable row level security;

drop policy if exists "public read gallery items" on public.gallery_items;
drop policy if exists "staff manage gallery items" on public.gallery_items;
alter table public.gallery_items disable row level security;

drop policy if exists "public read seasons" on public.seasons;
drop policy if exists "staff manage seasons" on public.seasons;
alter table public.seasons disable row level security;

drop policy if exists "public can sign up" on public.signups;
drop policy if exists "admin read signups" on public.signups;
alter table public.signups disable row level security;

-- Restore season_standings to its original SECURITY DEFINER definition.
drop view if exists public.season_standings;
create view public.season_standings as
select
  season_id,
  race_category,
  member_id,
  member_name,
  sum(wins) as total_wins,
  min(lap_time_seconds) as best_lap,
  count(id) as races_attended,
  sum(points_earned) as total_points,
  sum(case when position <= 3 then 1 else 0 end) as podiums,
  round((sum(wins)::numeric / nullif(count(id), 0)::numeric) * 100, 1) as win_pct,
  rank() over (
    partition by season_id, race_category
    order by sum(wins) desc, min(lap_time_seconds)
  ) as season_rank
from public.race_results rr
group by season_id, race_category, member_id, member_name;

drop policy if exists "members read own row" on public.members;
drop policy if exists "members update own row" on public.members;
drop policy if exists "staff read all members" on public.members;
drop policy if exists "staff update members" on public.members;
alter table public.members disable row level security;

drop policy if exists "racer read own cars" on public.cars;
drop policy if exists "racer insert own cars" on public.cars;
drop policy if exists "racer update own pending cars" on public.cars;
drop policy if exists "racer delete own pending cars" on public.cars;
drop policy if exists "staff manage all cars" on public.cars;
alter table public.cars disable row level security;

drop policy if exists "racer read own profile edit requests" on public.profile_edit_requests;
drop policy if exists "racer insert own profile edit requests" on public.profile_edit_requests;
drop policy if exists "staff manage profile edit requests" on public.profile_edit_requests;
alter table public.profile_edit_requests disable row level security;

drop policy if exists "racer read own loyalty points" on public.loyalty_points;
drop policy if exists "staff manage loyalty points" on public.loyalty_points;
alter table public.loyalty_points disable row level security;

drop policy if exists "racer read own points transactions" on public.points_transactions;
drop policy if exists "staff read all points transactions" on public.points_transactions;
alter table public.points_transactions disable row level security;

drop policy if exists "racer read own orders" on public.orders;
drop policy if exists "racer insert own orders" on public.orders;
drop policy if exists "staff manage all orders" on public.orders;
alter table public.orders disable row level security;

drop policy if exists "racer read own payment proofs" on public.payment_proofs;
drop policy if exists "racer insert own payment proofs" on public.payment_proofs;
drop policy if exists "staff manage payment proofs" on public.payment_proofs;
alter table public.payment_proofs disable row level security;

drop policy if exists "racer read own race tickets" on public.race_tickets;
drop policy if exists "racer insert own race tickets" on public.race_tickets;
drop policy if exists "staff manage race tickets" on public.race_tickets;
alter table public.race_tickets disable row level security;

drop policy if exists "racer read own tickets" on public.tickets;
drop policy if exists "staff manage tickets" on public.tickets;
alter table public.tickets disable row level security;

drop policy if exists "racer read own ticket transactions" on public.ticket_transactions;
drop policy if exists "staff manage ticket transactions" on public.ticket_transactions;
alter table public.ticket_transactions disable row level security;

drop policy if exists "racer read own race entries" on public.race_entries;
drop policy if exists "racer insert own race entries" on public.race_entries;
drop policy if exists "staff manage race entries" on public.race_entries;
alter table public.race_entries disable row level security;

drop policy if exists "racer manage own rsvps" on public.rsvps;
drop policy if exists "staff manage all rsvps" on public.rsvps;
alter table public.rsvps disable row level security;

drop policy if exists "racer read own referrals" on public.referrals;
drop policy if exists "staff manage referrals" on public.referrals;
alter table public.referrals disable row level security;

drop policy if exists "racer manage own wishlist" on public.wishlist;
alter table public.wishlist disable row level security;

drop policy if exists "racer read own preorders" on public.preorders;
drop policy if exists "racer insert own preorders" on public.preorders;
drop policy if exists "racer cancel own pending preorders" on public.preorders;
drop policy if exists "staff manage preorders" on public.preorders;
alter table public.preorders disable row level security;

drop policy if exists "admin manage staff roles" on public.staff_roles;
drop policy if exists "staff read own role rows" on public.staff_roles;
-- staff_roles itself stays RLS-enabled (that was Phase 2's doing, not
-- Phase 3's) — only the policies added here are dropped.

drop policy if exists "admin manage config" on public.admin_config;
alter table public.admin_config disable row level security;

drop policy if exists "admin manage discount codes" on public.discount_codes;
alter table public.discount_codes disable row level security;

drop policy if exists "admin manage discount redemptions" on public.discount_code_redemptions;
alter table public.discount_code_redemptions disable row level security;

commit;
