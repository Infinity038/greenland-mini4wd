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

## Verification before merge

- [ ] `app/admin/qr-test-sheet/` removed or gated to Preview only
- [ ] `app/admin/pos-camera-test/` removed
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
