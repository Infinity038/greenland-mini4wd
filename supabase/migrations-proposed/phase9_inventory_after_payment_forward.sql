-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 9 — INVENTORY DEDUCTION ONLY AFTER CONFIRMED PAYMENT, CANCELLATION,
-- REFUND RESTORATION
--
-- PREREQUISITES: this phase builds directly on the existing, already-reviewed
--   proposal at supabase/migrations/20260715_bmax_catalog_and_inventory.sql
--   (itself still unapplied — its own header says so), which already defines
--   reserve_order_inventory(order_id) / release_order_inventory(order_id) as
--   idempotent SECURITY DEFINER functions operating on
--   products.stock_qty/unbuilt_stock/built_stock and shop_inventory.case_stock.
--   That file must be applied before or together with this one — Phase 9
--   does NOT redefine those functions, it only (a) tightens who/what may
--   invoke them and (b) adds the missing piece: automatically calling them
--   at the moment payment_status actually changes, instead of relying on
--   application code to remember to call the RPC.
--
-- CODE DEPENDENCIES (not applied in this pass): once this trigger exists,
--   any app code that currently expects to call reserve_order_inventory /
--   release_order_inventory directly (there is none yet — the bmax
--   migration was never wired into the UI) should NOT do so; the trigger
--   below is now the only caller, firing off the same `orders.status`/
--   `payment_status` UPDATE staff already perform via the admin orders page.
--
-- DATA BACKFILL: none — the 3 live `orders` rows predate `product_id` /
--   `inventory_bucket` (added by the bmax migration) and are not
--   automatically backfilled; leave them as pre-ledger legacy rows unless
--   the project owner wants them retroactively matched to a product_id.
--
-- TESTING: on a branch, seed a product with known stock, create a test
--   order, transition payment_status to 'payment_confirmed' and confirm
--   stock decremented exactly once (re-running the same UPDATE must not
--   decrement twice — reserve_order_inventory is already idempotent);
--   transition to 'cancelled' and confirm stock is restored exactly once.
--
-- VERIFICATION QUERIES:
--   select id, payment_status, inventory_reserved from orders where inventory_reserved and payment_status not in ('payment_confirmed','reserved','awaiting_stock','in_transit','ready_for_pickup','completed');
--     -- expect 0 rows: nothing should show inventory_reserved=true while in a cancelled/rejected/refunded-equivalent state.
--
-- RISKS: the original bmax migration granted EXECUTE on both RPCs directly
--   to `authenticated` with a comment noting "RLS/admin authorization must
--   still be verified by the application" — i.e. it deliberately punted
--   enforcement to the client. Once Phase 3's RLS is live, relying on the
--   client to gate this is no longer necessary or safe as the sole control;
--   this phase revokes that direct grant and moves invocation into a
--   trigger that only fires from an UPDATE staff were already allowed to
--   make under Phase 3's "staff manage all orders" policy.
--
-- STOP CONDITIONS: the verification query above returns any row after this
--   phase has been live for a while — investigate before Phase 10.
--
-- ROLLBACK TRIGGERS: any order's inventory reserved/released more than once
-- for a single payment_status transition (violates the idempotency this
-- phase relies on), or stock counts drifting negative.

begin;

-- Supersede the bmax migration's direct-client grant — only the trigger
-- below invokes these functions going forward.
revoke execute on function public.reserve_order_inventory(uuid) from authenticated;
revoke execute on function public.release_order_inventory(uuid) from authenticated;

create or replace function public.handle_order_payment_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_status = 'payment_confirmed' and old.payment_status is distinct from 'payment_confirmed' then
    perform public.reserve_order_inventory(new.id);
  elsif new.payment_status in ('cancelled', 'rejected') and old.payment_status is distinct from new.payment_status then
    perform public.release_order_inventory(new.id);
  end if;
  return new;
end;
$$;

create trigger orders_payment_status_inventory_trigger
  after update of payment_status on public.orders
  for each row
  execute function public.handle_order_payment_status_change();

commit;
