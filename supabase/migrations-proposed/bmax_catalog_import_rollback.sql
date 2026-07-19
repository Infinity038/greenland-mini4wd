-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- Rollback for bmax_catalog_import_forward.sql
--
-- Removes ONLY the 106 rows that migration inserts, identified by an
-- explicit, deterministic item_no list — never a heuristic like "everything
-- created after timestamp X" or "everything not in the original 14," either
-- of which could catch a row this migration never touched. Restores the 14
-- existing rows' image_url (and, for 19431, chassis/description) to their
-- exact prior values. Drops price_on_request and product_inquiries only if
-- doing so is safe (see the checks below) — never blindly.
--
-- DOES NOT DELETE OR MODIFY THE ORIGINAL 14 LIVE ROWS' PRICE, STOCK, STATUS,
-- OR AVAILABILITY. The only UPDATEs against those 14 rows below restore
-- image_url/chassis/description to the exact values captured before the
-- forward migration ran — nothing else on those rows is ever touched.
--
-- DOES NOT REMOVE PR #2'S EXISTING image_url WORK — the restored values ARE
-- PR #2's original poster+Cloudinary image_url strings, byte-for-byte.
--
-- IRREVERSIBLE LIMITATION (documented, not silently worked around): if a
-- real order, preorder, wishlist entry, or product_inquiries row has since
-- been created against any of the 106 inserted products, deleting those
-- rows would either violate a foreign-key constraint or orphan that
-- reference. This rollback does NOT delete blindly — the preflight check
-- below aborts if any of the 106 rows is referenced anywhere, and the
-- operator must resolve those references by hand before the rollback can
-- safely proceed. There is no way to make this step fully automatic without
-- risking real customer data.
--
-- Also drops the partial unique index, the price_on_request column, and the
-- product_inquiries table this migration created — each ONLY if doing so is
-- safe: see the checks below. If price_on_request is already false on every
-- remaining row and product_inquiries is empty, dropping them is a clean,
-- lossless rollback; otherwise this script leaves them in place and warns,
-- since silently discarding real inquiry leads or reintroducing duplicate
-- item_nos is never a safe default.

begin;

do $$
declare
  referenced_orders integer;
  referenced_preorders integer;
  referenced_wishlist integer;
  referenced_inquiries integer;
  target_ids uuid[];
begin
  select array_agg(id) into target_ids
  from public.products
  where item_no in ('15347', '15375', '15381', '15383', '15391', '15392', '15394', '15398', '15401', '15402', '15405', '15408', '15416', '15417', '15429', '15430', '15434', '15449', '15450', '15451', '15452', '15453', '15455', '15456', '15457', '15458', '15459', '15462', '15463', '15464', '15465', '15472', '15473', '15474', '15476', '15477', '15484', '15485', '15486', '15487', '15488', '15489', '15490', '15492', '15498', '15499', '15501', '15505', '15506', '15508', '15510', '15512', '15514', '15516', '15518', '15519', '15523', '15524', '15525', '15526', '15527', '15528', '15534', '15541', '15542', '15544', '18069', '18086', '18094', '18095', '18097', '18100', '18101', '18103', '18104', '18105', '18625', '18627', '18632', '18635', '18640', '18646', '18647', '18650', '18657', '18658', '18659', '18660', '18661', '18662', '18701', '18703', '18706', '18707', '18714', '18718', '19438', '92453', '95126', '95190', '95297', '95569', '95570', '95598', '95703', 'display-case');

  if target_ids is null or array_length(target_ids, 1) is null then
    raise notice 'None of the 106 catalog item_nos exist live — nothing to roll back.';
  else
    select count(*) into referenced_orders from public.orders where product_id = any(target_ids);
    select count(*) into referenced_preorders from public.preorders where product_id = any(target_ids);
    select count(*) into referenced_wishlist from public.wishlist where product_id = any(target_ids);
    select count(*) into referenced_inquiries from public.product_inquiries where product_id = any(target_ids);

    if referenced_orders > 0 or referenced_preorders > 0 or referenced_wishlist > 0 or referenced_inquiries > 0 then
      raise exception 'ABORT: the inserted catalog rows are referenced by % order(s), % preorder(s), % wishlist row(s), % inquiry/inquiries — resolve those manually before rolling back this migration.',
        referenced_orders, referenced_preorders, referenced_wishlist, referenced_inquiries;
    end if;
  end if;
end $$;

-- Explicit, deterministic target list — the only 106 item_nos this
-- migration ever inserts. Never touches any other row.
delete from public.products
where item_no in ('15347', '15375', '15381', '15383', '15391', '15392', '15394', '15398', '15401', '15402', '15405', '15408', '15416', '15417', '15429', '15430', '15434', '15449', '15450', '15451', '15452', '15453', '15455', '15456', '15457', '15458', '15459', '15462', '15463', '15464', '15465', '15472', '15473', '15474', '15476', '15477', '15484', '15485', '15486', '15487', '15488', '15489', '15490', '15492', '15498', '15499', '15501', '15505', '15506', '15508', '15510', '15512', '15514', '15516', '15518', '15519', '15523', '15524', '15525', '15526', '15527', '15528', '15534', '15541', '15542', '15544', '18069', '18086', '18094', '18095', '18097', '18100', '18101', '18103', '18104', '18105', '18625', '18627', '18632', '18635', '18640', '18646', '18647', '18650', '18657', '18658', '18659', '18660', '18661', '18662', '18701', '18703', '18706', '18707', '18714', '18718', '19438', '92453', '95126', '95190', '95297', '95569', '95570', '95598', '95703', 'display-case');

-- Restore the 14 existing rows' prior image_url (+ 19431's chassis and
-- description) exactly — guarded by the corrected (post-migration) value so
-- this is idempotent and never clobbers an independent edit made since.
update public.products set image_url = '/catalog/products/18099-ray-spear.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781817850/ChatGPT_Image_Jun_18_2026_08_23_37_PM_jbezcc.png' where item_no = '18099' and image_url = '/catalog/products/18099-ray-spear.webp';
update public.products set image_url = '/catalog/products/18704-shadow-shark.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781711223/ChatGPT_Image_Jun_17_2026_02_46_05_PM_y7oto3.png' where item_no = '18704' and image_url = '/catalog/products/18704-shadow-shark.webp';
update public.products set image_url = '/catalog/products/18705-flame-astute.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781817856/ChatGPT_Image_Jun_18_2026_08_23_31_PM_fhruh8.png' where item_no = '18705' and image_url = '/catalog/products/18705-flame-astute.webp';
update public.products set image_url = '/catalog/products/18710-mini-4wd-starter-pack-fm-a-balanced-spec-rowdy-bull.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1782250355/ChatGPT_Image_Jun_23_2026_08_32_18_PM_bcll7s.png' where item_no = '18710' and image_url = '/catalog/products/18710-mini-4wd-starter-pack-fm-a-balanced-spec-rowdy-bull.webp';
update public.products set image_url = '/catalog/products/19431-magnum-saber-premium.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781711226/ChatGPT_Image_Jun_17_2026_02_45_59_PM_lhcjb1.png', chassis = 'AR', description = 'Iconic Magnum livery on AR Chassis. White and blue fully cowled body with green wheels and gold eagle emblem. Pre-assembled. Only 1 unit — sold out from supplier, never restocking.' where item_no = '19431' and image_url = '/catalog/products/19431-magnum-saber-premium.webp' and chassis = 'Super-II';
update public.products set image_url = 'https://res.cloudinary.com/dcedaioew/image/upload/v1782210255/ChatGPT_Image_Jun_23_2026_09_23_48_AM_kafe8o.png' where item_no = '19440' and image_url = '';
update public.products set image_url = 'https://res.cloudinary.com/dcedaioew/image/upload/v1782209340/ChatGPT_Image_Jun_23_2026_09_08_20_AM_brylfs.png' where item_no = '19442' and image_url = '';
update public.products set image_url = '/catalog/products/19443-diospada-premium.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781817856/ChatGPT_Image_Jun_18_2026_08_23_34_PM_sialor.png' where item_no = '19443' and image_url = '/catalog/products/19443-diospada-premium.webp';
update public.products set image_url = '/catalog/products/19447-beak-stinger-g.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781817851/ChatGPT_Image_Jun_18_2026_08_23_46_PM_nu2y8z.png' where item_no = '19447' and image_url = '/catalog/products/19447-beak-stinger-g.webp';
update public.products set image_url = '/catalog/products/19451-gun-bluster-xto-premium.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781817853/ChatGPT_Image_Jun_18_2026_08_23_35_PM_lzhia4.png' where item_no = '19451' and image_url = '/catalog/products/19451-gun-bluster-xto-premium.webp';
update public.products set image_url = 'https://res.cloudinary.com/dcedaioew/image/upload/v1781908295/ChatGPT_Image_Jun_19_2026_09_31_25_PM_awnnca.png' where item_no = '92461' and image_url = '';
update public.products set image_url = '/catalog/products/92462-mach-frame-philippine-cup-special.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781711221/ChatGPT_Image_Jun_17_2026_02_46_09_PM_ip5mpp.png' where item_no = '92462' and image_url = '/catalog/products/92462-mach-frame-philippine-cup-special.webp';
update public.products set image_url = '/catalog/products/95571-exflowly-polycarbonate-body-special-purple.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781908146/ChatGPT_Image_Jun_19_2026_09_27_36_PM_qwhbs2.png' where item_no = '95571' and image_url = '/catalog/products/95571-exflowly-polycarbonate-body-special-purple.webp';
update public.products set image_url = '/catalog/products/95706-geo-glider-asia-challenge-2026-special.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781711221/ChatGPT_Image_Jun_17_2026_02_46_07_PM_ieyjk1.png' where item_no = '95706' and image_url = '/catalog/products/95706-geo-glider-asia-challenge-2026-special.webp';

-- Drop the product_inquiries table only if it is empty — never discard real
-- customer inquiry leads as a side effect of rolling back the catalog import.
do $$
declare
  inquiry_count integer;
begin
  select count(*) into inquiry_count from public.product_inquiries;
  if inquiry_count = 0 then
    drop table if exists public.product_inquiries;
  else
    raise warning 'NOT dropping product_inquiries — % row(s) exist. Leaving the table in place.', inquiry_count;
  end if;
end $$;

-- Drop price_on_request only if nothing live still relies on it being true —
-- otherwise dropping the column would silently make an unpriced product look
-- purchasable.
do $$
declare
  on_request_count integer;
begin
  select count(*) into on_request_count from public.products where price_on_request = true;
  if on_request_count = 0 then
    alter table public.products drop column if exists price_on_request;
  else
    raise warning 'NOT dropping price_on_request — % row(s) still have it set true. Leaving the column in place.', on_request_count;
  end if;
end $$;

-- Drop the uniqueness safeguard only if no duplicate item_no has appeared
-- since.
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
-- -- Confirm all 106 inserted rows are gone:
-- select item_no from public.products where item_no in ('15347', '15375', '15381', '15383', '15391', '15392', '15394', '15398', '15401', '15402', '15405', '15408', '15416', '15417', '15429', '15430', '15434', '15449', '15450', '15451', '15452', '15453', '15455', '15456', '15457', '15458', '15459', '15462', '15463', '15464', '15465', '15472', '15473', '15474', '15476', '15477', '15484', '15485', '15486', '15487', '15488', '15489', '15490', '15492', '15498', '15499', '15501', '15505', '15506', '15508', '15510', '15512', '15514', '15516', '15518', '15519', '15523', '15524', '15525', '15526', '15527', '15528', '15534', '15541', '15542', '15544', '18069', '18086', '18094', '18095', '18097', '18100', '18101', '18103', '18104', '18105', '18625', '18627', '18632', '18635', '18640', '18646', '18647', '18650', '18657', '18658', '18659', '18660', '18661', '18662', '18701', '18703', '18706', '18707', '18714', '18718', '19438', '92453', '95126', '95190', '95297', '95569', '95570', '95598', '95703', 'display-case');
-- -- expect 0 rows
--
-- -- Confirm the 14 original rows are present with prior image_url/chassis
-- -- restored exactly (expect 14 rows, matching the pre-migration snapshot):
-- select item_no, name, price_dkk, status, chassis, image_url from public.products
-- where item_no in ('18099', '18704', '18705', '18710', '19431', '19440', '19442', '19443', '19447', '19451', '92461', '92462', '95571', '95706')
-- order by item_no;
--
-- -- Confirm price_on_request / product_inquiries / the unique index state:
-- select column_name from information_schema.columns where table_name = 'products' and column_name = 'price_on_request';
-- select table_name from information_schema.tables where table_name = 'product_inquiries';
-- select indexname, indexdef from pg_indexes where indexname = 'products_item_no_unique_idx';
