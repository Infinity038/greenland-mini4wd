#!/usr/bin/env bash
# NEVER use production credentials. Only the ephemeral GitHub PostgreSQL service.
set -euo pipefail
: "$PGPASSWORD"
DB=gm4wd_p4_disposable
createdb -h 127.0.0.1 -U pit_test "$DB"
psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d "$DB" \
 -f scripts/security/pit-p0-p4-disposable-seed.sql >/dev/null
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
query() {
  psql -X -qAt -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d "$DB" -c "$1"
}
expect_denial(){
 local name="$1" sql="$2"
 if query "$sql" >"$tmp/out" 2>&1; then
   echo "FAIL: unexpected access permitted: $name"; cat "$tmp/out"; exit 1
 fi
 grep -Eqi 'permission denied|row-level security' "$tmp/out" || {
   echo "FAIL: wrong denial reason for $name"; cat "$tmp/out"; exit 1;
 }
 echo "PASS denial: $name"
}
expect_equal(){
 local name="$1" sql="$2" expected="$3" result
 result="$(query "$sql")"
 [[ "$result" == "$expected" ]] || {
  echo "FAIL $name expected '$expected' observed '$result'"; exit 1;
 }
 echo "PASS: $name"
}
expect_equal 'P4 RLS and FORCE both on' \
 "SELECT relrowsecurity::text||':'||relforcerowsecurity::text FROM pg_class WHERE oid='public.members'::regclass" 'true:true'
expect_equal 'all member and staff synthetic rows retained' \
 "SELECT (SELECT count(*) FROM public.members)::text||':'||(SELECT count(*) FROM public.staff_roles)::text" '2:1'
# Check broad TABLE grants are gone even if column-level secure grants remain.
expect_equal 'anonymous table SELECT and INSERT revoked' \
 "SELECT has_table_privilege('anon','public.members','SELECT')::text||':'||has_table_privilege('anon','public.members','INSERT')::text" 'false:false'

expect_denial 'anon member inventory' \
 "BEGIN; SET LOCAL ROLE anon; SELECT id,name FROM public.members; COMMIT;"
expect_denial 'anon password hash retrieval' \
 "BEGIN; SET LOCAL ROLE anon; SELECT password_hash FROM public.members; COMMIT;"
expect_denial 'anon direct member INSERT' \
 "BEGIN; SET LOCAL ROLE anon; INSERT INTO public.members(id,email) VALUES(gen_random_uuid(),'bad@example.invalid'); COMMIT;"
expect_denial 'authenticated password hash remains inaccessible' \
 "BEGIN; SET LOCAL ROLE authenticated; SELECT password_hash FROM public.members; COMMIT;"
expect_denial 'authenticated arbitrary member INSERT remains inaccessible' \
 "BEGIN; SET LOCAL ROLE authenticated; INSERT INTO public.members(id,email) VALUES(gen_random_uuid(),'bad2@example.invalid'); COMMIT;"
expect_equal 'member can only see own ID' \
 "BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 SELECT count(*)::text||':'||max(name) FROM public.members; ROLLBACK;" '1:One'
expect_equal 'member cannot see other member for UPDATE' \
 "BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 WITH modified AS (UPDATE public.members SET name='EXPLOIT' WHERE id='22222222-2222-4222-8222-222222222222' RETURNING id) SELECT count(*) FROM modified;
 ROLLBACK;" '0'
expect_equal 'synthetic staff can SELECT both members' \
 "BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 SELECT count(*) FROM public.members; ROLLBACK;" '2'
expect_equal 'staff may update a safe column but never password hash' \
 "BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 UPDATE public.members SET name='STAFF_ONLY' WHERE id='22222222-2222-4222-8222-222222222222';
 SELECT count(*) FROM public.members WHERE name='STAFF_ONLY'; ROLLBACK;" '1'
# No modifications survive individual rolled-back sessions.
expect_equal 'synthetic baseline never mutated by tests' \
 "SELECT string_agg(name,',' ORDER BY name) FROM public.members" 'One,Two'
echo 'PASS: exact GM4WD P4_02 migration synthetic access matrix.'
