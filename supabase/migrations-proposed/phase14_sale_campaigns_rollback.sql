-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 14 ROLLBACK
--
-- LIMITATION: PostgreSQL does not support removing a value from an ENUM
-- type. The 'shop_manager' value added to public.staff_role by the forward
-- migration CANNOT be cleanly removed by this rollback. If a true full
-- revert of the enum is ever required, it requires recreating the type
-- (`create type staff_role_new ...`, migrate `staff_roles.role` column to
-- it, drop the old type, rename) — out of scope for a routine rollback and
-- not attempted here. In practice this is harmless to leave in place: an
-- unused enum value with no rows referencing it has no effect.
--
-- WARNING: if any real campaigns exist by the time this is considered,
-- export sale_campaigns/sale_campaign_scopes/sale_campaign_exclusions
-- first — this is live pricing/business data at that point.
--
-- ROLLBACK TRIGGERS: see phase14_sale_campaigns_forward.sql.

begin;

revoke select on public.active_campaign_display from anon, authenticated;
drop view if exists public.active_campaign_display;

drop policy if exists "staff read campaign exclusions" on public.sale_campaign_exclusions;
drop policy if exists "staff manage own campaign exclusions" on public.sale_campaign_exclusions;
drop table if exists public.sale_campaign_exclusions;

drop policy if exists "staff read campaign scopes" on public.sale_campaign_scopes;
drop policy if exists "staff manage own campaign scopes" on public.sale_campaign_scopes;
drop table if exists public.sale_campaign_scopes;

alter table public.pricing_audit_events drop constraint if exists pricing_audit_events_campaign_fkey;

drop policy if exists "staff read all campaigns" on public.sale_campaigns;
drop policy if exists "shop_manager create standard sale campaigns" on public.sale_campaigns;
drop policy if exists "admin create any campaign" on public.sale_campaigns;
drop policy if exists "shop_manager update own standard sale campaigns" on public.sale_campaigns;
drop policy if exists "admin update any campaign" on public.sale_campaigns;
drop policy if exists "admin delete campaigns" on public.sale_campaigns;
drop table if exists public.sale_campaigns;

commit;
