# Greenland Mini 4WD — Claude Code Implementation Brief

## Mission

Refactor the existing Next.js/Supabase website into a stable, beginner-first Mini 4WD storefront focused only on:

1. Choosing a first car
2. Box Stock learning and racing
3. First bolt-on upgrades
4. B-MAX builds

Open Tournament/Open Class must remain disabled for now. Preserve historical database records and source pages, but remove the feature from public navigation, calls to action, registration and ticket purchase flows.

## Non-negotiable safety rules

- Work on a new branch. Do not edit production directly.
- Inspect the live Supabase schema and RLS policies before applying migrations.
- Never delete existing products, orders, members, images or race history.
- Never expose service-role keys to the browser.
- Do not overwrite existing prices, stock or approved images during catalog import.
- Run tests, lint, type-check and production build before presenting a PR.
- Provide a rollback migration and deployment rollback instructions.

## Critical findings to fix first

### P0 — Client-side admin credential

The current admin credential is hardcoded in browser JavaScript across numerous admin pages and sessions are simulated with `localStorage`. This is not authentication.

Required replacement:

- Use Supabase Auth for admin sign-in.
- Create an `admin_users` or role/profile table tied to `auth.users.id`.
- Protect `/admin/**` through middleware/server checks.
- Enforce RLS so only authenticated admins may insert/update/delete products, orders, inventory and media.
- Remove every hardcoded credential and every `adminSession` localStorage check.
- Rotate the old credential after the secure system is deployed.
- Public visitors must retain read-only access only to published catalog records.

### P0 — Products disappear on database errors

Current code frequently does `setProducts(data || [])` without handling `error`. A network, RLS or Supabase failure is rendered as an empty shop.

Required behavior:

- Keep the last successfully loaded public catalog in `localStorage` or IndexedDB with schema version and timestamp.
- Render cached data immediately, then refresh in the background.
- On refresh failure, retain cached/current products and show a visible non-blocking banner: “The catalog could not refresh. Showing the latest saved version.”
- Include Retry.
- Only display a real empty state after a successful query returns zero published products.
- Log structured errors without leaking keys or private information.
- Apply the same pattern to the homepage shop preview and any member product suggestions.

### P0 — Stock is deducted before payment confirmation

Current checkout decrements car, part and case stock immediately after creating an unpaid order.

Required behavior:

- Order creation must not change stock.
- Save `product_id`, `inventory_bucket` (`unbuilt`, `built`, `standard`) and `requires_case` on the order.
- When an admin moves an order into the first paid status, call the idempotent `reserve_order_inventory` RPC.
- When an inventory-reserved order is cancelled, call `release_order_inventory`.
- Surface insufficient-stock errors clearly and do not mark payment confirmed when reservation fails.
- Keep reward awarding/clawback idempotent and coordinated with inventory state.
- Refresh product availability after each successful reservation or release.

Use `supabase/20260715_bmax_catalog_and_inventory.sql` as a reviewed starting point, not as an unquestioned production migration.

## Curated starter catalog

Source files:

- `app/data/bmaxCatalog.ts`
- `catalog/bmax-initial-catalog.json`
- `catalog/bmax-initial-catalog.csv`

Catalog composition:

- 86 total products
- 20 cars
- 66 parts
- 50 Core Stock
- 28 Expansion Stock
- 8 Special Order/Collector

Every catalog item is intentionally a draft:

- `published = false`
- price fields = 0
- stock fields = 0
- `status = coming soon`
- `image_url = ''`
- `image_status = needs approved upload`

Do not expose imported items publicly until an admin explicitly publishes them.

### Importer requirements

Add a new Catalog Import panel to `/admin/products`:

- Preview counts by Core, Expansion and Special Order.
- Checkboxes to select tiers.
- Dry-run mode that shows New, Existing, Unchanged and Conflicted counts.
- Import/merge by normalized `item_no`.
- Never create duplicates for the same item number.
- For existing products:
  - Preserve all prices.
  - Preserve all stock.
  - Preserve existing approved images.
  - Preserve published state.
  - Fill only missing catalog metadata unless the admin explicitly chooses “Replace metadata.”
- For new products:
  - Insert as unpublished drafts with zero price/stock and no image.
- Return per-item errors, not a generic failure.
- Make import idempotent; repeating it must create zero duplicates.

### Publish readiness gate

A product may be published only when:

- unique item number exists
- name and category exist
- chassis/compatibility are set
- beginner stage is set
- at least one valid approved image exists
- valid price exists
- status is selected
- stock is non-negative
- cars have at least one valid sellable variant price

Show missing requirements directly in the admin product card.

## Product image system

Do not hotlink official Tamiya images as the permanent storefront source.

Required system:

- Create a Supabase Storage bucket named `product-images` or use the project’s approved media provider.
- Admin supports drag-and-drop upload, progress, preview, reordering and removal.
- Store permanent owned/authorized URLs in `products.image_url` or preferably a normalized `product_images` table.
- Validate file type, dimensions and size.
- Generate optimized sizes for card and detail views.
- Provide a durable fallback card showing:
  - product category icon
  - item number
  - chassis
  - “Image being prepared”
- Never hide a product merely because an image failed.
- Add an admin Broken Image report with Retry, Replace and Mark Pending actions.
- Keep `source_url` as a research/reference link visible only to admins.

## Beginner-first public shop

### Information architecture

Public navigation should emphasize:

- Start Here
- Cars
- Upgrade Parts
- Learn
- Box Stock
- B-MAX
- My Orders / Profile

Open Tournament/Tickets must be hidden while the feature flag is false.

Use one environment-backed feature flag:

```text
NEXT_PUBLIC_OPEN_TOURNAMENT_ENABLED=false
```

Centralize feature flags in one module. Do not scatter conditional constants across pages.

### Shop journey

At the top of the shop, show a simple three-step path:

1. **Choose Your Car** — start with a complete kit.
2. **Race Box Stock** — learn assembly, batteries, motor care and track control.
3. **Upgrade to B-MAX** — add legal bolt-on parts without cutting the chassis.

### Filters

- Stage: First Car, Box Stock, First Upgrade, Control, Speed, Competitive B-MAX, Special Order
- Chassis: FM-A, VZ, AR, MA, MS, Super-II, Super X/XX, Universal
- Product type
- Purpose: speed, acceleration, braking, stability, cornering, durability, maintenance
- Motor type: Single-shaft, PRO dual-shaft, Not applicable
- Availability
- Price range

### Product cards

Each card must answer beginner questions without opening the detail page:

- What is it?
- What does it improve?
- Which chassis does it fit?
- Is it beginner friendly?
- Is it B-MAX approved?
- Does it require another part?
- Is it in stock, preorder or special order?

Badges:

- Beginner Pick
- First Upgrade
- B-MAX Approved
- Chassis badge
- Single-Shaft / PRO
- Core / Expansion / Special Order

### Product detail

Include:

- plain-language description
- benefits and trade-offs
- compatibility
- difficulty
- installation notes
- recommended companion parts
- “Do not buy this if…” warning when relevant
- exact item number
- image gallery with fallback
- stock and variant status

Do not claim universal compatibility without verified data.

## Beginner bundles

Create bundle definitions but do not publish automatically:

- First Upgrade — VZ
- First Upgrade — FM-A
- First Upgrade — AR
- First Upgrade — MA
- Control Pack
- Speed Pack
- MA/MS PRO Pack

Bundles must validate chassis compatibility. They may be represented as curated groups initially rather than inventory-composed SKUs.

## Catalog query rules

Public queries must include `published = true`.

Public sorting:

1. recommended
2. catalog tier (`core`, then `expansion`, then `special_order`)
3. catalog order
4. name

Special-order products must be visually separated from stocked items and must never imply immediate local availability.

## Code quality

The project currently relies heavily on `// @ts-nocheck` and has a large lint backlog.

Required approach:

- Do not attempt an unsafe whole-site rewrite in one PR.
- Remove `@ts-nocheck` from files touched by this implementation.
- Define shared types for Product, Order, CatalogImportResult and InventoryBucket.
- Extract Supabase operations into typed service modules.
- Add a shared error state and reusable resilient-query hook.
- Replace broad `any` in touched code.
- Keep visuals consistent with the existing Arctic dark/red/yellow identity.

## Tests and acceptance criteria

Add tests or deterministic validation for these cases:

1. Supabase request fails while cached products exist → cached catalog remains visible and warning appears.
2. Successful empty query → genuine empty-state copy appears.
3. Broken image → product card remains visible with branded fallback.
4. Repeated catalog import → zero duplicates.
5. Existing item import → price, stock and approved image remain unchanged.
6. Unpublished draft → absent from public shop.
7. Unpaid order → no stock changes.
8. First paid transition → stock decreases exactly once.
9. Repeated paid-status save → no second deduction.
10. Cancel reserved order → stock returns exactly once.
11. Insufficient stock → payment confirmation fails visibly.
12. Open Tournament flag false → no public tournament/ticket links and direct public routes redirect to the learning page or show a postponed notice.
13. Non-admin user → cannot mutate product/order/inventory records through Supabase directly.
14. Mobile widths 320px, 375px and 430px → no horizontal overflow and filters remain usable.

Required commands before PR:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Document any pre-existing lint failures separately; introduce no new warnings or errors in touched files.

## Deliverables

1. Schema/RLS migration and rollback.
2. Secure admin authentication.
3. Catalog importer with dry-run and idempotent merge.
4. Durable image upload/fallback system.
5. Resilient public catalog loading.
6. Payment-confirmed inventory reservation.
7. Beginner-first shop and product details.
8. Open Tournament feature flag disabled.
9. Tests and validation evidence.
10. PR summary containing screenshots, schema notes, risks and rollback procedure.

## Stop conditions

Stop and report rather than guessing when:

- the live schema differs materially from assumptions
- RLS prevents a safe implementation
- an existing product has duplicate item numbers
- inventory counts cannot be mapped reliably to variants
- a migration would discard or rewrite existing data
