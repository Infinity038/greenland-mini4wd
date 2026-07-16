# Live Schema & Security Audit — Greenland Mini4WD Supabase Project

Read-only audit. No SQL beyond `SELECT` was executed to produce this document, no
schema or data was changed, and no row data (member emails, phone numbers,
password hashes, order contents) was read or is reproduced here — only schema
metadata (table/column/constraint names, types, defaults) and row *counts*.

## 1. Project identity — confirmed match

| | |
|---|---|
| Supabase project name | `greenland-mini4wd` |
| Project ref | `eojdjqihmxxaqltudqjx` |
| Project URL | `https://eojdjqihmxxaqltudqjx.supabase.co` |
| Vercel project | `greenland-mini4wd` (`prj_G3wNanoLQcuHyvXk8MitSVu7Yh2b`) |

Verified by fetching the live Production Vercel deployment's own client JS bundle
and finding the inlined `createClient()` call:

```
createClient("https://eojdjqihmxxaqltudqjx.supabase.co", "sb_publishable_PSOXAGuAf0uuI1T2oFye9w_Q323Gzy8")
```

This is a direct match against the connected Supabase project's ref/URL — not
just a name comparison. `sb_publishable_...` is the public anon/publishable
key; it is *meant* to be visible in every visitor's browser. The problem
identified below is not that this key is public (that's normal), it's that
nothing on the database side restricts what that key can do.

## 2. Authentication architecture (current)

No Supabase Auth usage anywhere in the codebase (zero references to
`auth.users`, `supabase.auth.*`). Two separate, both broken, home-grown systems
exist instead:

- **Members** — `members.password_hash` (bcrypt, hashed client-side in
  `app/register/page.tsx`). "Session" is `document.cookie = "gm4wd_registered=1"`
  plus `localStorage.gm4wd_member` — set entirely client-side, never verified
  server-side, trivially forgeable from devtools.
- **Admin** — `const ADMIN_PASSWORD = 'mini4wd2026'` compared client-side in
  `app/admin/login/page.tsx`, duplicated across 16 more files (full list in
  `docs/PROPOSED-admin-auth-plan.md`). `middleware.ts` line 24 explicitly
  exempts `/admin/*` from any check (`pathname.startsWith("/admin") →
  NextResponse.next()`). There is no server-side gate of any kind on admin
  routes.

## 3. Live schema — 29 tables, 1 view, 0 tracked migrations

`list_migrations` returned empty: this schema was built directly (dashboard /
SQL editor), not via Supabase CLI migration history. There is no prior
migration chain for the new phased plan to sit on top of — Phase 1 is the
first tracked migration this project will ever have.

Row counts (verified via `SELECT count(*)`, no row data read) confirm this is
live, real data, not an empty/dev database:

| table | rows | table | rows |
|---|---|---|---|
| members | 7 | race_tickets | 4 |
| products | 14 | race_entries | 1 |
| orders | 3 | seasons | 1 |
| tournaments | 2 | gallery_items | 0 |
| events | 0 | news_posts | 1 |
| shop_inventory | 1 | cars | 5 |

### 3.1 Full table list

`members, signups, orders, products, payment_proofs, tickets,
ticket_transactions, referrals, tournaments, race_tickets, events, rsvps,
news_posts, gallery_items, seasons, race_results, hall_of_fame,
hall_of_fame_history, loyalty_points, points_transactions, admin_config, cars,
race_entries, shop_inventory, preorders, discount_codes,
discount_code_redemptions, wishlist, profile_edit_requests` + view
`season_standings` (flagged `SECURITY DEFINER` by the Supabase advisor —
inherits the view creator's privileges rather than the querying user's).

### 3.2 Key tables — columns, constraints, ownership pattern

**`members`** (PK `id uuid`, UNIQUE `email`, UNIQUE `referral_code`):
`first_name, last_name, email, phone, nationality, city, experience,
password_hash, member_status(guest|registered|official), referral_code,
referred_by, rank, total_points, favorite_chassis, is_active_member,
membership_expires_at, loyalty_tier, points_rate, loyalty_progress,
loyalty_needed, weekly_loyalty_progress, season_loyalty_progress, name,
lifetime_spending, avatar_url`. **No `role`/`is_admin`/`staff` column of any
kind.** `email` is UNIQUE at the DB level (case-sensitive) — see
`docs/MEMBER-AUTH-MIGRATION-PLAN.md` §2 for why this does not fully rule out
duplicate accounts once Supabase Auth (case-insensitive on email) is added.

**Ownership-column split — important for RLS design (`docs/RLS-POLICY-MATRIX.md`):**
Only 5 tables reference `members` with a real foreign key on `member_id uuid`:
`hall_of_fame`, `loyalty_points` (UNIQUE on `member_id`), `points_transactions`,
`profile_edit_requests`, `race_results`. Every other member-scoped table
(`orders`, `cars`, `race_tickets`, `race_entries`, `rsvps`, `referrals`,
`wishlist`, `preorders`) stores a plain `member_email text` with **no foreign
key to `members.email`** — ownership is convention-only, not referentially
enforced. RLS policies on these tables must join via
`member_email = (select email from members where auth_user_id = auth.uid())`,
not a clean `member_id` join, and that join is inherently case-sensitive
unless normalized.

**`products`** (PK `id uuid`): `name, description, chassis, type(boxed|built|preorder),
price_dkk, image_url, available, category, subcategory, stock_qty, status,
item_number, item_no, unbuilt_stock, built_stock, unbuilt_price_dkk,
built_price_dkk, unbuilt_case_price_dkk, built_case_price_dkk,
unbuilt_original_price_dkk, built_original_price_dkk,
unbuilt_case_original_price_dkk, built_case_original_price_dkk,
original_price_dkk, is_collectors_vault`. No `order_items` table exists —
`orders` is denormalized, one product per row (`product_name text`, not a FK to
`products.id`).

**`orders`** (PK `id uuid`): `member_email, member_name, product_name, chassis,
type(boxed|built), quantity, status(pending|reserved|awaiting_stock|
ready_for_pickup|completed|cancelled), notes, payment_status(10-value enum:
awaiting_payment|proof_uploaded|payment_confirmed|rejected|reserved|
awaiting_stock|in_transit|ready_for_pickup|completed|cancelled),
payment_proof_url, payment_reference, qualifies_for_membership, admin_notes,
variant, points_awarded, membership_days_awarded, spend_amount_dkk,
rewards_applied`. Reward math already lives directly on `orders`
(`points_awarded`, `rewards_applied`) — not a ledger.

**`shop_inventory`** — a **singleton row** (`id integer default 1`,
`case_stock`, `case_price_dkk`), not a per-SKU inventory table. Per-SKU stock
actually lives on `products.stock_qty` / `unbuilt_stock` / `built_stock`.

**`admin_config`** (PK `key text`): key/value pairs only (`earlybird_slots`,
`min_races_for_ranking` — confirmed by key name only, values not read since
they are non-secret feature-flag numbers). **The hardcoded admin password is
not stored here or anywhere in the database** — it exists only as a literal
string in 17 client-side `.tsx` files.

**`cars`** (PK `id uuid`): `member_email, member_name, name, chassis, series,
color, image_url, bought_from, status(pending|approved|rejected), notes`. No
Club Car ID / QR fields — this is currently a simple approval queue.

No functions, no triggers, and no `storage.buckets` exist anywhere in this
project (confirmed via `pg_proc`, `information_schema.triggers`,
`storage.buckets` — all empty). All `image_url` fields are plain external
Cloudinary URLs, not Supabase Storage references. `pg_policies` is empty
project-wide — zero RLS policies exist on any table, confirming there is
nothing to accidentally break by *adding* policies, but also nothing currently
enforcing anything.

## 4. RLS condition — CRITICAL, project-wide

**Row Level Security is disabled on all 29 tables, with zero exceptions.**
Supabase's own advisor (`get_advisors`, category `security`) flags every
single one as `ERROR`/`rls_disabled_in_public`, plus one additional
`security_definer_view` finding on `season_standings`. There are zero RLS
policies defined anywhere in the project.

**Practical consequence:** the public anon key — embedded by design in every
visitor's browser — currently has **unrestricted SELECT/INSERT/UPDATE/DELETE
on every row of every table**, including all 7 real `members` rows (email,
phone, `password_hash`), all `orders`, `payment_proofs`, `points_transactions`,
and `admin_config`. This is live today, not a migration-time hypothetical, and
is the single highest-priority finding in this audit — see
`docs/LIVE-SCHEMA-SECURITY-AUDIT.md` §5 and the Phase 0 containment plan in
`docs/PHASED-SUPABASE-MIGRATION-PLAN.md`.

## 5. Concrete, currently-exploitable findings

1. **`members.password_hash` is fetched to the browser today.** Client code at
   `lib/member.ts:73-80` (`getMemberDataFromSupabase`), `lib/loyalty.ts:47,103`,
   `app/orders/page.tsx:86`, and `app/admin/members/page.tsx:86` all call
   `.from('members').select('*')`. Combined with RLS being off, this means (a)
   the app itself ships every member's `password_hash` to the browser on
   ordinary page loads, and (b) anyone can also just call the REST API
   directly with the public anon key and run the equivalent of
   `select * from members` to get the same data for all 7 members, with no
   password or session required at all.
2. **Admin password protects nothing at the data layer.** `mini4wd2026` is a
   plaintext literal in 17 client `.tsx` files (confirmed pattern: it will be
   inlined into the shipped JS bundle exactly like the Supabase URL/key were).
   `middleware.ts` explicitly exempts `/admin/*` from any check. Even a
   correctly-entered password only unlocks a UI — the underlying
   products/orders/members writes it performs are already possible without it,
   via a direct REST call, because RLS is off.
3. **No admin/staff role model exists at the database level at all** — no
   `admin_users` table, no `role` column anywhere. Registration Staff,
   Check-In Staff, Shop Staff, Race Marshal, Viewer: none of these exist today.
4. **`app/orders/page.tsx:86` fetches the entire `members` table** (`select('*')
   .order('created_at')`, no `.eq()` filter) from what is nominally a
   member-facing "my orders" page — independent of the RLS problem, this is a
   query-design issue worth revisiting once RLS makes it fail loudly instead
   of silently.

## 6. Root causes — disappearing catalog / broken images

- **Catalog:** `lib/supabase.ts` builds the client from
  `process.env.NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  falling back to a `null` client with only a `console.warn` if either is
  missing — no thrown error, no consistent fallback UI across callers. Some
  homepage sections have hardcoded fallback arrays shown only on an empty
  result (e.g. the shop-preview section: `e.length>0?e:R`); others do not, so
  the actual failure mode differs page to page. **Not directly confirmed**:
  whether Vercel's Preview environment has `NEXT_PUBLIC_SUPABASE_URL`/
  `ANON_KEY` scoped the same as Production — every attempt to fetch a Preview
  deployment's JS bundle was blocked by genuine Vercel Deployment Protection
  (SSO redirect). Needs a manual dashboard check: Project → Settings →
  Environment Variables → confirm both vars are checked for "Preview", not
  only "Production".
- **Images:** `products.image_url` is a comma-separated list of Cloudinary
  URLs, with client-side regex "repair" logic for at least two known-bad URL
  shapes (`res-console.cloudinary.com/.../thumbnails/...` and a base64-encoded
  "drilldown" URL variant) — meaning malformed URLs are already known to exist
  in this column and are being patched over in the render path rather than at
  the data layer.

See `docs/PHASED-SUPABASE-MIGRATION-PLAN.md` for the full remediation plan and
`docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md` for backup/verification
procedure before any phase is applied.
