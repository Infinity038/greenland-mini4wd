#!/usr/bin/env bash
# No hosted service; only disposable PostgreSQL with synthetic member IDs.
set -euo pipefail
: "$PGPASSWORD"
createdb -h 127.0.0.1 -U pit_test gm4wd_pit_approvals_ci
psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d gm4wd_pit_approvals_ci \
  -f scripts/pit-p0/gm4wd-pit-approval-disposable-seed.sql >/dev/null
call() { psql -X -qAt -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d gm4wd_pit_approvals_ci -c "$1"; }
expect(){
 local label="$1" sql="$2" desired="$3" actual
 actual="$(call "$sql")"
 [[ "$actual" == "$desired" ]] || { echo "FAIL $label; expected '$desired' got '$actual'"; exit 1; }
 echo "PASS: $label"
}
expect_denial(){
 local label="$1" sql="$2" log
 if log="$(call "$sql" 2>&1)"; then
  echo "FAIL $label unexpectedly authorized"; exit 1
 fi
 echo "$log" | grep -Eqi 'permission denied|Owner approval required' || {
  echo "FAIL unexpected error ($label): $log"; exit 1
 }
 echo "PASS: denied $label"
}
owner="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
member="11111111-1111-4111-8111-111111111111"
expect 'no grant exists before explicit owner approval' \
 "SET ROLE anon; SELECT public.pit_member_handoff_authorized(repeat('b',64))->>'allowed'; RESET ROLE;" 'false'
expect 'unapproved second club member denied despite valid cookie session' \
 "SET ROLE anon; SELECT public.pit_member_handoff_authorized(repeat('c',64))->>'allowed'; RESET ROLE;" 'false'
expect_denial 'unauthorized user cannot approve via protected procedure' \
 "BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 SELECT public.pit_owner_set_member_access('$member',true,true); COMMIT;"
expect_denial 'anonymous user cannot create owner approval' \
 "SET ROLE anon; SELECT public.pit_owner_set_member_access('$member',true,true);"
expect_denial 'anonymous user cannot read approval inventory' \
 "SET ROLE anon; SELECT * FROM public.prediction_pit_access;"
expect 'owner 18+ verified approval succeeds' \
 "BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='$owner';
 SELECT public.pit_owner_set_member_access('$member',true,true); ROLLBACK;" 't'
# Previous transaction rolled back, and must not have provisioned anything.
expect 'rolled-back owner approval did not persist' \
 "SET ROLE anon; SELECT public.pit_member_handoff_authorized(repeat('b',64))->>'allowed'; RESET ROLE;" 'false'
# Commit real synthetic owner action. This is CI memory only, not a real member.
expect 'owner persists approved and verified 18+ access' \
 "BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='$owner';
 SELECT public.pit_owner_set_member_access('$member',true,true); COMMIT;" 't'
expect 'active approved club cookie permits issuing a short-lived token' \
 "SET ROLE anon; SELECT public.pit_member_handoff_authorized(repeat('b',64))->>'member_id'; RESET ROLE;" "$member"
expect 'expired club session fails closed' \
 "SET ROLE anon; SELECT public.pit_member_handoff_authorized(repeat('d',64))->>'allowed'; RESET ROLE;" 'false'
expect 'invalid token format fails closed' \
 "SET ROLE anon; SELECT public.pit_member_handoff_authorized('token')->>'allowed'; RESET ROLE;" 'false'
expect 'valid session without owner-approved membership denied' \
 "SET ROLE anon; SELECT public.pit_member_handoff_authorized(repeat('c',64))->>'allowed'; RESET ROLE;" 'false'
# Revocation blocks existing sessions without touching logged-in user session rows.
expect 'owner revokes instantly' \
 "BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='$owner';
 SELECT public.pit_owner_set_member_access('$member',false,true); COMMIT;" 't'
expect 'revoked approval makes same cookie invalid for Pit' \
 "SET ROLE anon; SELECT public.pit_member_handoff_authorized(repeat('b',64))->>'allowed'; RESET ROLE;" 'false'
expect 'revoking does not delete prior club sessions' \
 "SELECT count(*) FROM public.club_member_sessions" '3'
expect 'club member rows unchanged by owner approvals' \
 "SELECT count(*) FROM public.members" '2'
echo 'PASS: default-deny, 18+, owner-only membership, expiry, immediate revocation tested.'
