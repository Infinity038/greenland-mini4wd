-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 8 ROLLBACK
--
-- ROLLBACK TRIGGERS: see phase8_loyalty_shopcredit_ledger_forward.sql. If
-- shop_credit/shop_credit_transactions already hold real balances by the
-- time this is considered, export them first — this is real customer
-- money-equivalent balance, not just schema scaffolding.

begin;

-- Restore Phase 3's original (looser) admin policy on loyalty_points.
grant insert, update, delete on public.loyalty_points to authenticated;
drop policy if exists "staff read loyalty points" on public.loyalty_points;
create policy "staff manage loyalty points" on public.loyalty_points
  for all using (public.has_staff_role(array['admin']::public.staff_role[]))
  with check (public.has_staff_role(array['admin']::public.staff_role[]));

drop function if exists public.redeem_shop_credit(uuid, numeric, text, uuid);
drop function if exists public.add_shop_credit(uuid, numeric, text, uuid);
drop function if exists public.redeem_points(uuid, numeric, text);
drop function if exists public.award_points(uuid, numeric, text, numeric, numeric);

drop policy if exists "racer read own shop credit transactions" on public.shop_credit_transactions;
drop policy if exists "staff read all shop credit transactions" on public.shop_credit_transactions;
drop table if exists public.shop_credit_transactions;

drop policy if exists "racer read own shop credit" on public.shop_credit;
drop policy if exists "staff read all shop credit" on public.shop_credit;
drop table if exists public.shop_credit;

commit;
