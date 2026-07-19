-- Rollback companion for bmax_catalog_finalize_forward.sql.
--
-- Run this BEFORE bmax_catalog_import_rollback.sql. The base rollback then:
--   - deletes the 106 inserted catalog rows,
--   - restores the exact original 14 descriptions/chassis/image_url values,
--   - drops product_inquiries and price_on_request when safe.
--
-- This file only removes the security objects added by the final hardening
-- pass so the base rollback can proceed cleanly. It does not expose inquiry
-- records or change product commercial fields.

begin;

drop policy if exists product_inquiries_public_submit on public.product_inquiries;
drop trigger if exists product_inquiries_prepare_before_insert on public.product_inquiries;
drop function if exists public.prepare_product_inquiry();

revoke all on table public.product_inquiries from anon, authenticated;

-- Keep RLS enabled until the base rollback drops the table. Disabling RLS here
-- would create an unnecessary exposure window if the operator pauses between
-- the two rollback files.

commit;
