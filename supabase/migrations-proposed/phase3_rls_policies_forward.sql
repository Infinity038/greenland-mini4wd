-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 3 — RLS POLICIES, INTRODUCED TABLE GROUP BY TABLE GROUP
--
-- Full target-state matrix: docs/RLS-POLICY-MATRIX.md. This single file
-- implements Groups A (public read-only), B (racer-owned), C (staff-managed)
-- and D (admin-only) together, in dependency order, but each group is its
-- own clearly-labeled section below so it can be reasoned about (and, if
-- truly necessary, applied) independently.
--
-- PREREQUISITES: Phase 1 (members.auth_user_id, current_member_id()) and
--   Phase 2 (staff_roles, has_staff_role(), is_admin()) already applied and
--   verified. A bootstrap admin row must already exist in staff_roles
--   (Phase 2's manual step) — otherwise NO ONE can manage Group D tables
--   the moment this phase ships, including admin_config and staff_roles
--   itself.
--
-- CODE DEPENDENCIES (not applied in this pass):
--   - Every client query against a Group B table must filter/insert using
--     the authenticated user's own identity implicitly (RLS enforces this
--     server-side regardless, but client code should stop passing
--     member_email as a query parameter it trusts from local state).
--   - Client code must stop attempting to set `status`, `payment_status`,
--     `points_awarded`, `role`, or any other staff/system-controlled column
--     directly — those columns are no longer writable by `authenticated`
--     at the Postgres privilege level (see per-table REVOKE/GRANT below),
--     so such writes will now fail loudly (42501) instead of silently
--     succeeding.
--   - `lib/member.ts`, `lib/loyalty.ts`, `app/orders/page.tsx`,
--     `app/admin/*`: every `.select('*')` on `members` should already be an
--     explicit column list (Phase 0 recommendation) before this phase ships,
--     since `select('*')` against a row the policy denies will now return an
--     error/empty result where it previously returned everything.
--
-- DATA BACKFILL: none.
--
-- TESTING: docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md §4, especially §4.3 —
--   a page that used to "work" under no-RLS can now return an empty result
--   set instead of an error if a policy is missing or too narrow. Smoke-test
--   every page listed in docs/RLS-POLICY-MATRIX.md against a branch with
--   real seeded data before this touches Production.
--
-- VERIFICATION QUERIES:
--   select tablename, rowsecurity from pg_tables where schemaname='public' order by 1;
--     -- expect rowsecurity = true for all 29 tables after this phase.
--   select tablename, count(*) from pg_policies where schemaname='public' group by 1 order by 1;
--     -- expect at least 1 policy per table (default-deny is fine for tables
--     -- intentionally given no public/racer/staff policy, e.g. discount_codes).
--
-- RISKS: this is the single highest-blast-radius phase in the whole plan —
--   it is the first point where Production behavior can change for every
--   visitor, not just staff/admin. Apply table-group by table-group on the
--   branch, never all 29 tables in one untested step, even though they are
--   captured in one file here for review purposes.
--
-- STOP CONDITIONS:
--   - Any smoke-tested page returns fewer rows than the same page returned
--     pre-Phase-3 for the same underlying data.
--   - `has_staff_role()`/`is_admin()` returns unexpected results for the
--     bootstrap admin session.
--
-- ROLLBACK TRIGGERS: any Production page silently showing empty/missing
-- data that used to show real data, traced to a missing/too-narrow policy
-- rather than an unrelated bug.

begin;

-- ════════════════════════════════════════════════════════════════════
-- GROUP A — PUBLIC READ-ONLY
-- ════════════════════════════════════════════════════════════════════

alter table public.products enable row level security;
create policy "public read available products" on public.products
  for select using (available = true);
create policy "staff manage products" on public.products
  for all using (public.has_staff_role(array['shop_staff','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['shop_staff','admin']::public.staff_role[]));

alter table public.shop_inventory enable row level security;
create policy "public read shop inventory" on public.shop_inventory
  for select using (true);
create policy "staff manage shop inventory" on public.shop_inventory
  for all using (public.has_staff_role(array['shop_staff','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['shop_staff','admin']::public.staff_role[]));

alter table public.events enable row level security;
create policy "public read events" on public.events for select using (true);
create policy "staff manage events" on public.events
  for all using (public.has_staff_role(array['registration_staff','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['registration_staff','admin']::public.staff_role[]));

alter table public.tournaments enable row level security;
create policy "public read tournaments" on public.tournaments for select using (true);
create policy "staff manage tournaments" on public.tournaments
  for all using (public.has_staff_role(array['registration_staff','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['registration_staff','admin']::public.staff_role[]));

alter table public.race_results enable row level security;
create policy "public read race results" on public.race_results for select using (true);
create policy "staff manage race results" on public.race_results
  for all using (public.has_staff_role(array['race_marshal','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['race_marshal','admin']::public.staff_role[]));

alter table public.hall_of_fame enable row level security;
create policy "public read hall of fame" on public.hall_of_fame for select using (true);
create policy "staff manage hall of fame" on public.hall_of_fame
  for all using (public.has_staff_role(array['race_marshal','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['race_marshal','admin']::public.staff_role[]));

alter table public.hall_of_fame_history enable row level security;
create policy "public read hall of fame history" on public.hall_of_fame_history for select using (true);
create policy "staff manage hall of fame history" on public.hall_of_fame_history
  for all using (public.has_staff_role(array['race_marshal','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['race_marshal','admin']::public.staff_role[]));

alter table public.news_posts enable row level security;
create policy "public read published news" on public.news_posts for select using (published = true);
create policy "staff manage news" on public.news_posts
  for all using (public.has_staff_role(array['admin']::public.staff_role[]))
  with check (public.has_staff_role(array['admin']::public.staff_role[]));

-- gallery_items currently has no `published` column (confirmed schema audit)
-- — public read stays unfiltered until a published/hidden concept is added;
-- flagged as a known gap in docs/RLS-POLICY-MATRIX.md rather than silently
-- assumed.
alter table public.gallery_items enable row level security;
create policy "public read gallery items" on public.gallery_items for select using (true);
create policy "staff manage gallery items" on public.gallery_items
  for all using (public.has_staff_role(array['admin']::public.staff_role[]))
  with check (public.has_staff_role(array['admin']::public.staff_role[]));

alter table public.seasons enable row level security;
create policy "public read seasons" on public.seasons for select using (true);
create policy "staff manage seasons" on public.seasons
  for all using (public.has_staff_role(array['race_marshal','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['race_marshal','admin']::public.staff_role[]));

-- signups: public can insert (newsletter-style), nobody but admin can read.
alter table public.signups enable row level security;
create policy "public can sign up" on public.signups for insert with check (true);
create policy "admin read signups" on public.signups for select using (public.is_admin());

-- season_standings: remove SECURITY DEFINER by recreating with
-- security_invoker = true, so it runs with the querying user's own RLS on
-- race_results rather than the view creator's privileges.
drop view if exists public.season_standings;
create view public.season_standings
with (security_invoker = true)
as
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
from public.race_results
group by season_id, race_category, member_id, member_name;

-- ════════════════════════════════════════════════════════════════════
-- GROUP B — RACER-OWNED PRIVATE DATA (+ Group C staff access on the
-- same tables, combined here since most of these tables need both)
-- ════════════════════════════════════════════════════════════════════

-- members ---------------------------------------------------------------
alter table public.members enable row level security;
create policy "members read own row" on public.members
  for select using (auth_user_id = auth.uid());
create policy "members update own row" on public.members
  for update using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());
create policy "staff read all members" on public.members
  for select using (public.has_staff_role(array['registration_staff','admin']::public.staff_role[]));
create policy "staff update members" on public.members
  for update using (public.has_staff_role(array['registration_staff','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['registration_staff','admin']::public.staff_role[]));
-- Column-level guard: a racer's own UPDATE (per the row policy above) may
-- still only touch their own contact/profile fields — status, points, rank,
-- loyalty tier and password_hash stay staff/system-only even though the row
-- policy would otherwise permit the UPDATE.
revoke update on public.members from authenticated;
grant update (first_name, last_name, phone, nationality, city, experience, favorite_chassis, name, avatar_url)
  on public.members to authenticated;

-- cars --------------------------------------------------------------------
alter table public.cars enable row level security;
create policy "racer read own cars" on public.cars
  for select using (member_email = (select email from public.members where auth_user_id = auth.uid()));
create policy "racer insert own cars" on public.cars
  for insert with check (
    member_email = (select email from public.members where auth_user_id = auth.uid())
    and status = 'pending'
  );
create policy "racer update own pending cars" on public.cars
  for update using (member_email = (select email from public.members where auth_user_id = auth.uid()))
  with check (member_email = (select email from public.members where auth_user_id = auth.uid()));
create policy "racer delete own pending cars" on public.cars
  for delete using (
    member_email = (select email from public.members where auth_user_id = auth.uid())
    and status = 'pending'
  );
create policy "staff manage all cars" on public.cars
  for all using (public.has_staff_role(array['registration_staff','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['registration_staff','admin']::public.staff_role[]));
revoke update on public.cars from authenticated;
grant update (name, chassis, series, color, image_url, bought_from, notes) on public.cars to authenticated;

-- profile_edit_requests -----------------------------------------------------
alter table public.profile_edit_requests enable row level security;
create policy "racer read own profile edit requests" on public.profile_edit_requests
  for select using (member_id = public.current_member_id());
create policy "racer insert own profile edit requests" on public.profile_edit_requests
  for insert with check (member_id = public.current_member_id() and status = 'pending');
create policy "staff manage profile edit requests" on public.profile_edit_requests
  for all using (public.has_staff_role(array['registration_staff','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['registration_staff','admin']::public.staff_role[]));

-- loyalty_points (read-only for racer; system/staff-managed writes) --------
alter table public.loyalty_points enable row level security;
create policy "racer read own loyalty points" on public.loyalty_points
  for select using (member_id = public.current_member_id());
create policy "staff manage loyalty points" on public.loyalty_points
  for all using (public.has_staff_role(array['admin']::public.staff_role[]))
  with check (public.has_staff_role(array['admin']::public.staff_role[]));

-- points_transactions (append-only ledger; no direct client writes at all) --
alter table public.points_transactions enable row level security;
create policy "racer read own points transactions" on public.points_transactions
  for select using (member_id = public.current_member_id());
create policy "staff read all points transactions" on public.points_transactions
  for select using (public.has_staff_role(array['shop_staff','admin']::public.staff_role[]));
-- Deliberately no INSERT/UPDATE/DELETE policy for authenticated at all —
-- rows are written exclusively by SECURITY DEFINER ledger functions
-- introduced in Phase 8, which re-check the caller's identity/role
-- themselves before writing.

-- orders --------------------------------------------------------------------
alter table public.orders enable row level security;
create policy "racer read own orders" on public.orders
  for select using (member_email = (select email from public.members where auth_user_id = auth.uid()));
create policy "racer insert own orders" on public.orders
  for insert with check (
    member_email = (select email from public.members where auth_user_id = auth.uid())
    and status = 'pending'
    and payment_status = 'awaiting_payment'
    and coalesce(points_awarded, 0) = 0
    and coalesce(rewards_applied, false) = false
  );
create policy "staff manage all orders" on public.orders
  for all using (public.has_staff_role(array['shop_staff','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['shop_staff','admin']::public.staff_role[]));
-- Racers never get an UPDATE policy on orders at all — cancellation goes
-- through a staff/RPC path (Phase 9), not a raw client UPDATE.

-- payment_proofs --------------------------------------------------------------
alter table public.payment_proofs enable row level security;
create policy "racer read own payment proofs" on public.payment_proofs
  for select using (
    member_email = (select email from public.members where auth_user_id = auth.uid())
  );
create policy "racer insert own payment proofs" on public.payment_proofs
  for insert with check (
    member_email = (select email from public.members where auth_user_id = auth.uid())
    and status = 'pending'
  );
create policy "staff manage payment proofs" on public.payment_proofs
  for all using (public.has_staff_role(array['shop_staff','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['shop_staff','admin']::public.staff_role[]));

-- race_tickets / tickets / ticket_transactions --------------------------------
alter table public.race_tickets enable row level security;
create policy "racer read own race tickets" on public.race_tickets
  for select using (member_email = (select email from public.members where auth_user_id = auth.uid()));
create policy "racer insert own race tickets" on public.race_tickets
  for insert with check (
    member_email = (select email from public.members where auth_user_id = auth.uid())
    and payment_status = 'awaiting_payment'
  );
create policy "staff manage race tickets" on public.race_tickets
  for all using (public.has_staff_role(array['checkin_staff','shop_staff','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['checkin_staff','shop_staff','admin']::public.staff_role[]));

alter table public.tickets enable row level security;
create policy "racer read own tickets" on public.tickets
  for select using (member_email = (select email from public.members where auth_user_id = auth.uid()));
create policy "staff manage tickets" on public.tickets
  for all using (public.has_staff_role(array['checkin_staff','shop_staff','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['checkin_staff','shop_staff','admin']::public.staff_role[]));

alter table public.ticket_transactions enable row level security;
create policy "racer read own ticket transactions" on public.ticket_transactions
  for select using (member_email = (select email from public.members where auth_user_id = auth.uid()));
create policy "staff manage ticket transactions" on public.ticket_transactions
  for all using (public.has_staff_role(array['checkin_staff','shop_staff','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['checkin_staff','shop_staff','admin']::public.staff_role[]));

-- race_entries (check-in) ------------------------------------------------------
alter table public.race_entries enable row level security;
create policy "racer read own race entries" on public.race_entries
  for select using (member_email = (select email from public.members where auth_user_id = auth.uid()));
create policy "racer insert own race entries" on public.race_entries
  for insert with check (
    member_email = (select email from public.members where auth_user_id = auth.uid())
  );
create policy "staff manage race entries" on public.race_entries
  for all using (public.has_staff_role(array['checkin_staff','race_marshal','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['checkin_staff','race_marshal','admin']::public.staff_role[]));

-- rsvps -------------------------------------------------------------------------
alter table public.rsvps enable row level security;
create policy "racer manage own rsvps" on public.rsvps
  for all using (member_email = (select email from public.members where auth_user_id = auth.uid()))
  with check (member_email = (select email from public.members where auth_user_id = auth.uid()));
create policy "staff manage all rsvps" on public.rsvps
  for all using (public.has_staff_role(array['registration_staff','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['registration_staff','admin']::public.staff_role[]));

-- referrals -----------------------------------------------------------------------
alter table public.referrals enable row level security;
create policy "racer read own referrals" on public.referrals
  for select using (
    referrer_email = (select email from public.members where auth_user_id = auth.uid())
    or referred_email = (select email from public.members where auth_user_id = auth.uid())
  );
create policy "staff manage referrals" on public.referrals
  for all using (public.has_staff_role(array['admin']::public.staff_role[]))
  with check (public.has_staff_role(array['admin']::public.staff_role[]));
-- No client INSERT policy — referral rows are created by a system function
-- on qualifying signup, not a direct client write.

-- wishlist ------------------------------------------------------------------------
alter table public.wishlist enable row level security;
create policy "racer manage own wishlist" on public.wishlist
  for all using (member_email = (select email from public.members where auth_user_id = auth.uid()))
  with check (member_email = (select email from public.members where auth_user_id = auth.uid()));

-- preorders -----------------------------------------------------------------------
alter table public.preorders enable row level security;
create policy "racer read own preorders" on public.preorders
  for select using (member_email = (select email from public.members where auth_user_id = auth.uid()));
create policy "racer insert own preorders" on public.preorders
  for insert with check (
    member_email = (select email from public.members where auth_user_id = auth.uid())
    and status = 'pending'
  );
create policy "racer cancel own pending preorders" on public.preorders
  for delete using (
    member_email = (select email from public.members where auth_user_id = auth.uid())
    and status = 'pending'
  );
create policy "staff manage preorders" on public.preorders
  for all using (public.has_staff_role(array['shop_staff','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['shop_staff','admin']::public.staff_role[]));

-- ════════════════════════════════════════════════════════════════════
-- GROUP D — ADMIN-ONLY
-- ════════════════════════════════════════════════════════════════════

create policy "admin manage staff roles" on public.staff_roles
  for all using (public.is_admin()) with check (public.is_admin());
create policy "staff read own role rows" on public.staff_roles
  for select using (user_id = auth.uid());

alter table public.admin_config enable row level security;
create policy "admin manage config" on public.admin_config
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.discount_codes enable row level security;
create policy "admin manage discount codes" on public.discount_codes
  for all using (public.is_admin()) with check (public.is_admin());
-- Deliberately no public SELECT — a discount code is validated through a
-- SECURITY DEFINER RPC (checks code/expiry/usage without exposing the
-- table), not by letting clients browse it directly.

alter table public.discount_code_redemptions enable row level security;
create policy "admin manage discount redemptions" on public.discount_code_redemptions
  for all using (public.is_admin()) with check (public.is_admin());

commit;
