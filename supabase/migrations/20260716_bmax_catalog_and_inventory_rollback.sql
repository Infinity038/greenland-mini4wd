-- ============================================================================
-- ROLLBACK for 20260715_bmax_catalog_and_inventory.sql — PROPOSAL ONLY, NOT RUN.
--
-- Only run this if the forward migration was applied and needs to be undone.
-- It drops exactly what the forward migration added and nothing else — no
-- pre-existing products/orders/members data is touched.
--
-- WARNING: if any product/order rows were updated to populate the new columns
-- (e.g. an admin published catalog items with catalog_tier/bmax_approved set,
-- or an order was reserved/released via the new RPCs) between applying the
-- forward migration and running this rollback, that data is lost when the
-- columns are dropped. Export/back up affected rows first if that's a concern.
-- ============================================================================

begin;

revoke execute on function public.reserve_order_inventory(uuid) from authenticated;
revoke execute on function public.release_order_inventory(uuid) from authenticated;

drop function if exists public.reserve_order_inventory(uuid);
drop function if exists public.release_order_inventory(uuid);

drop index if exists public.orders_product_id_idx;
drop index if exists public.products_item_no_idx;
drop index if exists public.products_public_catalog_idx;

alter table if exists public.orders
  drop constraint if exists orders_inventory_bucket_check;
alter table if exists public.products
  drop constraint if exists products_catalog_tier_check;

alter table if exists public.orders
  drop column if exists inventory_released_at,
  drop column if exists inventory_reserved_at,
  drop column if exists inventory_reserved,
  drop column if exists requires_case,
  drop column if exists inventory_bucket,
  drop column if exists product_id;

alter table if exists public.products
  drop column if exists catalog_order,
  drop column if exists image_status,
  drop column if exists source_url,
  drop column if exists recommended,
  drop column if exists catalog_tier,
  drop column if exists bmax_approved,
  drop column if exists purpose_tags,
  drop column if exists upgrade_stage,
  drop column if exists beginner_level,
  drop column if exists motor_type,
  drop column if exists compatibility,
  drop column if exists published;

commit;
