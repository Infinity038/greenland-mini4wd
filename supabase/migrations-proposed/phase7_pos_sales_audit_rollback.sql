-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 7 ROLLBACK
--
-- ROLLBACK TRIGGERS: see phase7_pos_sales_audit_forward.sql. If any real
-- sales have been recorded by the time this is considered, do NOT run this
-- blind drop — export pos_sales/pos_sale_items/audit_log first (they are
-- financial and audit records at that point, not just schema scaffolding).

begin;

drop policy if exists "admin read audit log" on public.audit_log;
drop table if exists public.audit_log;

drop function if exists public.log_admin_action(text, text, text, jsonb);

drop policy if exists "racer read own pos sale items" on public.pos_sale_items;
drop policy if exists "staff manage pos sale items" on public.pos_sale_items;
drop table if exists public.pos_sale_items;

drop policy if exists "racer read own pos sales" on public.pos_sales;
drop policy if exists "staff manage pos sales" on public.pos_sales;
drop table if exists public.pos_sales;

commit;
