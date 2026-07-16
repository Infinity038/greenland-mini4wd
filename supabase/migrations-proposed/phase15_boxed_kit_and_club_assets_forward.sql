-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 15 — BOXED-KIT SALES, SERVICE ADD-ONS, CLUB ASSETS
--
-- Implements docs/ASSEMBLY-SERVICE-WORKFLOW.md §6/§7. Continues from Phase 14.
--
-- REUSE DECISIONS (do not create duplicate concepts):
--   - Display Case stock is ALREADY tracked separately from car-kit stock —
--     the live `shop_inventory` singleton row (`case_stock`) already is
--     exactly this. No new table.
--   - Boxed Kit stock reuses the existing `products.unbuilt_stock` column
--     (already live) rather than adding a new column — this migration only
--     documents the reinterpretation via `COMMENT ON COLUMN`, it does not
--     rename or move the data.
--   - `products.built_stock`, `unbuilt_price_dkk`, `built_price_dkk`,
--     `unbuilt_case_price_dkk`, `built_case_price_dkk`, and their
--     `..._original_price_dkk` counterparts are the OLD four-variant model
--     (docs/PRODUCT-PRICING-POLICY.md §6 explicitly removes it). They are
--     NOT dropped here — dropping columns on a live table with existing
--     rows is destructive and unnecessary; they are marked deprecated via
--     comment and simply stop being read by the app once the code change
--     ships. A future cleanup phase may drop them once confirmed unused for
--     a full season, as its own separate, reviewed migration.
--
-- PREREQUISITES: Phase 13 (products pricing columns, admin-only trigger),
--   Phase 14 (sale_campaigns) applied.
--
-- CODE DEPENDENCIES (not applied in this pass): app/shop/page.tsx's
--   boxed-kit + add-on UI (already implemented in this branch against the
--   Preview/mock pricing library) switches its Supabase reads/writes from
--   `unbuilt_stock`/`shop_inventory.case_stock` (already correct — no
--   change needed there) to also read `service_addon_price_overrides` for
--   admin-configured add-on pricing instead of the code-level defaults in
--   lib/pricing/serviceAddOns.ts.
--
-- DATA BACKFILL: none. `is_club_asset` defaults to `false` for all existing
--   rows — nothing is auto-converted.
--
-- TESTING: `convert_product_to_club_asset()` rejects a non-admin caller;
--   confirm it also flips `available = false` and writes exactly one
--   `pricing_audit_events` row of type `inventory_converted_to_club_asset`.
--
-- VERIFICATION QUERIES:
--   select id, price_dkk from service_addon_price_overrides;
--   select count(*) from products where is_club_asset = true; -- expect 0 immediately after this migration
--
-- RISKS: none beyond the general column-comment/no-drop approach — this
--   phase is purely additive plus documentation comments.
--
-- STOP CONDITIONS: none specific.
--
-- ROLLBACK TRIGGERS: see phase15_boxed_kit_and_club_assets_rollback.sql.

begin;

create table public.service_addon_price_overrides (
  id text primary key check (id in ('display_case', 'standard_assembly', 'ready_to_race_assembly')),
  price_dkk numeric not null check (price_dkk >= 0),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.service_addon_price_overrides enable row level security;
create policy "public read service addon prices" on public.service_addon_price_overrides
  for select using (true);
create policy "admin manage service addon prices" on public.service_addon_price_overrides
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.products
  add column if not exists is_club_asset boolean not null default false,
  add column if not exists club_asset_converted_at timestamptz,
  add column if not exists club_asset_converted_by uuid references auth.users(id);

-- Club assets are never public sale inventory (docs/ASSEMBLY-SERVICE-WORKFLOW.md §7).
alter table public.products
  add constraint products_club_asset_not_available
    check (is_club_asset = false or available = false);

create or replace function public.convert_product_to_club_asset(p_product_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only Admin may convert a product to a club asset.';
  end if;
  select to_jsonb(p) into v_previous from public.products p where p.id = p_product_id;
  if v_previous is null then
    raise exception 'Product not found';
  end if;

  update public.products
  set is_club_asset = true, available = false, club_asset_converted_at = now(), club_asset_converted_by = auth.uid()
  where id = p_product_id;

  perform public.log_pricing_audit_event(
    'inventory_converted_to_club_asset', v_previous, jsonb_build_object('is_club_asset', true),
    p_reason, p_product_id, null, 'convert_product_to_club_asset()'
  );
end;
$$;

-- Extend Phase 13's admin-only pricing-column guard to also cover club-asset
-- conversion, so it can only ever happen through the function above (which
-- itself checks is_admin()) or a direct admin session — never silently via
-- an ordinary staff UPDATE.
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
    old.approved_regular_price_dkk is distinct from new.approved_regular_price_dkk or
    old.is_club_asset is distinct from new.is_club_asset
  ) and not public.is_admin() then
    raise exception 'Only Admin may change supplier cost, exchange rate, shipping class/override, approved regular price, or club-asset status.';
  end if;
  return new;
end;
$$;

comment on column public.products.unbuilt_stock is
  'Canonical Boxed Kit stock count as of Phase 15 (docs/ASSEMBLY-SERVICE-WORKFLOW.md §6). The only stock count reduced by a car order, regardless of add-ons selected.';
comment on column public.products.built_stock is
  'DEPRECATED as of Phase 15 — the four-variant unbuilt/built/case stock model is replaced by Boxed-Kit-only + service add-ons. No longer read or written by app/shop. Not dropped (destructive); safe to drop in a future cleanup migration once confirmed unused for a full season.';
comment on column public.products.unbuilt_price_dkk is 'DEPRECATED as of Phase 15 — see products.built_stock comment.';
comment on column public.products.built_price_dkk is 'DEPRECATED as of Phase 15 — see products.built_stock comment.';
comment on column public.products.unbuilt_case_price_dkk is 'DEPRECATED as of Phase 15 — see products.built_stock comment.';
comment on column public.products.built_case_price_dkk is 'DEPRECATED as of Phase 15 — see products.built_stock comment.';
comment on column public.products.unbuilt_original_price_dkk is 'DEPRECATED as of Phase 15 — see products.built_stock comment.';
comment on column public.products.built_original_price_dkk is 'DEPRECATED as of Phase 15 — see products.built_stock comment.';
comment on column public.products.unbuilt_case_original_price_dkk is 'DEPRECATED as of Phase 15 — see products.built_stock comment.';
comment on column public.products.built_case_original_price_dkk is 'DEPRECATED as of Phase 15 — see products.built_stock comment.';
comment on column public.shop_inventory.case_stock is
  'Display Case stock (docs/ASSEMBLY-SERVICE-WORKFLOW.md §6) — tracked separately from every car kit''s own Boxed Kit stock (products.unbuilt_stock). Pre-existing column, reused as-is.';

commit;
