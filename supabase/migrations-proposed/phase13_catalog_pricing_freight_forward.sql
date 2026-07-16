-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 13 — CATALOG PRICING & FREIGHT (product cost/pricing fields,
-- shipping classes, inventory receipts, pricing audit trail)
--
-- Continues the phase numbering from docs/PHASED-SUPABASE-MIGRATION-PLAN.md
-- (Phases 0-12). This phase implements docs/PRODUCT-PRICING-POLICY.md and
-- docs/CATALOG-COSTING-AND-FREIGHT.md.
--
-- REUSE DECISIONS (do not create duplicate concepts):
--   - Shipping classes are a fixed, locked set of 4 (25/35/50/80 DKK) — not
--     admin-editable rows, so this is a Postgres ENUM + columns on
--     `products`, not a separate mutable lookup table.
--   - "Product price history" and "campaign audit" are the same underlying
--     need (who changed what, when, why) — ONE `pricing_audit_events` table
--     serves both, matching the shape already defined in
--     lib/pricing/auditLog.ts, instead of a second history table.
--   - `unbuilt_stock` (already live on `products`) becomes the canonical
--     Boxed Kit stock count going forward (Phase 15 formalizes this) — no
--     new stock column is added here.
--
-- PREREQUISITES: Phase 1 (Auth), Phase 2 (staff_roles, has_staff_role(),
--   is_admin()), Phase 3 (RLS foundation) already applied and verified.
--
-- CODE DEPENDENCIES (not applied in this pass): once live, `lib/pricing/*`
--   should read supplier cost / shipping class / approved price from these
--   new `products` columns instead of the Preview-only
--   `catalog/bmax-initial-catalog.json` + `lib/pricing/previewDemoCatalog.ts`
--   mock sources.
--
-- DATA BACKFILL: none automatic. The 14 live `products` rows keep
--   `pricing_source = 'unverified'` (the default below) until an
--   administrator enters a real verified supplier cost or approved price
--   through the (future, Auth-gated) admin UI — never backfilled with
--   invented values by this migration.
--
-- TESTING: confirm a product with `pricing_source = 'unverified'` cannot be
--   marked `available = true` (see the CHECK constraint below); confirm
--   `pricing_audit_events` is insert-only via the SECURITY DEFINER helper.
--
-- VERIFICATION QUERIES:
--   select pricing_source, count(*) from products group by 1;
--   select conname from pg_constraint where conrelid = 'products'::regclass and contype = 'c';
--
-- RISKS: the new CHECK constraint (`available` requires a verified pricing
--   source) applies to the 14 EXISTING live product rows immediately —
--   confirmed safe only because all 14 already have `available = false`
--   (verified in the live-schema audit); re-verify this immediately before
--   applying, since new products may have been added since.
--
-- STOP CONDITIONS: any live `products` row has `available = true` AND
--   `pricing_source` would resolve to 'unverified' — resolve that row
--   first (either verify its cost or set `available = false`) before
--   applying this migration.
--
-- ROLLBACK TRIGGERS: see phase13_catalog_pricing_freight_rollback.sql.

begin;

create type public.shipping_class as enum ('small_part', 'boxed_body_chassis', 'bulky_upgrade', 'complete_car_kit');
create type public.pricing_source as enum ('board_approved_fixed_price', 'cost_plus_formula', 'unverified');

alter table public.products
  add column if not exists supplier_cost_amount numeric,
  add column if not exists supplier_currency text,
  add column if not exists supplier_name text,
  add column if not exists source_note text,
  add column if not exists date_verified date,
  add column if not exists exchange_rate_dkk_per_unit numeric,
  add column if not exists exchange_rate_snapshot_date date,
  add column if not exists shipping_class public.shipping_class,
  add column if not exists shipping_override_dkk numeric,
  add column if not exists shipping_override_reason text,
  add column if not exists landed_cost_dkk numeric,
  add column if not exists minimum_retail_dkk numeric,
  add column if not exists approved_regular_price_dkk numeric,
  add column if not exists pricing_source public.pricing_source not null default 'unverified',
  add column if not exists is_complete_car_kit boolean not null default false,
  add column if not exists part_group text;

alter table public.products
  add constraint products_shipping_override_requires_reason
    check (shipping_override_dkk is null or shipping_override_reason is not null);

-- The core publication-safety rule from docs/PRODUCT-PRICING-POLICY.md §3/§18:
-- a product can never be made available for sale with an unverified price.
alter table public.products
  add constraint products_available_requires_verified_pricing
    check (available = false or pricing_source <> 'unverified');

create table public.inventory_receipts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  received_at timestamptz not null default now(),
  source_note text,
  recorded_by uuid references auth.users(id)
);
create index inventory_receipts_product_id_idx on public.inventory_receipts (product_id, received_at desc);

-- Single audit table for every pricing/campaign event type listed in
-- docs/PRICING-ADMIN-PERMISSIONS.md §17 — insert-only, matching every other
-- ledger/audit table already in this project (points_transactions, the
-- Phase 7 audit_log).
create table public.pricing_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'supplier_cost_change', 'exchange_rate_change', 'shipping_class_change', 'shipping_override',
    'landed_cost_recalculation', 'regular_price_change', 'price_override',
    'campaign_created', 'campaign_edited', 'campaign_activated', 'campaign_deactivated',
    'campaign_approved', 'margin_floor_override', 'below_cost_override', 'product_excluded',
    'inventory_converted_to_club_asset'
  )),
  actor_user_id uuid references auth.users(id),
  previous_value jsonb,
  new_value jsonb,
  reason text not null,
  affected_product_id uuid references public.products(id),
  affected_campaign_id uuid, -- FK added in Phase 14 once sale_campaigns exists
  source_context text not null,
  created_at timestamptz not null default now()
);
create index pricing_audit_events_product_idx on public.pricing_audit_events (affected_product_id);
create index pricing_audit_events_campaign_idx on public.pricing_audit_events (affected_campaign_id);

create or replace function public.log_pricing_audit_event(
  p_event_type text, p_previous_value jsonb, p_new_value jsonb, p_reason text,
  p_affected_product_id uuid default null, p_affected_campaign_id uuid default null, p_source_context text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.pricing_audit_events (
    event_type, actor_user_id, previous_value, new_value, reason,
    affected_product_id, affected_campaign_id, source_context
  ) values (
    p_event_type, auth.uid(), p_previous_value, p_new_value, p_reason,
    p_affected_product_id, p_affected_campaign_id, p_source_context
  ) returning id into new_id;
  return new_id;
end;
$$;

alter table public.inventory_receipts enable row level security;
create policy "staff manage inventory receipts" on public.inventory_receipts
  for all using (public.has_staff_role(array['shop_staff', 'admin']::public.staff_role[]))
  with check (public.has_staff_role(array['shop_staff', 'admin']::public.staff_role[]));

alter table public.pricing_audit_events enable row level security;
create policy "staff read pricing audit events" on public.pricing_audit_events
  for select using (public.has_staff_role(array['shop_staff', 'admin']::public.staff_role[]));
-- Deliberately no INSERT/UPDATE/DELETE policy for anyone — rows are written
-- exclusively via log_pricing_audit_event(), never a direct client INSERT.

-- Only Admin may change supplier cost, exchange rate, shipping allocation,
-- or the approved regular price (docs/PRICING-ADMIN-PERMISSIONS.md §16).
-- Postgres column-level GRANT/REVOKE cannot distinguish "admin" from
-- "shop_manager" — both are the same `authenticated` role, the distinction
-- lives only in the `staff_roles` table — so this is enforced with a
-- BEFORE UPDATE trigger comparing OLD vs NEW per admin-only column, not a
-- column privilege grant.
create or replace function public.enforce_admin_only_pricing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    old.supplier_cost_amount is distinct from new.supplier_cost_amount or
    old.supplier_currency is distinct from new.supplier_currency or
    old.exchange_rate_dkk_per_unit is distinct from new.exchange_rate_dkk_per_unit or
    old.exchange_rate_snapshot_date is distinct from new.exchange_rate_snapshot_date or
    old.shipping_class is distinct from new.shipping_class or
    old.shipping_override_dkk is distinct from new.shipping_override_dkk or
    old.approved_regular_price_dkk is distinct from new.approved_regular_price_dkk
  ) and not public.is_admin() then
    raise exception 'Only Admin may change supplier cost, exchange rate, shipping class/override, or the approved regular price.';
  end if;
  return new;
end;
$$;

create trigger products_admin_only_pricing_columns
  before update on public.products
  for each row
  execute function public.enforce_admin_only_pricing_columns();

commit;
