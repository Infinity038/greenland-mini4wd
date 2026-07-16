# RLS Policy Matrix — Greenland Mini4WD

Target-state reference for the Phase 3 rollout
(`supabase/migrations-proposed/phase3_rls_policies_forward.sql`). Nothing in
this document has been applied. Policies assume Phase 1 (`members.auth_user_id`)
and Phase 2 (`staff_roles`, `has_staff_role()`, `is_admin()`) are already live.

## Ownership-column reality check

Only 5 tables have a real `member_id uuid` foreign key into `members`:
`hall_of_fame`, `loyalty_points`, `points_transactions`,
`profile_edit_requests`, `race_results`. Every other member-scoped table
carries a plain `member_email text` with **no FK** — `orders`, `cars`,
`race_tickets`, `race_entries`, `rsvps`, `referrals`, `wishlist`, `preorders`,
`ticket_transactions`, `tickets`. RLS on the email-keyed tables therefore uses:

```sql
member_email = (select email from members where auth_user_id = auth.uid())
```

which is case-sensitive and only as correct as the data in `members.email`
already is. This is a known soft spot — flagged again in Phase 3's stop
conditions.

## Helper functions (defined in Phase 2, used throughout Phase 3)

- `public.is_admin()` — true if `auth.uid()` has the `admin` staff role.
- `public.has_staff_role(roles staff_role[])` — true if `auth.uid()` has any
  role in the given list.
- `public.owns_member_row(member_row_email text)` — true if
  `member_row_email = (select email from members where auth_user_id = auth.uid())`.

## Group A — Public read-only (no auth required)

| Table | SELECT | INSERT/UPDATE/DELETE | Notes |
|---|---|---|---|
| `products` | `available = true` (drop `status='in stock'`-only assumption — confirm with owner which statuses count as "published") | staff/admin only | |
| `events` | `true` (all events are public listings) | staff/admin only | |
| `tournaments` | `true` | staff/admin only | |
| `race_results` | `true` | staff/admin only | results are official records |
| `season_standings` (view) | `true` | n/a (view) | drop `SECURITY DEFINER`; recreate as a plain view so it respects the querying user's RLS on `race_results`, not the view creator's |
| `hall_of_fame` | `true` | staff/admin only | |
| `hall_of_fame_history` | `true` | staff/admin only | |
| `news_posts` | `published = true` (staff/admin can additionally see unpublished drafts) | staff/admin only | |
| `gallery_items` | `published = true` | staff/admin only | column doesn't currently exist for gallery_items in the same way — verify before applying, current gallery_items has no `published` column; add one or gate on staff-side "hidden" flag before enabling public SELECT filtering |
| `seasons` | `true` | staff/admin only | |
| `discount_codes` | **no public SELECT** (a code should be validated server-side/RPC, not enumerated by browsing the table) | staff/admin only | move to Group D in practice |
| `signups` (newsletter-style) | none — write-only from the public | `INSERT` open to `anon`/`authenticated` (rate-limit at the app layer, not RLS) | no SELECT policy at all for non-staff |

## Group B — Racer-owned private data (row belongs to the authenticated user)

| Table | SELECT | INSERT | UPDATE | DELETE | Ownership check |
|---|---|---|---|---|---|
| `members` | own row only | n/a (created via Phase 1 migration / trigger on signup, not direct insert) | own row, **excluding** `password_hash`, `total_points`, `rank`, `loyalty_tier`, `points_rate`, `member_status`, `is_active_member` (system/staff-controlled columns) | none | `auth_user_id = auth.uid()` |
| `cars` | own rows | own rows (`status` forced to `pending` regardless of client input) | own rows, **excluding** `status` (staff-only) | own rows while `status='pending'` only | `member_email` |
| `profile_edit_requests` | own rows | own rows | none (staff reviews via Group C) | none | `member_id` |
| `loyalty_points` | own row | none (system-managed) | none | none | `member_id` |
| `points_transactions` | own rows | none (system/staff-inserted only, via Phase 8 ledger functions) | none | none | `member_id` |
| `orders` | own rows | own rows (`status`/`payment_status` forced to initial values, not client-settable) | none post-creation (cancellation goes through a staff/RPC path, not a raw UPDATE) | none | `member_email` |
| `race_tickets` / `tickets` / `ticket_transactions` | own rows | own rows (payment fields forced to initial state) | none | none | `member_email` |
| `race_entries` | own rows | own rows | none | own rows while status allows cancellation | `member_email` |
| `rsvps` | own rows | own rows | none | own rows | `member_email` |
| `referrals` | rows where you are `referrer_email` or `referred_email` | system-inserted on qualifying signup, not direct client insert | none | none | `referrer_email` / `referred_email` |
| `wishlist` | own rows | own rows | none | own rows | `member_email` |
| `preorders` | own rows | own rows | none | own rows while `status='pending'` | `member_email` |
| `payment_proofs` | own rows (via joined `order_id`) | own rows | none | none | join to `orders.member_email` |

## Group C — Staff-managed

| Table | SELECT | INSERT | UPDATE | DELETE | Staff roles |
|---|---|---|---|---|---|
| `orders` | all rows | staff-created manual orders | `status`, `payment_status`, `admin_notes`, reward fields | none (cancel via status, not delete) | `shop_staff`, `admin` |
| `payment_proofs` | all rows | n/a | `status`, `reviewed_by`, `reviewed_at` | none | `shop_staff`, `admin` |
| `products` / `shop_inventory` | all rows | yes | yes | yes (soft-delete via `available=false` preferred) | `shop_staff`, `admin` |
| `race_entries` (check-in) | all rows | yes | `status` (check-in confirmation) | none | `checkin_staff`, `race_marshal`, `admin` |
| `race_results` | all rows | yes | yes | yes | `race_marshal`, `admin` |
| `cars` (approval) | all rows | n/a | `status` (approve/reject) | none | `registration_staff`, `admin` |
| `race_tickets` / `tickets` | all rows | yes | `payment_status` | none | `checkin_staff`, `shop_staff`, `admin` |
| `hall_of_fame` / `hall_of_fame_history` | all rows | yes | yes | yes | `race_marshal`, `admin` |
| Future: `pos_sales`, `pos_sale_items`, `audit_log` (Phase 7) | all rows | yes | append-only where applicable | none | `shop_staff`, `admin` |

## Group D — Admin-only

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `staff_roles` | admin only | admin only | admin only | admin only |
| `admin_config` | admin only | admin only | admin only | admin only |
| `discount_codes` / `discount_code_redemptions` | admin only (server validates a code via an RPC, not by exposing the table) | admin only | admin only | admin only |
| Manual point/credit adjustments (Phase 8 ledger, `type='manual_adjustment'` rows) | staff can read; only `admin` can insert this specific `type` | admin only for this type | none (ledger is append-only) | none |

## Cross-cutting rules

1. **Every table gets `ENABLE ROW LEVEL SECURITY` and at least a default-deny
   posture** — a table with RLS enabled and zero matching policies denies
   all access to `anon`/`authenticated`, which is exactly what should happen
   for tables not yet given an explicit policy (safer failure mode than the
   current "no RLS at all").
2. **No policy ever trusts a client-supplied `status`, `payment_status`,
   `points_awarded`, or `role` value.** Every column a client can set through
   an `INSERT`/`UPDATE` policy must either exclude these fields (`WITH CHECK`
   clauses referencing only non-privileged columns) or force them via a
   `BEFORE INSERT` trigger/default — this is what actually removes the
   "admin password protects nothing" problem, not just gating `/admin`.
3. **Ledger tables (`points_transactions`, future Shop Credit ledger) are
   never client-writable at all** — every row is inserted by a
   `SECURITY DEFINER` function that itself re-checks the caller's identity
   and role, so the append-only guarantee can't be bypassed by a direct
   `INSERT` even from an authenticated racer's own session.
4. **`season_standings`'s `SECURITY DEFINER` should be removed** — once
   `race_results` has a public-read policy, the view doesn't need to run as
   its creator; running as the querying user is strictly safer and is what
   the Supabase advisor recommends.
