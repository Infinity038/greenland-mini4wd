-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 15 ROLLBACK
--
-- Reverts the admin-only trigger to Phase 13's original definition (without
-- the is_club_asset check), removes club-asset columns/function, and clears
-- the deprecation comments this phase added. Does not touch any
-- pre-existing products/shop_inventory row data.
--
-- ROLLBACK TRIGGERS: see phase15_boxed_kit_and_club_assets_forward.sql.

begin;

comment on column public.products.unbuilt_stock is null;
comment on column public.products.built_stock is null;
comment on column public.products.unbuilt_price_dkk is null;
comment on column public.products.built_price_dkk is null;
comment on column public.products.unbuilt_case_price_dkk is null;
comment on column public.products.built_case_price_dkk is null;
comment on column public.products.unbuilt_original_price_dkk is null;
comment on column public.products.built_original_price_dkk is null;
comment on column public.products.unbuilt_case_original_price_dkk is null;
comment on column public.products.built_case_original_price_dkk is null;
comment on column public.shop_inventory.case_stock is null;

-- Restore Phase 13's original trigger definition (without is_club_asset).
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

drop function if exists public.convert_product_to_club_asset(uuid, text);

alter table public.products drop constraint if exists products_club_asset_not_available;
alter table public.products
  drop column if exists is_club_asset,
  drop column if exists club_asset_converted_at,
  drop column if exists club_asset_converted_by;

drop policy if exists "public read service addon prices" on public.service_addon_price_overrides;
drop policy if exists "admin manage service addon prices" on public.service_addon_price_overrides;
drop table if exists public.service_addon_price_overrides;

commit;
