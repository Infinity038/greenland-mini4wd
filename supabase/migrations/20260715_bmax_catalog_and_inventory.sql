-- ============================================================================
-- PROPOSAL ONLY — DO NOT RUN AGAINST PRODUCTION YET.
--
-- This file has NOT been applied, and no tool in this session has executed any
-- SQL against the Mini4WD Supabase project. It is a reviewed draft, carried
-- over unchanged from docs/CLAUDE-BMAX-REFINEMENT-BRIEF.md, pending:
--   1. Confirmation that public.products / public.orders / public.shop_inventory
--      match the column names this migration assumes (see the read-only export
--      queries provided separately for the SQL Editor).
--   2. A check for any existing RLS policies that would need to change to keep
--      the reserve/release RPCs callable by the app while still blocking direct
--      client writes to inventory columns.
--   3. Explicit written approval from the project owner to apply it.
--
-- Rollback: 20260716_bmax_catalog_and_inventory_rollback.sql (same directory).
-- That rollback drops only what this migration adds — it does not touch any
-- pre-existing products/orders/members rows.
-- ============================================================================

begin;

alter table if exists public.products
  add column if not exists published boolean not null default true,
  add column if not exists compatibility text[] not null default '{}',
  add column if not exists motor_type text,
  add column if not exists beginner_level text,
  add column if not exists upgrade_stage text,
  add column if not exists purpose_tags text[] not null default '{}',
  add column if not exists bmax_approved boolean not null default false,
  add column if not exists catalog_tier text,
  add column if not exists recommended boolean not null default false,
  add column if not exists source_url text,
  add column if not exists image_status text not null default 'needs approved upload',
  add column if not exists catalog_order integer;

alter table if exists public.orders
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists inventory_bucket text,
  add column if not exists requires_case boolean not null default false,
  add column if not exists inventory_reserved boolean not null default false,
  add column if not exists inventory_reserved_at timestamptz,
  add column if not exists inventory_released_at timestamptz;

-- Add non-destructive checks only when the target table exists.
do $$
begin
  if to_regclass('public.products') is not null then
    if not exists (
      select 1 from pg_constraint
      where conname = 'products_catalog_tier_check'
        and conrelid = 'public.products'::regclass
    ) then
      alter table public.products
        add constraint products_catalog_tier_check
        check (catalog_tier is null or catalog_tier in ('core', 'expansion', 'special_order'));
    end if;
  end if;

  if to_regclass('public.orders') is not null then
    if not exists (
      select 1 from pg_constraint
      where conname = 'orders_inventory_bucket_check'
        and conrelid = 'public.orders'::regclass
    ) then
      alter table public.orders
        add constraint orders_inventory_bucket_check
        check (inventory_bucket is null or inventory_bucket in ('unbuilt', 'built', 'standard'));
    end if;
  end if;
end $$;

create index if not exists products_public_catalog_idx
  on public.products (published, category, catalog_order);
create index if not exists products_item_no_idx
  on public.products (item_no);
create index if not exists orders_product_id_idx
  on public.orders (product_id);

-- Reserve inventory only after an administrator confirms payment.
-- Idempotent: calling it twice for the same order will not deduct twice.
create or replace function public.reserve_order_inventory(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_product public.products%rowtype;
  v_case_stock integer;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.inventory_reserved then
    return jsonb_build_object('ok', true, 'already_reserved', true);
  end if;

  if v_order.product_id is null then
    raise exception 'Order has no product_id';
  end if;

  select * into v_product
  from public.products
  where id = v_order.product_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  case coalesce(v_order.inventory_bucket, 'standard')
    when 'built' then
      if coalesce(v_product.built_stock, 0) < coalesce(v_order.quantity, 1) then
        raise exception 'Insufficient built stock';
      end if;
      update public.products
      set built_stock = built_stock - coalesce(v_order.quantity, 1)
      where id = v_product.id;

    when 'unbuilt' then
      if coalesce(v_product.unbuilt_stock, 0) < coalesce(v_order.quantity, 1) then
        raise exception 'Insufficient unbuilt stock';
      end if;
      update public.products
      set unbuilt_stock = unbuilt_stock - coalesce(v_order.quantity, 1)
      where id = v_product.id;

    else
      if coalesce(v_product.stock_qty, 0) < coalesce(v_order.quantity, 1) then
        raise exception 'Insufficient stock';
      end if;
      update public.products
      set stock_qty = stock_qty - coalesce(v_order.quantity, 1)
      where id = v_product.id;
  end case;

  if v_order.requires_case then
    select case_stock into v_case_stock
    from public.shop_inventory
    where id = 1
    for update;

    if coalesce(v_case_stock, 0) < coalesce(v_order.quantity, 1) then
      raise exception 'Insufficient case stock';
    end if;

    update public.shop_inventory
    set case_stock = case_stock - coalesce(v_order.quantity, 1)
    where id = 1;
  end if;

  update public.orders
  set inventory_reserved = true,
      inventory_reserved_at = now(),
      inventory_released_at = null
  where id = p_order_id;

  return jsonb_build_object('ok', true, 'already_reserved', false);
end;
$$;

-- Return inventory when a paid/reserved order is cancelled.
-- Idempotent: inventory is returned only once.
create or replace function public.release_order_inventory(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if not v_order.inventory_reserved then
    return jsonb_build_object('ok', true, 'already_released', true);
  end if;

  if v_order.product_id is not null then
    case coalesce(v_order.inventory_bucket, 'standard')
      when 'built' then
        update public.products
        set built_stock = coalesce(built_stock, 0) + coalesce(v_order.quantity, 1)
        where id = v_order.product_id;
      when 'unbuilt' then
        update public.products
        set unbuilt_stock = coalesce(unbuilt_stock, 0) + coalesce(v_order.quantity, 1)
        where id = v_order.product_id;
      else
        update public.products
        set stock_qty = coalesce(stock_qty, 0) + coalesce(v_order.quantity, 1)
        where id = v_order.product_id;
    end case;
  end if;

  if v_order.requires_case then
    update public.shop_inventory
    set case_stock = coalesce(case_stock, 0) + coalesce(v_order.quantity, 1)
    where id = 1;
  end if;

  update public.orders
  set inventory_reserved = false,
      inventory_released_at = now()
  where id = p_order_id;

  return jsonb_build_object('ok', true, 'already_released', false);
end;
$$;

-- Restrict inventory functions to authenticated users. RLS/admin authorization must
-- still be verified by the application before these RPCs are called.
revoke all on function public.reserve_order_inventory(uuid) from public;
revoke all on function public.release_order_inventory(uuid) from public;
grant execute on function public.reserve_order_inventory(uuid) to authenticated;
grant execute on function public.release_order_inventory(uuid) to authenticated;

commit;
