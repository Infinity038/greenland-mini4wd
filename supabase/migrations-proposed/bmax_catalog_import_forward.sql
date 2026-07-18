-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- B-MAX CATALOG IMPORT — insert-only expansion of public.products
--
-- SCOPE: inserts exactly the 2 catalog/bmax-initial-catalog.json rows that
-- passed full validation during reconciliation (see
-- catalog/bmax-catalog-reconciled-seed.json, `new` array) — item_no 95126
-- and item_no 'display-case'. Of the 106 catalog rows with an item_no not
-- already live, 104 were BLOCKED (almost entirely for having no
-- board-approved price — `approved_regular_price_dkk` is null for
-- everything except the 11 records already through pricing approval, 9 of
-- which are already live). This migration deliberately does NOT invent or
-- estimate a price for any of those 104 — they stay unimported until a
-- real, board-approved price exists, at which point a future migration can
-- pick them up the same way this one does.
--
-- OWNER DECISIONS THIS MIGRATION ENFORCES (binding, do not regress):
--   1. public.products is authoritative for every EXISTING product — this
--      file contains ZERO UPDATE statements against that table. Grep for
--      "update" (case-insensitive) in this file; every match is inside a
--      comment like this one, never an executable statement.
--   2. The existing 14 live rows (including the 3 with no catalog JSON
--      counterpart — 19440, 19442, 92461 — and the 11 PR #2 already
--      poster-updated rows) are never touched, never re-inserted, never
--      have their image_url touched by this file.
--   3. Only rows whose item_no does NOT already exist in public.products
--      are ever inserted — enforced both by the preflight check (step 1)
--      and by `where not exists (...)` on the insert itself (step 3),
--      independently, so a bug in one layer doesn't remove the other's
--      protection.
--
-- PREREQUISITES:
--   - Read docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md and take a fresh
--     row-count + item_no snapshot of public.products before running
--     anything (§2-3 pattern already established in this repo).
--   - Run this on an isolated Supabase branch first, never live for the
--     first pass — see that same doc's §1.
--   - Confirm scripts/catalogPosterImageMatch.test.mjs-equivalent
--     reconciliation (components/admin/CatalogImportPanel.tsx's dry-run,
--     PREVIEW DRY RUN button, on /admin/products) shows exactly 2 NEW rows
--     and 0 CONFLICTED against the real live table before applying.
--
-- ROLLBACK: bmax_catalog_import_rollback.sql (same directory). Removes only
-- the 2 rows this file inserts, identified by an explicit, deterministic
-- item_no list — never a heuristic like "rows created after timestamp X."
--
-- VERIFICATION QUERIES: see the commented block at the end of this file.

begin;

-- ── Step 1: preflight — duplicate and blank item_no checks ──────────────
-- Aborts the entire transaction (RAISE EXCEPTION rolls back everything
-- above it too) if the live table is not in the state this migration
-- assumes. Never silently proceeds past a failed check.
do $$
declare
  duplicate_count integer;
  blank_count integer;
  preexisting_count integer;
begin
  select count(*) into duplicate_count
  from (
    select item_no from public.products
    where item_no is not null and item_no <> ''
    group by item_no having count(*) > 1
  ) dupes;
  if duplicate_count > 0 then
    raise exception 'ABORT: % duplicate non-blank item_no value(s) already exist in public.products — resolve before importing.', duplicate_count;
  end if;

  select count(*) into blank_count
  from public.products
  where item_no is null or item_no = '';
  if blank_count > 0 then
    raise warning 'NOTE: % existing public.products row(s) have a null/blank item_no — the partial unique index below deliberately excludes these, so they are not affected.', blank_count;
  end if;

  select count(*) into preexisting_count
  from public.products
  where item_no in ('95126', 'display-case');
  if preexisting_count > 0 then
    raise exception 'ABORT: item_no 95126 or display-case already exists live — this migration is not idempotent-safe to apply a second time in this form. Investigate before rerunning.';
  end if;
end $$;

-- ── Step 2: additive uniqueness safeguard ────────────────────────────────
-- public.products.item_no is nullable with NO uniqueness constraint today
-- (confirmed via information_schema — a real gap). A partial unique index
-- (excluding null/blank) is the correct additive safeguard: it protects
-- every future insert without requiring every historical/blank row to
-- acquire a synthetic value, and without making item_no globally NOT NULL —
-- there is no evidence every legitimate row must have one, so that stronger
-- constraint is deliberately not made here.
--
-- Not created CONCURRENTLY: CONCURRENTLY cannot run inside a transaction
-- block, and public.products has ~14-16 rows at the time this was written —
-- a plain (transactional) index build briefly locks a table this small for
-- a negligible, sub-millisecond duration. If the live table has grown
-- substantially by the time this is actually applied, reconsider building
-- it CONCURRENTLY outside this transaction instead.
create unique index if not exists products_item_no_unique_idx
  on public.products (item_no)
  where item_no is not null and item_no <> '';

-- ── Step 3: insert only the 2 validated new rows ─────────────────────────
-- Each insert is independently guarded by `where not exists (...)` against
-- the live table, in addition to the preflight check in Step 1 — belt and
-- suspenders, and what makes a rerun of this exact file a no-op (idempotent)
-- rather than an error, once Step 1's stricter preexisting-row check is
-- relaxed for a legitimate rerun scenario. image_url is the poster's
-- site-relative static path when scripts/catalog-poster-images-full-manifest.json
-- has an exact item_no match (95126), or an empty string when none exists
-- (display-case) — an empty string is exactly what components/ProductImage.tsx
-- already treats as "render the durable fallback," never a broken <img>.
insert into public.products (
  item_no, name, description, chassis, type, category, subcategory,
  price_dkk, original_price_dkk, stock_qty, unbuilt_stock, built_stock,
  status, available, is_collectors_vault, image_url, item_number
)
select '95126', 'Cyclone Magnum Memorial 25th Anniversary',
  'Anniversary collector kit on the Super TZ-X chassis. Keep it separate from the recommended beginner chassis selection.',
  'Super TZ-X', 'boxed', 'cars', 'Limited Edition Mini 4WD Kit',
  389, null, 0, 0, 0,
  'coming soon', false, true,
  '/catalog/products/95126-cyclone-magnum-memorial-25th-anniversary.webp', null
where not exists (select 1 from public.products where item_no = '95126');

insert into public.products (
  item_no, name, description, chassis, type, category, subcategory,
  price_dkk, original_price_dkk, stock_qty, unbuilt_stock, built_stock,
  status, available, is_collectors_vault, image_url, item_number
)
select 'display-case', 'Mini 4WD Display Case',
  'Shared display case — one stock pool used for both a standalone purchase and a car-plus-case bundle. Supplier cost (300 PHP/case) is a known assumption pending later receipt verification; the 229 DKK standalone / 189 DKK bundled prices are locked and independently margin-verified (lib/pricing/displayCase.ts).',
  '', null, 'accessories', 'Display Case',
  229, null, 0, 0, 0,
  'coming soon', false, false,
  '', null
where not exists (select 1 from public.products where item_no = 'display-case');

commit;

-- ── VERIFICATION QUERIES (run manually after apply, never automatic) ────
--
-- -- Total product count (expect 16 = 14 existing + 2 inserted):
-- select count(*) from public.products;
--
-- -- Duplicate item_nos (expect 0 rows):
-- select item_no, count(*) from public.products
-- where item_no is not null and item_no <> ''
-- group by item_no having count(*) > 1;
--
-- -- Item_nos inserted by this migration (expect exactly 95126, display-case):
-- select item_no, name, created_at from public.products
-- where item_no in ('95126', 'display-case')
-- order by item_no;
--
-- -- The original 14 rows are byte-for-byte unchanged (expect 14 rows, all
-- -- matching your pre-migration snapshot exactly — compare against the
-- -- backup taken per docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md):
-- select item_no, name, price_dkk, status, image_url from public.products
-- where item_no in ('18099','18704','18705','18710','19431','19440','19442','19443','19447','19451','92461','92462','95571','95706')
-- order by item_no;
--
-- -- Poster URL assignments among the newly inserted rows (expect 1: 95126):
-- select item_no, image_url from public.products
-- where item_no in ('95126', 'display-case') and image_url like '/catalog/products/%';
--
-- -- Products (existing + new) without a poster (expect 4: 19440, 19442, 92461, display-case):
-- select item_no, name, image_url from public.products
-- where (image_url is null or image_url = '' or image_url not like '%/catalog/products/%')
-- order by item_no;
--
-- -- Invalid stock values anywhere in the table (expect 0 rows):
-- select item_no, unbuilt_stock, built_stock from public.products
-- where unbuilt_stock < 0 or built_stock < 0;
--
-- -- Invalid/missing prices among the 2 newly inserted rows (expect 0 rows):
-- select item_no, price_dkk from public.products
-- where item_no in ('95126', 'display-case') and (price_dkk is null or price_dkk <= 0);
