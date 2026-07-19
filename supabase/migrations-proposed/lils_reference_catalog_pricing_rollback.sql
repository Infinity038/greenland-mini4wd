-- Restores the exact pre-rollout price fields captured before the
-- 2026-07-19 Lil's-reference pricing update.
--
-- This does not change stock, descriptions, images, status, availability,
-- orders, preorders, inquiries, or any other product fields.

begin;

do $$
declare
  backup_count integer;
  product_count integer;
  missing_count integer;
begin
  select count(*) into backup_count
  from public.catalog_pricing_backup_20260719;

  select count(*) into product_count
  from public.products;

  select count(*) into missing_count
  from public.products p
  left join public.catalog_pricing_backup_20260719 b using (item_no)
  where b.item_no is null;

  if backup_count <> 120 or product_count <> 120 or missing_count <> 0 then
    raise exception 'Rollback preflight failed: backup %, products %, missing backups %',
      backup_count, product_count, missing_count;
  end if;
end $$;

update public.products p
set
  price_dkk = b.price_dkk,
  price_on_request = b.price_on_request,
  unbuilt_price_dkk = b.unbuilt_price_dkk,
  unbuilt_case_price_dkk = b.unbuilt_case_price_dkk,
  built_price_dkk = b.built_price_dkk,
  built_case_price_dkk = b.built_case_price_dkk,
  original_price_dkk = b.original_price_dkk,
  unbuilt_original_price_dkk = b.unbuilt_original_price_dkk,
  unbuilt_case_original_price_dkk = b.unbuilt_case_original_price_dkk,
  built_original_price_dkk = b.built_original_price_dkk,
  built_case_original_price_dkk = b.built_case_original_price_dkk
from public.catalog_pricing_backup_20260719 b
where p.item_no = b.item_no;

do $$
declare
  restored_count integer;
begin
  select count(*) into restored_count
  from public.products p
  join public.catalog_pricing_backup_20260719 b using (item_no)
  where p.price_dkk is not distinct from b.price_dkk
    and p.price_on_request is not distinct from b.price_on_request
    and p.unbuilt_price_dkk is not distinct from b.unbuilt_price_dkk
    and p.unbuilt_case_price_dkk is not distinct from b.unbuilt_case_price_dkk
    and p.built_price_dkk is not distinct from b.built_price_dkk
    and p.built_case_price_dkk is not distinct from b.built_case_price_dkk
    and p.original_price_dkk is not distinct from b.original_price_dkk
    and p.unbuilt_original_price_dkk is not distinct from b.unbuilt_original_price_dkk
    and p.unbuilt_case_original_price_dkk is not distinct from b.unbuilt_case_original_price_dkk
    and p.built_original_price_dkk is not distinct from b.built_original_price_dkk
    and p.built_case_original_price_dkk is not distinct from b.built_case_original_price_dkk;

  if restored_count <> 120 then
    raise exception 'Rollback verification failed: restored % of 120 rows', restored_count;
  end if;
end $$;

commit;
