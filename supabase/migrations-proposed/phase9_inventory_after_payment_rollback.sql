-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 9 ROLLBACK
--
-- Only removes the trigger and the tightened grant this phase added — does
-- NOT re-drop reserve_order_inventory/release_order_inventory themselves
-- (those belong to the separate bmax migration and its own rollback file,
-- supabase/migrations/20260716_bmax_catalog_and_inventory_rollback.sql).
--
-- ROLLBACK TRIGGERS: see phase9_inventory_after_payment_forward.sql.

begin;

drop trigger if exists orders_payment_status_inventory_trigger on public.orders;
drop function if exists public.handle_order_payment_status_change();

-- Restore the bmax migration's original direct-client grant.
grant execute on function public.reserve_order_inventory(uuid) to authenticated;
grant execute on function public.release_order_inventory(uuid) to authenticated;

commit;
