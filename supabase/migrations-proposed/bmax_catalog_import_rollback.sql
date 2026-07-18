-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- Rollback for bmax_catalog_import_forward.sql
--
-- Removes ONLY the rows that migration inserts, identified by an explicit,
-- deterministic item_no list (95126, display-case) — never a heuristic like
-- "everything created after timestamp X" or "everything not in the original
-- 14," either of which could catch a row this migration never touched.
--
-- DOES NOT DELETE OR MODIFY THE ORIGINAL 14 LIVE ROWS. This file contains no
-- UPDATE against that table, and its single DELETE below targets only the
-- two item_nos this migration inserted — never any other row.
--
-- DOES NOT REMOVE PR #2'S EXISTING 11 image_url UPDATES. Those 11 rows are
-- part of the original 14 and are never targeted by this rollback's delete
-- (which only ever matches item_no in ('95126','display-case')) — no
-- special-casing was needed to protect them; the deterministic item_no list
-- already excludes them by construction.
--
-- IRREVERSIBLE LIMITATION (documented, not silently worked around): if a
-- real order, preorder, or wishlist entry has since been created against
-- either of these two product rows, deleting the row would either violate a
-- foreign-key constraint (if one exists) or silently orphan that reference
-- (if one doesn't). This rollback does NOT delete blindly — the preflight
-- check below aborts if either row is referenced anywhere, and the operator
-- must resolve those references by hand (e.g. cancel/refund the order first,
-- through the normal order-management flow — never a raw DELETE against
-- orders/preorders here) before the rollback can safely proceed. There is no
-- way to make this step fully automatic without risking real customer data.
--
-- Also drops the partial unique index this migration created — ONLY if
-- doing so is safe: see the check below. If the index is now protecting
-- real, independently-added data (e.g. a legitimate manual product entry
-- made after this migration ran), dropping it removes that protection;
-- this rollback checks for post-migration duplicate item_nos first and
-- refuses to drop the index if any exist, since silently reintroducing the
-- possibility of duplicate item_nos is not a safe default.

begin;

do $$
declare
  referenced_orders integer;
  referenced_preorders integer;
  referenced_wishlist integer;
  target_ids uuid[];
begin
  select array_agg(id) into target_ids
  from public.products
  where item_no in ('95126', 'display-case');

  if target_ids is null or array_length(target_ids, 1) is null then
    raise notice 'Neither 95126 nor display-case exists live — nothing to roll back.';
  else
    select count(*) into referenced_orders from public.orders where product_id = any(target_ids);
    select count(*) into referenced_preorders from public.preorders where product_id = any(target_ids);
    select count(*) into referenced_wishlist from public.wishlist where product_id = any(target_ids);

    if referenced_orders > 0 or referenced_preorders > 0 or referenced_wishlist > 0 then
      raise exception 'ABORT: item_no 95126/display-case is referenced by % order(s), % preorder(s), % wishlist row(s) — resolve those manually (never a raw DELETE against orders/preorders/wishlist) before rolling back this migration.',
        referenced_orders, referenced_preorders, referenced_wishlist;
    end if;
  end if;
end $$;

-- Explicit, deterministic target list — the only two item_nos this
-- migration ever inserts. Never touches any other row.
delete from public.products
where item_no in ('95126', 'display-case');

-- Drop the uniqueness safeguard only if no duplicate item_no has appeared
-- since (which would mean something else now depends on this index to even
-- be insertable in the first place, or that dropping it would immediately
-- reintroduce a collision it was preventing).
do $$
declare
  duplicate_count integer;
begin
  select count(*) into duplicate_count
  from (
    select item_no from public.products
    where item_no is not null and item_no <> ''
    group by item_no having count(*) > 1
  ) dupes;

  if duplicate_count = 0 then
    drop index if exists public.products_item_no_unique_idx;
  else
    raise warning 'NOT dropping products_item_no_unique_idx — % duplicate item_no group(s) exist; removing the index now would silently permit them. Leaving the index in place.', duplicate_count;
  end if;
end $$;

commit;

-- ── VERIFICATION QUERIES (run manually after rollback) ───────────────────
--
-- -- Total product count (expect back to 14):
-- select count(*) from public.products;
--
-- -- Confirm both inserted rows are gone:
-- select item_no from public.products where item_no in ('95126', 'display-case');
-- -- expect 0 rows
--
-- -- Confirm all 14 original rows are still present and unchanged:
-- select item_no, name, price_dkk, status, image_url from public.products
-- where item_no in ('18099','18704','18705','18710','19431','19440','19442','19443','19447','19451','92461','92462','95571','95706')
-- order by item_no;
-- -- expect 14 rows, matching the pre-migration snapshot exactly
--
-- -- Confirm the unique index state:
-- select indexname, indexdef from pg_indexes where indexname = 'products_item_no_unique_idx';
