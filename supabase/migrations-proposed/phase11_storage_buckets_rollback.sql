-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 11 ROLLBACK
--
-- WARNING: dropping a storage bucket deletes every object inside it. If any
-- real images have been migrated into these buckets by the time this is
-- considered, export them first — this is not reversible schema
-- scaffolding at that point, it is real media.
--
-- ROLLBACK TRIGGERS: see phase11_storage_buckets_forward.sql.

begin;

drop policy if exists "public read product images" on storage.objects;
drop policy if exists "staff write product images" on storage.objects;
drop policy if exists "staff update product images" on storage.objects;
drop policy if exists "staff delete product images" on storage.objects;

drop policy if exists "public read gallery images" on storage.objects;
drop policy if exists "admin write gallery images" on storage.objects;

drop policy if exists "public read car images" on storage.objects;
drop policy if exists "racer or staff write car images" on storage.objects;
drop policy if exists "racer or staff manage car images" on storage.objects;

drop policy if exists "public read avatars" on storage.objects;
drop policy if exists "racer manage own avatar" on storage.objects;

delete from storage.buckets where id in ('product-images', 'gallery-images', 'car-images', 'avatars');

commit;
