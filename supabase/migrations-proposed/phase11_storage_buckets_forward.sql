-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 11 — SUPABASE STORAGE BUCKETS AND IMAGE MIGRATION
--
-- PREREQUISITES: Phase 1-2 live (auth_user_id, has_staff_role()). This
--   project currently has ZERO Supabase Storage buckets (confirmed via
--   `storage.buckets` in the read-only audit) — every image today is an
--   external Cloudinary URL in a plain text column. This phase creates the
--   buckets and their access policies; it does NOT migrate existing images
--   (that is a data-movement task, not a schema change — see below).
--
-- CODE DEPENDENCIES (not applied in this pass):
--   - A one-off script (not SQL — needs to fetch each existing Cloudinary
--     URL and re-upload the bytes to the matching bucket) walks
--     `products.image_url`, `gallery_items.image_url`, `cars.image_url`,
--     `members.avatar_url`, `news_posts.image_url`, `tournaments.image_url`,
--     downloads each, uploads to the matching bucket/path, and only then
--     updates the column to the new `storage.objects` public URL — keep the
--     old Cloudinary URL as a fallback until every row is confirmed
--     migrated, never overwrite-then-verify.
--   - Upload UI (admin product/gallery/car/avatar forms) switches from
--     "paste a URL" to `supabase.storage.from(bucket).upload(...)`.
--   - Known-bad URL "repair" logic (the Cloudinary drilldown/thumbnails
--     regex patches noted in docs/LIVE-SCHEMA-SECURITY-AUDIT.md §6) becomes
--     unnecessary once a row's image is Storage-backed, but should stay in
--     place as a fallback for any row not yet migrated.
--
-- DATA BACKFILL: none in this SQL file — see the script described above.
--
-- TESTING: an anonymous request can read a public bucket's object without a
--   session; only staff (or, for avatars, the owning member) can write to it.
--
-- VERIFICATION QUERIES:
--   select id, public from storage.buckets; -- 4 rows, all public = true
--   select bucket_id, count(*) from storage.objects group by bucket_id; -- 0 until migration script runs
--
-- RISKS: `avatars` bucket policy relies on a `<auth.uid()>/filename` path
--   convention — the upload code MUST place files under that folder
--   structure or the ownership check below silently denies every upload.
--
-- STOP CONDITIONS: none specific to this phase beyond the general gate.
--
-- ROLLBACK TRIGGERS: see phase11_storage_buckets_rollback.sql. Do not run
-- the rollback once real objects exist in these buckets without exporting
-- them first — dropping a bucket deletes its objects.

begin;

insert into storage.buckets (id, name, public) values
  ('product-images', 'product-images', true),
  ('gallery-images', 'gallery-images', true),
  ('car-images', 'car-images', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- product-images: public read, shop_staff/admin write
create policy "public read product images" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "staff write product images" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.has_staff_role(array['shop_staff', 'admin']::public.staff_role[]));
create policy "staff update product images" on storage.objects
  for update using (bucket_id = 'product-images' and public.has_staff_role(array['shop_staff', 'admin']::public.staff_role[]));
create policy "staff delete product images" on storage.objects
  for delete using (bucket_id = 'product-images' and public.has_staff_role(array['shop_staff', 'admin']::public.staff_role[]));

-- gallery-images: public read, admin write
create policy "public read gallery images" on storage.objects
  for select using (bucket_id = 'gallery-images');
create policy "admin write gallery images" on storage.objects
  for all using (bucket_id = 'gallery-images' and public.is_admin())
  with check (bucket_id = 'gallery-images' and public.is_admin());

-- car-images: public read, owning racer OR registration_staff/admin write
create policy "public read car images" on storage.objects
  for select using (bucket_id = 'car-images');
create policy "racer or staff write car images" on storage.objects
  for insert with check (
    bucket_id = 'car-images' and (
      (storage.foldername(name))[1] = (select id::text from public.members where auth_user_id = auth.uid())
      or public.has_staff_role(array['registration_staff', 'admin']::public.staff_role[])
    )
  );
create policy "racer or staff manage car images" on storage.objects
  for all using (
    bucket_id = 'car-images' and (
      (storage.foldername(name))[1] = (select id::text from public.members where auth_user_id = auth.uid())
      or public.has_staff_role(array['registration_staff', 'admin']::public.staff_role[])
    )
  );

-- avatars: public read, only the owning member may write to their own
-- `<members.id>/...` folder.
create policy "public read avatars" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "racer manage own avatar" on storage.objects
  for all using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select id::text from public.members where auth_user_id = auth.uid())
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select id::text from public.members where auth_user_id = auth.uid())
  );

commit;
