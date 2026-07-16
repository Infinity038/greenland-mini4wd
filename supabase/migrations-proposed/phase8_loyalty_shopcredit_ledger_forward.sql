-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 8 — APPEND-ONLY LOYALTY POINTS AND SHOP CREDIT LEDGERS
--
-- PREREQUISITES: Phase 1-7 live. `points_transactions` and `loyalty_points`
--   already exist in the live schema (pre-dating this branch); this phase
--   does not recreate them, it (a) adds the missing Shop Credit equivalent,
--   which has no live counterpart at all today, and (b) TIGHTENS Phase 3's
--   "staff manage loyalty points" policy from a blanket admin `for all` down
--   to select-only, forcing every balance change through the ledger
--   functions below — see the REVOKE statements, which deliberately narrow
--   what Phase 3 granted.
--
-- CODE DEPENDENCIES (not applied in this pass): app/admin/loyalty/page.tsx
--   and any order/race-ticket completion path that currently writes
--   `orders.points_awarded` / `race_tickets.points_awarded` /
--   `rewards_applied` directly should call award_points()/redeem_points()
--   below instead, so the ledger and the denormalized balance never drift
--   apart. A Shop Credit UI does not exist yet in this branch and needs to
--   be designed before add_shop_credit()/redeem_shop_credit() are called
--   from anywhere.
--
-- DATA BACKFILL: none automatic. The 7 live `members` rows already have
--   `total_points`/`loyalty_progress` values with no corresponding
--   `points_transactions` history (those fields predate the ledger
--   concept). A one-time reconciling entry per member (type
--   'manual_adjustment', amount = their current total_points, description
--   'pre-ledger balance carried forward') should be inserted so the ledger
--   sum matches the existing balance going forward — do this as a reviewed,
--   one-off statement after confirming the current totals, not blindly
--   averaged in this file.
--
-- TESTING: award_points/redeem_points/add_shop_credit/redeem_shop_credit all
--   reject calls from a non-staff session; redeem_* reject amounts
--   exceeding the current balance; the ledger table and the denormalized
--   balance table agree after a sequence of test calls on a branch.
--
-- VERIFICATION QUERIES:
--   -- Ledger integrity: sum of points_transactions should equal
--   -- loyalty_points.points_balance for every member (after backfill above).
--   select lp.member_id, lp.points_balance,
--          coalesce(sum(pt.amount) filter (where pt.type in ('earned','manual_adjustment')), 0)
--            - coalesce(sum(pt.amount) filter (where pt.type = 'redeemed'), 0) as ledger_sum
--   from loyalty_points lp
--   left join points_transactions pt on pt.member_id = lp.member_id
--   group by lp.member_id, lp.points_balance
--   having lp.points_balance <> (
--     coalesce(sum(pt.amount) filter (where pt.type in ('earned','manual_adjustment')), 0)
--     - coalesce(sum(pt.amount) filter (where pt.type = 'redeemed'), 0)
--   ); -- expect 0 rows once the backfill above is done correctly
--
-- RISKS: redeem_points/redeem_shop_credit must be race-condition-safe under
--   concurrent POS terminals — the functions below lock the balance row
--   (`for update`) before checking sufficiency, but this should be
--   explicitly load-tested on a branch with concurrent calls before this
--   phase is trusted for real money/points at busy events.
--
-- STOP CONDITIONS: the ledger-integrity verification query above returns
--   any row after backfill — do not proceed to Phase 9 until it is empty.
--
-- ROLLBACK TRIGGERS: see phase8_loyalty_shopcredit_ledger_rollback.sql.

begin;

create table public.shop_credit (
  member_id uuid primary key references public.members(id) on delete cascade,
  balance_dkk numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table public.shop_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  type text not null check (type in ('earned', 'redeemed', 'manual_adjustment', 'expired')),
  amount_dkk numeric not null,
  description text,
  related_sale_id uuid references public.pos_sales(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.shop_credit enable row level security;
create policy "racer read own shop credit" on public.shop_credit
  for select using (member_id = public.current_member_id());
create policy "staff read all shop credit" on public.shop_credit
  for select using (public.has_staff_role(array['shop_staff', 'admin']::public.staff_role[]));
-- No INSERT/UPDATE/DELETE policy for anyone — balance is only ever touched
-- by the SECURITY DEFINER functions below.

alter table public.shop_credit_transactions enable row level security;
create policy "racer read own shop credit transactions" on public.shop_credit_transactions
  for select using (member_id = public.current_member_id());
create policy "staff read all shop credit transactions" on public.shop_credit_transactions
  for select using (public.has_staff_role(array['shop_staff', 'admin']::public.staff_role[]));

-- ── Ledger functions — the ONLY way any balance changes ─────────────────

create or replace function public.award_points(
  p_member_id uuid, p_amount numeric, p_description text,
  p_rate numeric default null, p_purchase_amount numeric default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_amount <= 0 then raise exception 'award amount must be positive'; end if;
  if not public.has_staff_role(array['shop_staff', 'admin']::public.staff_role[]) then
    raise exception 'not authorized to award points';
  end if;
  insert into public.points_transactions (member_id, member_name, type, amount, rate_applied, purchase_amount, description)
  values (p_member_id, (select name from public.members where id = p_member_id), 'earned', p_amount, p_rate, p_purchase_amount, p_description);
  update public.loyalty_points
  set points_balance = points_balance + p_amount, total_earned = total_earned + p_amount, updated_at = now()
  where member_id = p_member_id;
end;
$$;

create or replace function public.redeem_points(p_member_id uuid, p_amount numeric, p_description text)
returns void language plpgsql security definer set search_path = public as $$
declare
  current_balance numeric;
begin
  if p_amount <= 0 then raise exception 'redeem amount must be positive'; end if;
  if not public.has_staff_role(array['shop_staff', 'admin']::public.staff_role[]) then
    raise exception 'not authorized to redeem points';
  end if;
  select points_balance into current_balance from public.loyalty_points where member_id = p_member_id for update;
  if current_balance is null or current_balance < p_amount then
    raise exception 'insufficient points balance';
  end if;
  insert into public.points_transactions (member_id, member_name, type, amount, description)
  values (p_member_id, (select name from public.members where id = p_member_id), 'redeemed', p_amount, p_description);
  update public.loyalty_points
  set points_balance = points_balance - p_amount, total_redeemed = total_redeemed + p_amount, updated_at = now()
  where member_id = p_member_id;
end;
$$;

create or replace function public.add_shop_credit(p_member_id uuid, p_amount_dkk numeric, p_description text, p_related_sale_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_amount_dkk <= 0 then raise exception 'credit amount must be positive'; end if;
  if not public.has_staff_role(array['shop_staff', 'admin']::public.staff_role[]) then
    raise exception 'not authorized to add shop credit';
  end if;
  insert into public.shop_credit (member_id, balance_dkk) values (p_member_id, 0)
    on conflict (member_id) do nothing;
  insert into public.shop_credit_transactions (member_id, type, amount_dkk, description, related_sale_id, created_by)
  values (p_member_id, 'earned', p_amount_dkk, p_description, p_related_sale_id, auth.uid());
  update public.shop_credit set balance_dkk = balance_dkk + p_amount_dkk, updated_at = now() where member_id = p_member_id;
end;
$$;

create or replace function public.redeem_shop_credit(p_member_id uuid, p_amount_dkk numeric, p_description text, p_related_sale_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  current_balance numeric;
begin
  if p_amount_dkk <= 0 then raise exception 'redeem amount must be positive'; end if;
  if not public.has_staff_role(array['shop_staff', 'admin']::public.staff_role[]) then
    raise exception 'not authorized to redeem shop credit';
  end if;
  select balance_dkk into current_balance from public.shop_credit where member_id = p_member_id for update;
  if current_balance is null or current_balance < p_amount_dkk then
    raise exception 'insufficient shop credit balance';
  end if;
  insert into public.shop_credit_transactions (member_id, type, amount_dkk, description, related_sale_id, created_by)
  values (p_member_id, 'redeemed', p_amount_dkk, p_description, p_related_sale_id, auth.uid());
  update public.shop_credit set balance_dkk = balance_dkk - p_amount_dkk, updated_at = now() where member_id = p_member_id;
end;
$$;

-- Tighten Phase 3's blanket admin policy on loyalty_points: balance is now
-- ledger-derived only, so even admin loses direct UPDATE/INSERT/DELETE —
-- everything must go through award_points()/redeem_points() (which run as
-- SECURITY DEFINER and bypass this restriction internally, correctly).
drop policy if exists "staff manage loyalty points" on public.loyalty_points;
create policy "staff read loyalty points" on public.loyalty_points
  for select using (public.has_staff_role(array['shop_staff', 'admin']::public.staff_role[]));
revoke insert, update, delete on public.loyalty_points from authenticated;

commit;
