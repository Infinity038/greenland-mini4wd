-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 13 ROLLBACK
--
-- WARNING: if any product has already had a real supplier cost / approved
-- price entered by the time this is considered, export the new columns
-- first — dropping them loses that pricing work, it does not touch any
-- pre-existing (pre-Phase-13) product fields.
--
-- ROLLBACK TRIGGERS: see phase13_catalog_pricing_freight_forward.sql.

begin;

drop trigger if exists products_admin_only_pricing_columns on public.products;
drop function if exists public.enforce_admin_only_pricing_columns();

drop policy if exists "staff read pricing audit events" on public.pricing_audit_events;
drop function if exists public.log_pricing_audit_event(text, jsonb, jsonb, text, uuid, uuid, text);
drop table if exists public.pricing_audit_events;

drop policy if exists "staff manage inventory receipts" on public.inventory_receipts;
drop table if exists public.inventory_receipts;

alter table public.products
  drop constraint if exists products_available_requires_verified_pricing,
  drop constraint if exists products_shipping_override_requires_reason;

alter table public.products
  drop column if exists supplier_cost_amount,
  drop column if exists supplier_currency,
  drop column if exists supplier_name,
  drop column if exists source_note,
  drop column if exists date_verified,
  drop column if exists exchange_rate_dkk_per_unit,
  drop column if exists exchange_rate_snapshot_date,
  drop column if exists shipping_class,
  drop column if exists shipping_override_dkk,
  drop column if exists shipping_override_reason,
  drop column if exists landed_cost_dkk,
  drop column if exists minimum_retail_dkk,
  drop column if exists approved_regular_price_dkk,
  drop column if exists pricing_source,
  drop column if exists is_complete_car_kit,
  drop column if exists part_group;

drop type if exists public.pricing_source;
drop type if exists public.shipping_class;

commit;
