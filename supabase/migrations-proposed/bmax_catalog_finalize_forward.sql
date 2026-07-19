-- DO NOT RUN ON PRODUCTION UNTIL THE BASE CATALOG IMPORT HAS PASSED IN ISOLATION.
--
-- Final hardening pass for bmax_catalog_import_forward.sql.
-- Execution order:
--   1. bmax_catalog_import_forward.sql
--   2. bmax_catalog_finalize_forward.sql (this file)
--
-- This migration deliberately does not alter product prices, stock, status,
-- availability, order behavior, or poster mappings. It:
--   - verifies the expected 120-row post-import state,
--   - replaces internal/promotional descriptions with conservative public copy,
--   - enforces the owner-approved Super-II correction for item 19431,
--   - protects customer inquiry data with RLS and a validating trigger.

begin;

-- The base import must have completed exactly as reviewed before this file can
-- touch anything. These assertions also prevent a broad description update on
-- an unexpected catalog state.
do $$
declare
  total_count integer;
  por_count integer;
  poster_count integer;
  legacy_image_count integer;
  zero_price_count integer;
begin
  select count(*) into total_count from public.products;
  if total_count <> 120 then
    raise exception 'ABORT: expected exactly 120 products after base import, found %.', total_count;
  end if;

  select count(*) into por_count from public.products where price_on_request is true;
  if por_count <> 104 then
    raise exception 'ABORT: expected exactly 104 price-on-request products, found %.', por_count;
  end if;

  select count(*) into poster_count
  from public.products
  where image_url like '/catalog/products/%.webp';
  if poster_count <> 95 then
    raise exception 'ABORT: expected exactly 95 local poster mappings, found %.', poster_count;
  end if;

  select count(*) into legacy_image_count
  from public.products
  where coalesce(image_url, '') like '%,%'
     or coalesce(image_url, '') ilike '%cloudinary%';
  if legacy_image_count <> 0 then
    raise exception 'ABORT: % legacy/comma-separated product image value(s) remain.', legacy_image_count;
  end if;

  select count(*) into zero_price_count from public.products where price_dkk = 0;
  if zero_price_count <> 0 then
    raise exception 'ABORT: % product(s) still use a fake 0 DKK price.', zero_price_count;
  end if;
end $$;

-- Conservative customer-facing descriptions. These intentionally avoid
-- inventory statements, supplier claims, pricing commentary, sales advice,
-- and unverified performance claims.
update public.products
set
  chassis = case when item_no = '19431' then 'Super-II' else chassis end,
  description = case
    when item_no = 'display-case' then
      'Protective display case sized for a Mini 4WD car.'
    when category = 'cars' then
      name || ' is a Tamiya Mini 4WD assembly kit' ||
      case
        when coalesce(case when item_no = '19431' then 'Super-II' else chassis end, '') <> ''
          then ' using the ' || (case when item_no = '19431' then 'Super-II' else chassis end) || ' chassis'
        else ''
      end || '.'
    when category = 'parts' then
      name || ' is a Tamiya Mini 4WD Grade-Up Part' ||
      case
        when coalesce(chassis, '') <> '' and chassis <> 'Universal'
          then ' intended for ' || chassis || ' chassis applications'
        else ''
      end || '. Check the product packaging for included components and compatibility before installation.'
    else
      name || ' is a Mini 4WD accessory. Check the product details for dimensions and compatibility.'
  end;

-- Validate the completed description pass.
do $$
declare
  bad_count integer;
begin
  select count(*) into bad_count
  from public.products
  where description is null
     or btrim(description) = ''
     or description ~* '(imported exclusively|never restocking|sold out from supplier|pre-assembled|only 1 unit|sell with a warning|supplier cost|margin-verified|margin verified|recommended beginner|shop demonstration|large stock item)';

  if bad_count <> 0 then
    raise exception 'ABORT: % product description(s) are blank or still contain internal/unsupported wording.', bad_count;
  end if;

  if not exists (
    select 1 from public.products
    where item_no = '19431'
      and chassis = 'Super-II'
      and description ilike '%Super-II chassis%'
  ) then
    raise exception 'ABORT: item 19431 Super-II correction was not applied.';
  end if;
end $$;

-- Inquiry table security. The browser may submit a row, but can never read,
-- update, or delete inquiry data. A BEFORE INSERT trigger discards all
-- browser-supplied snapshot/status/ID values and derives the product snapshot
-- from public.products.
alter table public.product_inquiries enable row level security;
alter table public.product_inquiries force row level security;

revoke all on table public.product_inquiries from public;
revoke all on table public.product_inquiries from anon, authenticated;
grant insert on table public.product_inquiries to anon, authenticated;

create or replace function public.prepare_product_inquiry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  product_row record;
  normalized_name text;
  normalized_contact text;
  normalized_message text;
begin
  normalized_name := regexp_replace(btrim(coalesce(new.customer_name, '')), '\s+', ' ', 'g');
  normalized_contact := regexp_replace(btrim(coalesce(new.customer_contact, '')), '\s+', ' ', 'g');
  normalized_message := nullif(btrim(coalesce(new.message, '')), '');

  if char_length(normalized_name) < 2 or char_length(normalized_name) > 120 then
    raise exception 'Customer name must be between 2 and 120 characters.' using errcode = '22023';
  end if;
  if char_length(normalized_contact) < 3 or char_length(normalized_contact) > 240 then
    raise exception 'Customer contact must be between 3 and 240 characters.' using errcode = '22023';
  end if;
  if normalized_message is not null and char_length(normalized_message) > 1000 then
    raise exception 'Inquiry message must be 1000 characters or fewer.' using errcode = '22023';
  end if;

  select id, item_no, name
  into product_row
  from public.products
  where id = new.product_id
    and price_on_request is true;

  if not found then
    raise exception 'This product is not available for a price inquiry.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.product_inquiries
    where product_id = product_row.id
      and lower(customer_contact) = lower(normalized_contact)
      and created_at > now() - interval '5 minutes'
  ) then
    raise exception 'Please wait before sending another inquiry for this product.' using errcode = '22023';
  end if;

  new.id := gen_random_uuid();
  new.product_id := product_row.id;
  new.item_no := product_row.item_no;
  new.product_name := product_row.name;
  new.customer_name := normalized_name;
  new.customer_contact := normalized_contact;
  new.message := normalized_message;
  new.status := 'new';
  new.created_at := now();
  return new;
end;
$$;

revoke all on function public.prepare_product_inquiry() from public;
revoke all on function public.prepare_product_inquiry() from anon, authenticated;

drop trigger if exists product_inquiries_prepare_before_insert on public.product_inquiries;
create trigger product_inquiries_prepare_before_insert
before insert on public.product_inquiries
for each row execute function public.prepare_product_inquiry();

drop policy if exists product_inquiries_public_submit on public.product_inquiries;
create policy product_inquiries_public_submit
on public.product_inquiries
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.price_on_request is true
  )
);

commit;

-- Verification examples:
-- select count(*) from public.products; -- 120
-- select count(*) from public.products where price_on_request; -- 104
-- select count(*) from public.products where image_url like '/catalog/products/%.webp'; -- 95
-- select count(*) from public.products where image_url like '%,%' or image_url ilike '%cloudinary%'; -- 0
-- select relrowsecurity, relforcerowsecurity from pg_class where oid = 'public.product_inquiries'::regclass;
-- select grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='product_inquiries';
