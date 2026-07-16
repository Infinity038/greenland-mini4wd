-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 7 — POS SALES, SALE ITEMS, PAYMENT CONFIRMATION, AUDIT LOGS
--
-- PREREQUISITES: Phase 1-6 live. This phase introduces the first real
--   (non-mock) backing tables for the POS terminal already built in this
--   branch (components/pos/POSTerminal.tsx and lib/pos*.ts) — those
--   currently operate entirely on in-memory mock arrays; this phase does
--   NOT wire the UI to these tables (that is a separate code change,
--   listed below), it only creates them.
--
-- CODE DEPENDENCIES (not applied in this pass):
--   - components/pos/POSTerminal.tsx and lib/posCatalog.ts /
--     lib/posRedemption.ts move from in-memory state to real
--     pos_sales/pos_sale_items reads/writes once this phase's tables exist
--     and Phase 9 (inventory-after-payment) is also live — sequencing
--     matters, this phase alone does not make POS "go live."
--   - Every admin/staff mutation across the app (not just POS) should
--     start writing an audit_log row via the log_admin_action() helper
--     below, not just POS sales — scope that decision explicitly with the
--     project owner before Phase 7 code lands, since it touches many files.
--
-- DATA BACKFILL: none — these are new tables with no live equivalent to
--   migrate from (the 3 existing `orders` rows are the online-order flow,
--   not POS; they are handled separately in Phase 9/12, not folded into
--   pos_sales here).
--
-- TESTING: a staff session can create a sale + items and see it; a racer
--   session can read only their own `pos_sales` rows (via member_id) and
--   cannot write to audit_log at all, even for their own actions.
--
-- VERIFICATION QUERIES:
--   select count(*) from pos_sales; select count(*) from pos_sale_items;
--   select count(*) from audit_log; -- all 0 immediately after this phase
--
-- RISKS: audit_log is meant to be tamper-evident — this phase deliberately
--   gives it no UPDATE/DELETE policy for anyone including admin (append-only
--   at the RLS layer, not just by convention); if a genuine correction is
--   ever needed, it should be a new compensating row, not an edit.
--
-- STOP CONDITIONS: none specific to this phase beyond the general per-phase
--   gate in docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md.
--
-- ROLLBACK TRIGGERS: see phase7_pos_sales_audit_rollback.sql.

begin;

create table public.pos_sales (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id), -- nullable: walk-in/non-member sales are allowed
  staff_user_id uuid not null references auth.users(id),
  payment_method text not null check (payment_method in ('cash', 'mobilepay', 'card', 'other')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'confirmed', 'voided')),
  subtotal_dkk numeric not null default 0,
  discount_dkk numeric not null default 0,
  total_dkk numeric not null default 0,
  redemption_token text, -- references the loyalty/shop-credit redemption applied, if any (Phase 8)
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  voided_at timestamptz,
  voided_reason text
);

create table public.pos_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.pos_sales(id) on delete cascade,
  product_id uuid references public.products(id), -- nullable: service-type line items have no product row
  service_code text,
  description text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_dkk numeric not null,
  line_total_dkk numeric not null,
  check (product_id is not null or service_code is not null)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  action text not null,
  table_name text not null,
  record_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.log_admin_action(
  p_action text, p_table_name text, p_record_id text, p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audit_log (actor_user_id, action, table_name, record_id, details)
  values (auth.uid(), p_action, p_table_name, p_record_id, p_details);
$$;

alter table public.pos_sales enable row level security;
create policy "racer read own pos sales" on public.pos_sales
  for select using (member_id = public.current_member_id());
create policy "staff manage pos sales" on public.pos_sales
  for all using (public.has_staff_role(array['shop_staff','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['shop_staff','admin']::public.staff_role[]));

alter table public.pos_sale_items enable row level security;
create policy "racer read own pos sale items" on public.pos_sale_items
  for select using (
    exists (select 1 from public.pos_sales s where s.id = sale_id and s.member_id = public.current_member_id())
  );
create policy "staff manage pos sale items" on public.pos_sale_items
  for all using (public.has_staff_role(array['shop_staff','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['shop_staff','admin']::public.staff_role[]));

alter table public.audit_log enable row level security;
create policy "admin read audit log" on public.audit_log
  for select using (public.is_admin());
-- Deliberately no INSERT/UPDATE/DELETE policy for anyone, including admin —
-- rows are written exclusively through log_admin_action() (SECURITY
-- DEFINER), and never edited or deleted by anyone through the API.

commit;
