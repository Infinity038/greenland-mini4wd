#!/usr/bin/env bash
# LOCAL, DISPOSABLE rehearsal of the members remediation (R1a, R1b, R1c, R3, R4, R5, rollback). Synthetic data only.
# Starts a throwaway Postgres container (tmpfs, no volume), never touches any hosted database, removes the container at the end.
#   bash tests/pp/rehearse_members.sh
set -uo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
IMG=${PP_IMG:-public.ecr.aws/supabase/postgres:17.11.0.004}
R=$ROOT/supabase/members-remediation
LOG=$ROOT/.checkpoints/members_rehearsal.log; mkdir -p "$ROOT/.checkpoints"; exec > >(tee "$LOG") 2>&1
# shellcheck disable=SC1091
source "$ROOT/tests/pp/fixtures/bcrypt_vectors.sh"
C=pp-members-rehearsal-$$
trap 'docker rm -f $C >/dev/null 2>&1' EXIT
PASSN=0; FAILN=0
pass() { echo "PASS  $*"; PASSN=$((PASSN+1)); }; fail() { echo "FAIL  $*"; FAILN=$((FAILN+1)); }
echo "MEMBERS REMEDIATION REHEARSAL (local, synthetic) $(date -u +%FT%TZ) image=$IMG"
docker run -d --name $C -e POSTGRES_PASSWORD=rehearsal --tmpfs /var/lib/postgresql/data:rw,mode=1777 "$IMG" >/dev/null || { echo "cannot start container"; exit 1; }
for _ in $(seq 1 60); do docker exec $C pg_isready -q -U supabase_admin 2>/dev/null && break; sleep 2; done; sleep 4
su() { docker exec -i $C psql -X -qAt -v ON_ERROR_STOP=1 -U supabase_admin -d postgres "$@"; }
sf() { docker exec -i $C psql -X -qAt -v ON_ERROR_STOP=1 -U supabase_admin -d postgres < "$1"; }
ADMIN=00000000-0000-0000-0000-0000000000a1; ALICE=00000000-0000-0000-0000-0000000000b1; BOB=00000000-0000-0000-0000-0000000000b2; DAVE=00000000-0000-0000-0000-0000000000b4
# as <role> <uid|-> "<sql>": emulate a PostgREST request (role + JWT subject). Sets OUT and RC.
as() { local role=$1 uid=$2 sql=$3; local pre="begin; set local role $role;"
  [ "$uid" != "-" ] && pre="$pre do \$\$ begin perform set_config('request.jwt.claim.sub','$uid',true); perform set_config('request.jwt.claims', json_build_object('sub','$uid','role','$role')::text, true); end \$\$;"
  OUT=$(docker exec -i $C psql -X -qAt -v ON_ERROR_STOP=1 -U supabase_admin -d postgres -c "$pre $sql; commit;" 2>&1); RC=$?; }
ok()   { local n=$1; [ $RC -eq 0 ] && pass "$n" || fail "$n -> $OUT"; }
deny() { local n=$1 pat=${2:-permission denied}; if [ $RC -ne 0 ] && echo "$OUT" | grep -qiE "$pat"; then pass "$n"; else fail "$n (rc=$RC out=$OUT)"; fi; }
eq()   { local n=$1 want=$2; if [ $RC -eq 0 ] && [ "$(echo "$OUT" | tail -1)" = "$want" ]; then pass "$n"; else fail "$n (want '$want' got rc=$RC '$OUT')"; fi; }

echo; echo "== SETUP: production-like baseline (real 27-column members, RLS off, anon/authenticated hold everything)"
su -c "create extension if not exists pgcrypto with schema extensions;" >/dev/null 2>&1
if [ "${PP_PREVIEW_STUB:-0}" = "1" ]; then
  echo "(preview-stub mode: 10-column stub as in prediction-pit-preview, then 00_preview_align_members.sql)"
  su -c "create table public.members (id uuid primary key default gen_random_uuid(), name text, first_name text, last_name text, email text not null unique, password_hash text, auth_user_id uuid, loyalty_tier text default 'member', member_status text default 'registered', created_at timestamptz default now()); create unique index members_auth_user_id_key on public.members (auth_user_id) where auth_user_id is not null; grant all on public.members to anon, authenticated;" >/dev/null && sf "$R/00_preview_align_members.sql" >/dev/null 2>&1 && pass "preview stub aligned by 00_preview_align_members.sql" || fail "stub alignment"
fi
su -c "
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(), first_name text, last_name text, email text not null unique, phone text, nationality text, city text,
  experience text, created_at timestamptz default now(), password_hash text,
  member_status text default 'registered' check (member_status = any (array['guest','registered','official'])),
  referral_code text unique, referred_by text, rank text default 'Rookie', total_points integer default 0, favorite_chassis text,
  is_active_member boolean default false, membership_expires_at date, loyalty_tier text default 'non_member', points_rate numeric default 0,
  loyalty_progress integer default 0, loyalty_needed integer default 10, weekly_loyalty_progress integer default 0, season_loyalty_progress integer default 0,
  name text, lifetime_spending numeric not null default 0, avatar_url text, auth_user_id uuid references auth.users(id));
grant all on public.members to anon, authenticated;
insert into auth.users(id,email) values ('$ADMIN','admin@example.invalid'),('$ALICE','alice@example.invalid'),('$BOB','bob@example.invalid'),('$DAVE','dave@example.invalid');
insert into public.members(name,email,password_hash,auth_user_id) values
 ('Alice','alice@example.invalid','$H2B','$ALICE'),('Bob','bob@example.invalid','$H2A','$BOB'),('Carol','carol@example.invalid','$H2B',null);" && pass "baseline created (hashes are bcryptjs vectors, \$2b\$ and \$2a\$)" || fail "baseline"
sf "$ROOT/supabase/migrations/20260719_auth_phase2_staff_roles.sql" >/dev/null 2>&1 && pass "staff roles migration applied" || fail "staff roles migration"
su -c "insert into public.staff_roles(user_id, role) values ('$ADMIN','admin')" >/dev/null && pass "synthetic operator created" || fail "operator"
sf "$ROOT/supabase/dev-only/club_rate_limit.sql" >/dev/null 2>&1 && pass "rate limiter applied (dependency of R1b)" || fail "rate limiter"
PRE=$(su -c "select md5(string_agg(m::text, '|' order by id)) from public.members m")

echo; echo "== T0. The audited exposure is reproduced on the baseline"
as anon - "select password_hash from public.members where email='alice@example.invalid'"; [ "$OUT" = "$H2B" ] && pass "anon reads a password hash on the baseline" || fail "baseline exposure not reproduced"
as anon - "update public.members set name='x' where email='carol@example.invalid'"; ok "anon can UPDATE a member on the baseline (exposure reproduced)"
su -c "update public.members set name='Carol' where email='carol@example.invalid'" >/dev/null

echo; echo "== T1. REVIEW POINT: is a column-level REVOKE alone effective?  (expected: NO)"
su -c "revoke select (password_hash) on public.members from anon" >/dev/null
as anon - "select password_hash from public.members where email='alice@example.invalid'"
[ "$OUT" = "$H2B" ] && pass "CONFIRMED: column-level REVOKE did NOT stop anon reading password_hash (table-level GRANT still applies); proposed R4 as first written is ineffective" || fail "column revoke unexpectedly effective: $OUT"
su -c "grant all on public.members to anon, authenticated" >/dev/null

echo; echo "== R1a. registration function"
sf "$R/01_r1a_register.sql" >/dev/null 2>&1 && pass "R1a applied" || fail "R1a apply"
as anon - "select public.club_register_member('Zed Test','Zed@Example.INVALID','+299 123','GL','Nuuk','$H2B','ref-1')"
FIRST_OUT=$OUT
echo "$OUT" | grep -q '"status": "accepted"' && [ "$(su -c "select count(*) from public.members where email='zed@example.invalid'")" = "1" ] && pass "registration stores the member and answers only {accepted}" || fail "register: $OUT"
echo "$OUT" | grep -qi "password_hash" && fail "registration output contains a password_hash key" || pass "registration output has no password_hash key"
echo "$OUT" | grep -q "$H2B" && fail "registration output leaks the hash value" || pass "registration output does not contain the hash value"
echo "$OUT" | grep -qi '"member"' && fail "registration output carries member data" || pass "registration output carries no member data at all"
[ "$(su -c "select email from public.members where email ilike 'zed@example.invalid'")" = "zed@example.invalid" ] && pass "email stored in lower case" || fail "email not normalised"
[ "$(su -c "select referred_by from public.members where email='zed@example.invalid'")" = "REF-1" ] && pass "referral code upper-cased" || fail "referral not normalised"
as anon - "select public.club_register_member('Zed Again','zed@example.invalid','','','','$H2B')"; [ "$OUT" = "$FIRST_OUT" ] && [ "$(su -c "select count(*) from public.members where email='zed@example.invalid'")" = "1" ] && pass "an already-registered address gets the IDENTICAL answer (no enumeration through the function) and nothing changes" || fail "duplicate answer differs: '$OUT' vs '$FIRST_OUT'"
as anon - "select public.club_register_member('Bad','not-an-email','','','','$H2B')"; deny "invalid email rejected" "invalid registration"
as anon - "select public.club_register_member('Bad','bad1@example.invalid','','','','plain-password-123')"; deny "a plain password (not a bcrypt hash) is rejected" "invalid registration"
as anon - "select public.club_register_member('','bad2@example.invalid','','','','$H2B')"; deny "empty name rejected" "invalid registration"
as anon - "select public.club_register_member('Mal','mal@example.invalid','','','','$H2B')"
FORGE=$(su -c "select member_status||'/'||loyalty_tier||'/'||total_points||'/'||(auth_user_id is null)::text||'/'||is_active_member::text from public.members where email='mal@example.invalid'")
[ "$FORGE" = "registered/non_member/0/true/false" ] && pass "a registered member can only start as registered/non_member/0 points/no auth link/inactive (no parameter can forge status, tier, points or auth link)" || fail "forge check: $FORGE"

echo; echo "== R1b. login function (hash compared inside the database)"
sf "$R/02_r1b_login.sql" >/dev/null 2>&1 && pass "R1b applied" || fail "R1b apply"
as anon - "select public.club_member_login('alice@example.invalid','$TEST_PW')"; echo "$OUT" | grep -q '"ok": true' && pass "correct password with a bcryptjs \$2b\$ hash verifies" || fail "login 2b: $OUT"
as anon - "select public.club_member_login('bob@example.invalid','$TEST_PW')"; echo "$OUT" | grep -q '"ok": true' && pass "correct password with a bcryptjs \$2a\$ hash verifies" || fail "login 2a: $OUT"
echo "$OUT" | grep -qi "password_hash\|\$2[ab]\$10" && fail "login output leaks the hash" || pass "login output contains no hash and no password_hash key"
as anon - "select public.club_member_login('ALICE@example.invalid ','$TEST_PW')"; echo "$OUT" | grep -q '"ok": true' && pass "email matching is case/space-insensitive" || fail "login case: $OUT"
as anon - "select public.club_member_login('alice@example.invalid','wrong-password')"; W1=$OUT
as anon - "select public.club_member_login('nobody@example.invalid','wrong-password')"; W2=$OUT
[ "$W1" = '{"ok": false}' ] && [ "$W1" = "$W2" ] && pass "wrong password and unknown account return the identical answer (no account enumeration)" || fail "responses differ: '$W1' vs '$W2'"
for i in $(seq 1 10); do as anon - "select public.club_member_login('rate@example.invalid','x$i')"; done
as anon - "select public.club_member_login('rate@example.invalid','x11')"; echo "$OUT" | grep -q '"limited": true' && pass "11th attempt in 15 minutes is throttled inside the database" || fail "throttle: $OUT"

echo; echo "== Production-audit cases: a member with NO hash and one with a non-bcrypt value must fail cleanly"
su -c "insert into public.members(name,email,password_hash) values ('Nullhash','nullhash@example.invalid',null),('Garbage','garbage@example.invalid','not-a-bcrypt-hash')" >/dev/null
as anon - "select public.club_member_login('nullhash@example.invalid','$TEST_PW')"; [ "$OUT" = '{"ok": false}' ] && pass "a member with a NULL password hash gets the normal failure answer (no error)" || fail "null-hash login: rc=$RC $OUT"
as anon - "select public.club_member_login('garbage@example.invalid','$TEST_PW')"; [ "$OUT" = '{"ok": false}' ] && pass "a member with a non-bcrypt stored value gets the normal failure answer (no error)" || fail "garbage-hash login: rc=$RC $OUT"
echo; echo "== Function security properties"
FN=$(su -c "select p.proname||':'||p.prosecdef::text||':'||coalesce((select string_agg(c,',') from unnest(p.proconfig) c where c like 'search_path=%'),'NONE')||':'||coalesce(p.proacl::text,'NULL') from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in ('club_register_member','club_member_login') order by 1")
echo "$FN"
echo "$FN" | grep -q "club_register_member:true:search_path=pg_catalog, pg_temp" && pass "register: SECURITY DEFINER with pinned search_path (pg_catalog, pg_temp)" || fail "register props"
echo "$FN" | grep -q "club_member_login:true:search_path=pg_catalog, extensions, pg_temp" && pass "login: SECURITY DEFINER with pinned search_path (pg_catalog, extensions, pg_temp)" || fail "login props"
echo "$FN" | grep -qE "(^|[{,])=X/" && fail "a function grants EXECUTE to PUBLIC" || pass "no function grants EXECUTE to PUBLIC (only anon/authenticated/owner)"
[ "$(su -c "select has_schema_privilege('anon','extensions','create') or has_schema_privilege('authenticated','extensions','create')")" = "f" ] && pass "clients cannot create objects in the extensions schema that is on the login search_path (no search_path hijack)" || fail "extensions schema writable by clients"
[ "$(su -c "select has_schema_privilege('anon','public','create') or has_schema_privilege('authenticated','public','create')")" = "f" ] && pass "clients cannot create objects in public" || fail "public schema writable by clients"

echo; echo "== R1c. member session tokens (login v2, status, logout)"
sf "$R/06_r1c_member_session.sql" >/dev/null 2>&1 && pass "R1c applied (login upgraded, sessions table sealed)" || fail "R1c apply"
as anon - "select public.club_member_login('alice@example.invalid','$TEST_PW')"; TOK=$(echo "$OUT" | grep -o '"session_token": "[0-9a-f]\{64\}"' | cut -d'"' -f4)
[ ${#TOK} -eq 64 ] && pass "login issues a 64-hex session token" || fail "no token: $OUT"
as anon - "select public.club_member_status('$TOK')"; echo "$OUT" | grep -q '"ok": true' && echo "$OUT" | grep -q '"loyalty_tier"' && pass "status with a valid token returns the legacy-page fields" || fail "status: $OUT"
echo "$OUT" | grep -qi "password_hash\|auth_user_id" && fail "status leaks hash or auth link" || pass "status exposes no hash and no auth link"
as anon - "select public.club_member_status('$(printf '0%.0s' $(seq 1 64))')"; [ "$OUT" = '{"ok": false}' ] && pass "unknown token rejected" || fail "bad token: $OUT"
as anon - "select public.club_member_status('short')"; [ "$OUT" = '{"ok": false}' ] && pass "malformed token rejected" || fail "short token: $OUT"
[ "$(su -c "select count(*) from public.club_member_sessions where token_hash = '$TOK'")" = "0" ] && pass "the token itself is not stored (only its sha256)" || fail "token stored in clear"
as anon - "select * from public.club_member_sessions"; deny "anon cannot read the sessions table"
as authenticated $ALICE "select * from public.club_member_sessions"; deny "authenticated cannot read the sessions table"
su -c "update public.club_member_sessions set expires_at = now() - interval '1 minute'" >/dev/null
as anon - "select public.club_member_status('$TOK')"; [ "$OUT" = '{"ok": false}' ] && pass "expired token rejected" || fail "expired: $OUT"
as anon - "select public.club_member_login('bob@example.invalid','$TEST_PW')"; T2=$(echo "$OUT" | grep -o '"session_token": "[0-9a-f]\{64\}"' | cut -d'"' -f4)
as anon - "select public.club_member_logout('$T2')"; as anon - "select public.club_member_status('$T2')"; [ "$OUT" = '{"ok": false}' ] && pass "logout invalidates the token" || fail "logout: $OUT"

echo; echo "== C1. scoped self-view by session token (identity only from the token)"
sf "$R/07_c1_member_view.sql" >/dev/null 2>&1 && pass "C1 applied (club_member_view)" || fail "C1 apply"
su -c "update public.members set loyalty_tier='gold', weekly_loyalty_progress=3, season_loyalty_progress=7, membership_expires_at='2027-01-31', total_points=42, phone='+299 55', city='Nuuk' where email='alice@example.invalid'" >/dev/null
as anon - "select public.club_member_login('alice@example.invalid','$TEST_PW')"; TA=$(echo "$OUT" | grep -o '"session_token": "[0-9a-f]\{64\}"' | cut -d'"' -f4)
as anon - "select public.club_member_login('bob@example.invalid','$TEST_PW')"; TB=$(echo "$OUT" | grep -o '"session_token": "[0-9a-f]\{64\}"' | cut -d'"' -f4)
as anon - "select public.club_member_view('$TA','tier')"; [ "$OUT" = '{"ok": true, "data": {"loyalty_tier": "gold"}}' ] && pass "scope tier returns only loyalty_tier" || fail "tier: $OUT"
as anon - "select public.club_member_view('$TA','ticket_progress')"; [ "$OUT" = '{"ok": true, "data": {"season_loyalty_progress": 7, "weekly_loyalty_progress": 3}}' ] && pass "scope ticket_progress returns only the two progress counters" || fail "progress: $OUT"
as anon - "select public.club_member_view('$TA','membership')"; [ "$OUT" = '{"ok": true, "data": {"membership_expires_at": "2027-01-31"}}' ] && pass "scope membership returns only the expiry date" || fail "membership: $OUT"
as anon - "select public.club_member_view('$TA','profile')"; echo "$OUT" | grep -q '"city": "Nuuk"' && pass "scope profile returns the member's own profile" || fail "profile: $OUT"
echo "$OUT" | grep -qi "password_hash\|auth_user_id\|\$2[ab]\$" && fail "profile leaks hash or auth link" || pass "profile contains no password_hash, no auth_user_id, no hash value"
as anon - "select public.club_member_view('$TB','tier')"; [ "$OUT" = '{"ok": true, "data": {"loyalty_tier": "non_member"}}' ] && pass "a second member's token returns THEIR OWN data, never another member's (no identity parameter exists)" || fail "isolation: $OUT"
as anon - "select public.club_member_view('$TA','everything')"; [ "$OUT" = '{"ok": false}' ] && pass "unknown scope refused" || fail "scope: $OUT"
as anon - "select public.club_member_view('$(printf '1%.0s' $(seq 1 64))','profile')"; [ "$OUT" = '{"ok": false}' ] && pass "unknown token refused" || fail "unknown token: $OUT"
as anon - "select public.club_member_view('alice@example.invalid','profile')"; [ "$OUT" = '{"ok": false}' ] && pass "an email is not accepted as proof of identity" || fail "email as token: $OUT"
as anon - "select public.club_member_view(null,'profile')"; [ "$OUT" = '{"ok": false}' ] && pass "null token refused" || fail "null token: $OUT"
as authenticated $ADMIN "select public.club_member_view('$(printf '2%.0s' $(seq 1 64))','profile')"; [ "$OUT" = '{"ok": false}' ] && pass "a signed-in Supabase user (even the operator) cannot read a member through this function without that member's session token" || fail "operator without token: $OUT"
su -c "update public.club_member_sessions set expires_at = now() - interval '1 minute' where token_hash = encode(extensions.digest('$TB','sha256'),'hex')" >/dev/null
as anon - "select public.club_member_view('$TB','tier')"; [ "$OUT" = '{"ok": false}' ] && pass "expired session refused" || fail "expired: $OUT"
FNV=$(su -c "select p.prosecdef::text||':'||coalesce((select string_agg(c,',') from unnest(p.proconfig) c where c like 'search_path=%'),'NONE')||':'||(coalesce(p.proacl::text,'') ~ '(^|[{,])=X/')::text from pg_proc p where p.proname='club_member_view'")
[ "$FNV" = "true:search_path=pg_catalog, extensions, pg_temp:false" ] && pass "club_member_view: SECURITY DEFINER, pinned search_path, no EXECUTE for PUBLIC" || fail "view props: $FNV"

echo; echo "== R3. unused privileges removed"
sf "$R/03_r3_privileges.sql" >/dev/null 2>&1 && pass "R3 applied" || fail "R3 apply"
as anon - "delete from public.members where email='carol@example.invalid'"; deny "anon DELETE denied"
as anon - "truncate public.members"; deny "anon TRUNCATE denied"
as anon - "update public.members set name='x' where email='carol@example.invalid'"; deny "anon UPDATE denied"
as authenticated $ALICE "delete from public.members where email='carol@example.invalid'"; deny "authenticated DELETE denied"
as authenticated $ALICE "truncate public.members"; deny "authenticated TRUNCATE denied"
as anon - "select count(*) from public.members"; ok "anon SELECT still works after R3 (known remaining exposure until R4/R5)"
as anon - "select public.club_register_member('Reg Three','reg3@example.invalid','','','','$H2B')"; echo "$OUT" | grep -q '"status": "accepted"' && [ "$(su -c "select count(*) from public.members where email='reg3@example.invalid'")" = "1" ] && pass "registration still works after R3" || fail "register after R3: $OUT"
as anon - "select public.club_member_login('alice@example.invalid','$TEST_PW')"; echo "$OUT" | grep -q '"ok": true' && pass "login still works after R3" || fail "login after R3: $OUT"

echo; echo "== R4 (corrected). table-level privileges removed, safe columns granted back"
sf "$R/04_r4_column_grants.sql" >/dev/null 2>&1 && pass "R4 applied" || fail "R4 apply"
as anon - "select email from public.members"; deny "anon cannot SELECT member details (any column)"
as anon - "select password_hash from public.members"; deny "anon cannot read password_hash"
as anon - "insert into public.members(name,email) values ('Forged','forged@example.invalid')"; deny "anon cannot INSERT a forged member directly"
as authenticated $ALICE "select password_hash from public.members"; deny "authenticated cannot read password_hash (column not granted)"
as authenticated $ALICE "select * from public.members"; deny "authenticated 'select *' is denied (code that uses select('*') must list columns: see plan)"
as authenticated $ALICE "select email from public.members where email='bob@example.invalid'"; [ $RC -eq 0 ] && [ "$OUT" = "bob@example.invalid" ] && pass "KNOWN GAP BEFORE R5: any authenticated user can still read another member's non-secret columns (rows are not yet restricted)" || fail "gap check: $OUT"
as anon - "select public.club_register_member('Reg Four','reg4@example.invalid','','','','$H2B')"; echo "$OUT" | grep -q '"status": "accepted"' && [ "$(su -c "select count(*) from public.members where email='reg4@example.invalid'")" = "1" ] && pass "registration still works after R4 (definer function)" || fail "register after R4: $OUT"
as anon - "select public.club_member_login('alice@example.invalid','$TEST_PW')"; echo "$OUT" | grep -q '"ok": true' && pass "legacy login still works after R4" || fail "login after R4: $OUT"

echo; echo "== R5. row-level security"
sf "$R/05_r5_rls.sql" >/dev/null 2>&1 && pass "R5 applied" || fail "R5 apply"
[ "$(su -c "select relrowsecurity::text||'/'||relforcerowsecurity::text from pg_class where oid='public.members'::regclass")" = "true/true" ] && pass "RLS enabled and forced on public.members" || fail "RLS flags"
as authenticated $ALICE "select count(*) from public.members"; eq "authenticated user sees only their OWN member row" "1"
as authenticated $ALICE "select email from public.members where email='bob@example.invalid'"; [ $RC -eq 0 ] && [ -z "$OUT" ] && pass "authenticated user cannot read another member's record" || fail "cross-read: $OUT"
as authenticated $DAVE "select count(*) from public.members"; eq "authenticated user with no member record sees nothing" "0"
as authenticated $ADMIN "select count(*) from public.members"; [ $RC -eq 0 ] && [ "$(echo "$OUT" | tail -1)" -ge 5 ] && pass "operator/staff sees all member rows" || fail "staff read: $OUT"
as authenticated $ALICE "update public.members set name='Hacked' where email='bob@example.invalid'"
[ "$(su -c "select name from public.members where email='bob@example.invalid'")" = "Bob" ] && pass "authenticated user cannot modify another member (row unchanged)" || fail "bob was modified"
as authenticated $ALICE "update public.members set loyalty_tier='hall_of_fame', total_points=999999 where email='alice@example.invalid'"
[ "$(su -c "select loyalty_tier||'/'||total_points from public.members where email='alice@example.invalid'")" = "gold/42" ] && pass "a member cannot raise their own tier or points (policy blocks non-staff UPDATE)" || fail "self-escalation worked"
as authenticated $ALICE "update public.members set auth_user_id='$BOB' where email='alice@example.invalid'"; deny "a member cannot re-link their auth identity (column not granted)"
as authenticated $ADMIN "update public.members set loyalty_tier='gold' where email='carol@example.invalid'"; ok "staff can update a granted column (loyalty_tier)"
[ "$(su -c "select loyalty_tier from public.members where email='carol@example.invalid'")" = "gold" ] && pass "staff update took effect" || fail "staff update lost"
as authenticated $ADMIN "update public.members set email='x@example.invalid' where email='carol@example.invalid'"; deny "staff cannot change email (column not granted)"
as authenticated $ADMIN "update public.members set password_hash='x' where email='carol@example.invalid'"; deny "staff cannot write password_hash"
as authenticated $ADMIN "delete from public.members where email='carol@example.invalid'"; deny "staff cannot DELETE members"
as authenticated $ADMIN "select email, loyalty_tier from public.members where email='carol@example.invalid'"; ok "staff can read explicit non-secret columns"
as anon - "select count(*) from public.members"; deny "anon cannot read members at all"
as anon - "update public.members set name='x'"; deny "anon cannot update members"
as anon - "insert into public.members(name,email) values ('Forged','forged2@example.invalid')"; deny "anon cannot forge a membership record directly"
as authenticated $ALICE "insert into public.members(name,email) values ('Forged','forged3@example.invalid')"; deny "authenticated cannot forge a membership record directly"
as anon - "select public.club_register_member('Reg Five','reg5@example.invalid','','','','$H2B')"; echo "$OUT" | grep -q '"status": "accepted"' && [ "$(su -c "select count(*) from public.members where email='reg5@example.invalid'")" = "1" ] && pass "registration works under forced RLS (definer function)" || fail "register under RLS: $OUT"
as anon - "select public.club_member_login('alice@example.invalid','$TEST_PW')"; echo "$OUT" | grep -q '"ok": true' && pass "legacy login works under forced RLS" || fail "login under RLS: $OUT"
TOK3=$(echo "$OUT" | grep -o '"session_token": "[0-9a-f]\{64\}"' | cut -d'"' -f4)
as anon - "select public.club_member_status('$TOK3')"; echo "$OUT" | grep -q '"ok": true' && pass "session status works under forced RLS" || fail "status under RLS: $OUT"

echo; echo "== ROLLBACK (rows must be untouched)"
POST_BEFORE=$(su -c "select count(*) from public.members")
sf "$R/rollback_all.sql" >/dev/null 2>&1 && pass "rollback applied" || fail "rollback apply"
as anon - "select password_hash from public.members where email='alice@example.invalid'"; [ "$OUT" = "$H2B" ] && pass "rollback restores the audited baseline (anon privileges back)" || fail "rollback privileges: $OUT"
[ "$(su -c "select count(*) from pg_proc where proname like 'club_member%' or proname='club_register_member'")" = "0" ] && pass "new functions removed" || fail "functions remain"
[ "$(su -c "select to_regclass('public.club_member_sessions') is null")" = "t" ] && pass "sessions table removed" || fail "sessions table remains"
[ "$(su -c "select relrowsecurity::text from pg_class where oid='public.members'::regclass")" = "false" ] && pass "RLS disabled again" || fail "RLS still on"
[ "$(su -c "select count(*) from public.members")" = "$POST_BEFORE" ] && pass "member row count identical before and after rollback" || fail "row count changed"
sf "$R/01_r1a_register.sql" >/dev/null 2>&1 && sf "$R/02_r1b_login.sql" >/dev/null 2>&1 && sf "$R/03_r3_privileges.sql" >/dev/null 2>&1 && pass "re-applying R1a/R1b/R3 after rollback works (repeatable)" || fail "re-apply after rollback"

echo; echo "RESULT: $PASSN passed, $FAILN failed"
