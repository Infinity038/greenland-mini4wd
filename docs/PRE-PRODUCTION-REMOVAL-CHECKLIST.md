# Pre-Production Removal Checklist

Routes and tools that were added for Preview-only testing and **must be
removed or disabled before this branch is approved for a production
merge**. None of these are linked from any public or admin navigation menu
— they are only reachable by typing the URL directly — but they must not
ship to production regardless.

## 1. `/admin/qr-test-sheet`

- **File**: `app/admin/qr-test-sheet/page.tsx`
- **Purpose**: printable sheet of one QR code per mock record type (Product,
  Service, Racer, Car, Event, Redemption — valid/expired, Invalid/Unknown),
  used to physically test the camera scanner.
- **Why it must be removed**: labeled "PREVIEW TEST DATA — NOT VALID FOR
  LIVE USE" and has no environment gate of its own — it renders in any
  environment, including a production build, if left in place.
- **Removal**: delete `app/admin/qr-test-sheet/` (page + test file) or add
  the same `process.env.VERCEL_ENV === "preview"` gate used by
  `/admin/pos-camera-test` before merging.

## 2. `/admin/pos-camera-test`

- **Files**: `app/admin/pos-camera-test/page.tsx`,
  `app/admin/pos-camera-test/PosCameraTestClient.tsx`
- **Purpose**: Preview-only diagnostic tool for verifying the shared QR
  camera scanner (native `BarcodeDetector` + `jsQR` fallback) on real
  iOS/Android/desktop hardware.
- **Existing safeguard**: the page is a Server Component that checks
  `process.env.VERCEL_ENV === "preview"` and calls `notFound()` otherwise,
  so it already 404s in a production build. This entry exists as a second,
  explicit checkpoint — do not rely on the env check alone as the only
  review gate.
- **Removal**: delete `app/admin/pos-camera-test/` (both files + their
  tests) once physical-device verification is complete and no longer
  needed.

## 3. `/admin/pricing`

- **Files**: `app/admin/pricing/page.tsx`, `app/admin/pricing/PricingAdminClient.tsx`
- **Purpose**: Preview-only pricing/campaign engine admin UI (campaign
  creation, activation, and the required pre-activation preview) — see
  `docs/PRICING-ADMIN-PERMISSIONS.md`.
- **Existing safeguard**: same Server Component `VERCEL_ENV === "preview"` +
  `notFound()` pattern as `/admin/pos-camera-test`. Operates entirely on the
  in-memory demo catalog (`lib/pricing/previewDemoCatalog.ts`) and an
  in-memory audit log — zero Supabase reads/writes.
- **Removal**: do NOT delete this route once Supabase Auth/staff
  roles/RLS (`docs/PHASED-SUPABASE-MIGRATION-PLAN.md`) are live — instead
  replace the mock role selector with a real session check and the
  in-memory campaign/audit stores with real Supabase-backed reads/writes
  behind the `SALE_CAMPAIGNS_ENABLED` flag. Only delete outright if the
  pricing/campaign feature itself is abandoned.

## 4. `/admin/catalog-status`

- **Files**: `app/admin/catalog-status/page.tsx`,
  `app/admin/catalog-status/CatalogStatusClient.tsx`
- **Purpose**: Preview-only admin catalog-status / restock view (product,
  SKU, category, chassis, tier, public state, stock, pricing status,
  restock-interest count, suggested reorder qty, missing-data reason) — see
  `docs/CATALOG-COSTING-AND-FREIGHT.md` §"Admin catalog-status view".
- **Existing safeguard**: same Server Component `VERCEL_ENV === "preview"` +
  `notFound()` pattern as `/admin/pos-camera-test` and `/admin/pricing`. It
  reads the real curated catalog (static/bundled, no Supabase dependency)
  plus the in-memory `restockInterestStore` — zero Supabase reads/writes,
  and it never places a supplier order automatically.
- **Removal**: do NOT delete this route once Supabase Auth/staff
  roles/RLS are live — instead add a real session/role check in front of it.
  The catalog read itself can stay static; only the restock-interest store
  needs to move to a real Supabase-backed table. Only delete outright if the
  catalog/restock feature itself is abandoned.

## Verification before merge

- [ ] `app/admin/qr-test-sheet/` removed or gated to Preview only
- [ ] `app/admin/pos-camera-test/` removed
- [ ] `app/admin/pricing/` removed, or migrated to real Auth/RLS-backed data
      (see item 3 above — this one is not necessarily a deletion)
- [ ] `app/admin/catalog-status/` removed, or migrated to real Auth/RLS-backed
      data (see item 4 above — this one is not necessarily a deletion)
- [ ] `grep -r "qr-test-sheet\|pos-camera-test"` across `app/`, `components/`
      returns no remaining references
- [ ] Full test suite still passes after removal
- [ ] Production build succeeds with both routes absent

## Also still pending (unrelated to the above, tracked separately)

- Hardcoded admin password (`mini4wd2026` in `app/admin/*`) must be replaced
  with Supabase Auth + RLS before production — see
  `docs/PROPOSED-admin-auth-plan.md`.
- No POS/QR/racer-identity feature in this branch has been wired to a live
  Supabase table yet; all of it (stock, points, receipts, redemption
  tokens, car/event registries) remains mock/in-memory pending schema, auth
  and RLS review.
