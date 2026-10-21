# Production release runbook — members security (release candidate `release-candidate/members-security-2026-10-21`)
STATUS: PREPARED, NOT EXECUTED. Every step needs Ace's separate approval. Production project: Supabase `greenland-mini4wd` (eojdjqihmxxaqltudqjx) + Vercel `greenland-mini4wd`. Current production deployment before the release: `dpl_pDMc2YRw7tM8aDfSa7yo3bYZveaH` (main 24b6783).

## What the release contains
Application (security-only, no Prediction Pit / MCL / Mini4WD game code): legacy member login and registration through database functions (no password hash to the browser, no email enumeration), HttpOnly member session cookie with scoped self-view, Turnstile on registration / login / shop inquiry / sign-in / admin login, staff-session admin reads and server-authorised admin writes (`/api/admin/*`), retirement of the legacy `/orders` page (its password was published in the repository history), secure email sign-in returning to the requested admin page.
Database (additive first, restrictive last): `supabase/release/P1_*.sql` then `P4_*.sql`; rollback `ROLLBACK_all.sql`.
Verified so far: UI 280/280, catalog 68/68, `tsc` clean, `next build` succeeds, local rehearsals (members 105/105 production-shaped, owner bootstrap 22/22), preview deployment of the same code plus its Prediction Pit extras with live synthetic tests. NOT yet verified: restore rehearsal against the real backup (see RESTORE_REHEARSAL plan), the six other admin pages against real production tables.

## Preconditions (all must be true before P1)
1. Fresh Supabase backup taken immediately before the window, checksum recorded; the 2026-10-20 verified backup untouched.
2. Owner present; low-traffic time; announce a 60-minute maintenance notice (no downtime expected).
3. Vercel PRODUCTION env (names only): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_REQUIRED=true`; do NOT set `RATE_LIMIT_STORE` (production defaults to `db`). No service-role key anywhere.
4. Turnstile widget hostname includes the production domain. Supabase Auth CAPTCHA stays OFF until after P3.
5. Production owner bootstrap path confirmed: the owner auth user exists, is email-confirmed and has a password; `staff_roles` is empty (audited 2026-10-21).
6. Restore rehearsal passed on the real backup copy (owner-decrypted, disposable local database).

## P1 — additive SQL (Supabase SQL editor, project eojdjq..., ONE file at a time, each file is wrapped in begin/commit)
Order: `P1_01_club_rate_limit.sql` -> `P1_02_register.sql` -> `P1_03_login_initial.sql` -> `P1_04_login_sessions.sql` -> `P1_05_member_view.sql`. Stop on the first error. These add new objects only; the live site keeps working unchanged.
Checks after P1 (read-only): `select proname from pg_proc where pronamespace='public'::regnamespace and proname like 'club\_%' or proname='rate_limit_hit' order by 1;` must list `club_member_login, club_member_logout, club_member_status, club_member_view, club_register_member, rate_limit_hit`; `select count(*) from public.members;` still 7; anon cannot read `club_member_sessions` (`curl "$API/rest/v1/club_member_sessions?select=*" -H "apikey: $KEY"` -> 401).

## P2 — application release
1. Open the release PR from `release-candidate/members-security-2026-10-21` into `main` (fast-forwardable from main 24b6783 after review; do NOT merge draft PRs #14/#17/#18).
2. Merge on approval; Vercel builds main. Wait for READY.
3. Smoke (no data written): home, shop, `/register` (widget visible), `/profile` redirect behaviour, `/admin` redirects to the secure email sign-in, `/orders` redirects to `/admin/orders`.

## P3 — verification of P2 in production (owner supervised; ONE synthetic member `release.check@example.invalid`, deleted at the end by the owner)
1. Register -> same `{"ok":true}` for a duplicate; login -> member returned, no `password_hash`; wrong password and unknown email give the same 401; scoped view works; logout.
2. Owner signs in (email code or password), opens `/admin`: if the role is missing, open `/admin/setup` once (bootstrap grants the admin role only to the confirmed owner address while `staff_roles` is empty). Confirm `select role, count(*) from public.staff_roles group by 1;` shows `admin 1`.
3. Admin pages load their data: members, loyalty, hall of fame, orders (members tab), race results, tickets, seasons. Write one harmless change per kind and confirm via `/api/admin/write` (e.g. confirm a test ticket) — nothing on real members.
4. Existing members: the 7 real members can still log in (one at a time, owner choice) or re-login later; the member without a password hash still cannot (unchanged).
STOP if any step fails; P1 objects are harmless and can stay.

## P4 — database restriction (only after P3 passes; separate approval)
1. `P4_01_r3_privileges.sql`; verify the app still works (register, login, view, admin lists) and that anonymous DELETE/PATCH on members returns 401.
2. `P4_02_r4_r5_lockdown.sql` (R4+R5 in ONE transaction). Immediately run the checklist below.
Downtime: none planned (metadata-only changes on a 72 kB table; lock held for milliseconds).

## Post-lockdown verification checklist
1. Anonymous Data API (`$API/rest/v1/...`, public key): `members?select=*`, `select=password_hash`, `select=email&email=eq.<registered>`, count, POST insert, PATCH, DELETE: all 401/42501. `club_member_sessions`, `rate_limit_counters`, `staff_roles`: denied. `rpc/prediction_pit_admin_roster`, `rpc/current_member_id`: denied. `rpc/club_register_member` for a known and an unknown address: identical `{"status": "accepted"}`; `rpc/club_member_login` wrong password for known/unknown: identical `{"ok": false}`.
2. App: register + duplicate, login, scoped views, logout, expired session, shop/tickets/tournament/profile.
3. Staff: owner admin login, member list, loyalty, hall of fame, orders, race results, tickets, seasons.
4. Integrity: `select count(*) from public.members;` = 7 (+ any real registration since), orders/race_tickets/loyalty_points/payment_proofs counts equal the pre-window values.
5. Monitoring for 24 h: auth logs, PostgREST 401/403 spikes, registration/login failures, Vercel runtime errors.

## Known limits after the release (be explicit)
All 29 other public tables stay anonymously readable/writable until the separate R6 project; `season_standings` view; the `club_*` functions and `rate_limit_hit` are callable with the public key; Supabase Auth CAPTCHA off until the widget build is confirmed live; the legacy password login still exists; GitHub token revocation must be confirmed by the owner.
