-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 14 — SALE CAMPAIGN ENGINE (sale_campaigns, scopes, exclusions)
--
-- Implements docs/SALE-CAMPAIGN-RULES.md. Continues from Phase 13.
--
-- REUSE DECISIONS: campaign audit events reuse Phase 13's single
-- `pricing_audit_events` table (this phase only adds the FK Phase 13 left
-- unattached) rather than a second campaign-specific audit table. Scope and
-- exclusion rules reuse the same jsonb-per-rule shape as
-- lib/pricing/campaign.ts's ScopeRule/ExclusionRule discriminated unions —
-- one row per rule, `rule_kind` + `rule_data jsonb`, rather than a rigid
-- column-per-rule-type schema that would need a migration every time a new
-- targeting rule is added.
--
-- PREREQUISITES: Phase 13 applied. Adds the `shop_manager` staff role
-- (docs/PRICING-ADMIN-PERMISSIONS.md §16 — distinct from the existing
-- `shop_staff` POS role from Phase 2/7: shop_manager is pricing/campaign
-- authority, shop_staff is POS checkout authority; the same real person may
-- hold both roles).
--
-- CODE DEPENDENCIES (not applied in this pass): app/admin/pricing/
-- (currently Preview-only, in-memory) becomes Auth/RLS-backed once this
-- phase and Phase 4 (real admin auth) are both live — see
-- docs/PRE-PRODUCTION-REMOVAL-CHECKLIST.md item 3.
--
-- DATA BACKFILL: none — no campaigns exist today.
--
-- TESTING: a `shop_manager` session can INSERT a `standard_sale` campaign
--   at or above the 40% floor and cannot insert any other type or a lower
--   floor; an `admin` session can insert any type including `liquidation`
--   with a below-cost override; a `viewer` session cannot INSERT at all.
--
-- VERIFICATION QUERIES:
--   select type, count(*) from sale_campaigns group by 1;
--   select * from active_campaign_display; -- as anon, should only show enabled+in-window campaigns
--
-- RISKS: `active_campaign_display` is a deliberately narrow
-- SECURITY DEFINER-style view (no `security_invoker`, matching the
-- pre-Phase-3 default) exposing only customer-safe columns
-- (name/type/discount/badge/description/end date) from a table whose base
-- RLS is otherwise staff-only — the opposite fix from Phase 3's
-- `season_standings` change, and intentional here: it is the sanctioned way
-- to publish a narrow, safe slice of a staff-only table without granting
-- broader access. Do not add columns to this view without checking they
-- are customer-safe (never `internal_note`, `created_by`, or below-cost
-- override detail).
--
-- STOP CONDITIONS: `active_campaign_display` ever needs a column that is
-- not obviously safe for `anon` to read — stop and get that column's
-- exposure explicitly reviewed rather than adding it.
--
-- ROLLBACK TRIGGERS: see phase14_sale_campaigns_rollback.sql.

-- NOTE ON TRANSACTION STRUCTURE: PostgreSQL requires ALTER TYPE ... ADD VALUE
-- to be committed before the new enum value can be referenced (e.g. in a
-- CHECK/policy expression) — it cannot be added and used within the same
-- transaction. This statement therefore runs and commits on its own,
-- BEFORE the begin/commit block below, not inside it.
alter type public.staff_role add value if not exists 'shop_manager';

begin;

create table public.sale_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('standard_sale', 'anniversary_sale', 'clearance', 'liquidation')),
  requested_discount_percent numeric not null check (requested_discount_percent >= 0 and requested_discount_percent <= 1),
  minimum_allowed_margin numeric not null check (minimum_allowed_margin >= 0 and minimum_allowed_margin < 1),
  below_cost_override_reason text,
  below_cost_override_confirmed_by uuid references auth.users(id),
  below_cost_override_second_confirmed_by uuid references auth.users(id),
  below_cost_override_floor_dkk numeric,
  start_at timestamptz not null,
  end_at timestamptz not null,
  enabled boolean not null default false,
  badge_text text not null default '',
  internal_note text not null default '',
  public_description text not null default '',
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sale_campaigns_end_after_start check (end_at > start_at),
  constraint sale_campaigns_below_cost_requires_double_confirm check (
    below_cost_override_floor_dkk is null or (
      type = 'liquidation'
      and below_cost_override_confirmed_by is not null
      and below_cost_override_second_confirmed_by is not null
      and below_cost_override_confirmed_by <> below_cost_override_second_confirmed_by
    )
  )
);

create table public.sale_campaign_scopes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.sale_campaigns(id) on delete cascade,
  rule_kind text not null,
  rule_data jsonb not null default '{}'::jsonb
);

create table public.sale_campaign_exclusions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.sale_campaigns(id) on delete cascade,
  rule_kind text not null,
  rule_data jsonb not null default '{}'::jsonb
);

alter table public.pricing_audit_events
  add constraint pricing_audit_events_campaign_fkey
  foreign key (affected_campaign_id) references public.sale_campaigns(id);

alter table public.sale_campaigns enable row level security;
alter table public.sale_campaign_scopes enable row level security;
alter table public.sale_campaign_exclusions enable row level security;

create policy "staff read all campaigns" on public.sale_campaigns
  for select using (public.has_staff_role(array['shop_manager', 'admin', 'viewer']::public.staff_role[]));

create policy "shop_manager create standard sale campaigns" on public.sale_campaigns
  for insert with check (
    public.has_staff_role(array['shop_manager']::public.staff_role[])
    and type = 'standard_sale'
    and minimum_allowed_margin >= 0.4
    and below_cost_override_floor_dkk is null
    and created_by = auth.uid()
  );
create policy "admin create any campaign" on public.sale_campaigns
  for insert with check (public.is_admin() and created_by = auth.uid());

create policy "shop_manager update own standard sale campaigns" on public.sale_campaigns
  for update using (
    public.has_staff_role(array['shop_manager']::public.staff_role[]) and created_by = auth.uid() and type = 'standard_sale'
  )
  with check (type = 'standard_sale' and minimum_allowed_margin >= 0.4 and below_cost_override_floor_dkk is null);
create policy "admin update any campaign" on public.sale_campaigns
  for update using (public.is_admin()) with check (public.is_admin());
-- Formal approval/activation (`approved_by`, flipping `enabled`) is
-- Admin-only even for a shop_manager's own campaign — see
-- docs/PRICING-ADMIN-PERMISSIONS.md and the matching decision in
-- lib/pricing/permissions.ts (canApproveCampaign).
create policy "admin delete campaigns" on public.sale_campaigns
  for delete using (public.is_admin());

create policy "staff read campaign scopes" on public.sale_campaign_scopes
  for select using (public.has_staff_role(array['shop_manager', 'admin', 'viewer']::public.staff_role[]));
create policy "staff manage own campaign scopes" on public.sale_campaign_scopes
  for all using (
    exists (select 1 from public.sale_campaigns c where c.id = campaign_id and (c.created_by = auth.uid() or public.is_admin()))
  )
  with check (
    exists (select 1 from public.sale_campaigns c where c.id = campaign_id and (c.created_by = auth.uid() or public.is_admin()))
  );

create policy "staff read campaign exclusions" on public.sale_campaign_exclusions
  for select using (public.has_staff_role(array['shop_manager', 'admin', 'viewer']::public.staff_role[]));
create policy "staff manage own campaign exclusions" on public.sale_campaign_exclusions
  for all using (
    exists (select 1 from public.sale_campaigns c where c.id = campaign_id and (c.created_by = auth.uid() or public.is_admin()))
  )
  with check (
    exists (select 1 from public.sale_campaigns c where c.id = campaign_id and (c.created_by = auth.uid() or public.is_admin()))
  );

-- Narrow public-safe read of active campaigns for storefront display
-- (docs/SALE-CAMPAIGN-RULES.md §12) — see the RISKS note above for why this
-- intentionally does NOT use security_invoker.
create view public.active_campaign_display as
select id, name, type, requested_discount_percent, minimum_allowed_margin, badge_text, public_description, end_at
from public.sale_campaigns
where enabled = true and now() between start_at and end_at;

grant select on public.active_campaign_display to anon, authenticated;

commit;
