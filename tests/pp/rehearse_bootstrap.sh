#!/usr/bin/env bash
# LOCAL, DISPOSABLE rehearsal of the owner/staff bootstrap (public.bootstrap_owner_admin). Synthetic users only; no hosted database.
#   bash tests/pp/rehearse_bootstrap.sh
set -uo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
IMG=${PP_IMG:-public.ecr.aws/supabase/postgres:17.11.0.004}
LOG=$ROOT/.checkpoints/bootstrap_rehearsal.log; mkdir -p "$ROOT/.checkpoints"; exec > >(tee "$LOG") 2>&1
C=pp-bootstrap-rehearsal-$$
trap 'docker rm -f $C >/dev/null 2>&1' EXIT
PASSN=0; FAILN=0
pass() { echo "PASS  $*"; PASSN=$((PASSN+1)); }; fail() { echo "FAIL  $*"; FAILN=$((FAILN+1)); }
echo "OWNER BOOTSTRAP REHEARSAL (local, synthetic) $(date -u +%FT%TZ)"
docker run -d --name $C -e POSTGRES_PASSWORD=rehearsal --tmpfs /var/lib/postgresql/data:rw,mode=1777 "$IMG" >/dev/null || { echo "cannot start container"; exit 1; }
for _ in $(seq 1 60); do docker exec $C pg_isready -q -U supabase_admin 2>/dev/null && break; sleep 2; done; sleep 4
su() { docker exec -i $C psql -X -qAt -v ON_ERROR_STOP=1 -U supabase_admin -d postgres "$@"; }
sf() { docker exec -i $C psql -X -qAt -v ON_ERROR_STOP=1 -U supabase_admin -d postgres < "$1"; }
OWNER=00000000-0000-0000-0000-0000000000a1; MALLORY=00000000-0000-0000-0000-0000000000b1; ALIAS=00000000-0000-0000-0000-0000000000b2; UNCONF=00000000-0000-0000-0000-0000000000b3; SECOND=00000000-0000-0000-0000-0000000000b4
as() { local role=$1 uid=$2 sql=$3; local pre="begin; set local role $role;"
  [ "$uid" != "-" ] && pre="$pre do \$\$ begin perform set_config('request.jwt.claim.sub','$uid',true); perform set_config('request.jwt.claims', json_build_object('sub','$uid','role','$role')::text, true); end \$\$;"
  OUT=$(docker exec -i $C psql -X -qAt -v ON_ERROR_STOP=1 -U supabase_admin -d postgres -c "$pre $sql; commit;" 2>&1); RC=$?; }
deny() { local n=$1 pat=${2:-permission denied}; if [ $RC -ne 0 ] && echo "$OUT" | grep -qiE "$pat"; then pass "$n"; else fail "$n (rc=$RC out=$OUT)"; fi; }
cnt()  { su -c "select count(*) from public.staff_roles"; }

echo "== SETUP: production-like state (owner confirmed with a password, never signed in; staff_roles EMPTY)"
sf "$ROOT/supabase/migrations/20260719_auth_phase1_foundation.sql" >/dev/null 2>&1 || su -c "create table if not exists public.members(id uuid primary key default gen_random_uuid(), email text unique not null, auth_user_id uuid)" >/dev/null
sf "$ROOT/supabase/migrations/20260719_auth_phase2_staff_roles.sql" >/dev/null 2>&1 && pass "staff roles migration applied" || fail "staff roles migration"
sf "$ROOT/supabase/migrations/20260719_auth_owner_bootstrap.sql" >/dev/null 2>&1 && pass "owner bootstrap migration applied" || fail "owner bootstrap migration"
su -c "alter table auth.users add column if not exists email_confirmed_at timestamptz" >/dev/null 2>&1
su -c "insert into auth.users(id,email,email_confirmed_at) values ('$OWNER','alltfarmer@gmail.com',now()),('$MALLORY','mallory@example.invalid',now()),('$ALIAS','alltfarmer+x@gmail.com',now()),('$SECOND','second@example.invalid',now());
       insert into auth.users(id,email) values ('$UNCONF','owner.lookalike@example.invalid');" >/dev/null && pass "synthetic users created" || fail "users"
[ "$(cnt)" = "0" ] && pass "staff_roles starts empty (as in production)" || fail "staff_roles not empty"

echo; echo "== Who may call it"
as anon - "select public.bootstrap_owner_admin()"; deny "anonymous visitors cannot execute it" "permission denied"
as authenticated $MALLORY "select public.bootstrap_owner_admin()"; deny "a confirmed stranger is refused (not the owner address)" "Owner account required"
as authenticated $ALIAS "select public.bootstrap_owner_admin()"; deny "a look-alike address (alltfarmer+x@gmail.com) is refused" "Owner account required"
[ "$(cnt)" = "0" ] && pass "no role was granted by any refused attempt" || fail "a refused attempt granted a role"

echo; echo "== The owner"
su -c "update auth.users set email_confirmed_at = null where id='$OWNER'" >/dev/null
as authenticated $OWNER "select public.bootstrap_owner_admin()"; deny "the owner address WITHOUT a confirmed email is refused" "Email confirmation required"
su -c "update auth.users set email_confirmed_at = now() where id='$OWNER'" >/dev/null
as authenticated $OWNER "select public.bootstrap_owner_admin()"; [ $RC -eq 0 ] && [ "$OUT" = "t" ] && pass "the confirmed owner is granted the admin role" || fail "owner bootstrap: rc=$RC $OUT"
[ "$(su -c "select role||'/'||(granted_by = user_id)::text from public.staff_roles")" = "admin/true" ] && [ "$(cnt)" = "1" ] && pass "exactly one admin row, granted_by = the owner" || fail "role row wrong"
as authenticated $OWNER "select public.bootstrap_owner_admin()"; [ $RC -eq 0 ] && [ "$OUT" = "t" ] && [ "$(cnt)" = "1" ] && pass "calling it again is idempotent (still one row)" || fail "not idempotent"
as authenticated $OWNER "select public.is_admin()"; [ "$OUT" = "t" ] && pass "is_admin() is true for the owner" || fail "is_admin: $OUT"
as authenticated $MALLORY "select public.is_admin()"; [ "$OUT" = "f" ] && pass "is_admin() stays false for everyone else" || fail "mallory is_admin: $OUT"

echo; echo "== After bootstrap: closed to everyone else"
as authenticated $MALLORY "select public.bootstrap_owner_admin()"; deny "a stranger is still refused" "Owner account required"
su -c "delete from public.staff_roles" >/dev/null; su -c "insert into public.staff_roles(user_id, role) values ('$SECOND','admin')" >/dev/null
as authenticated $OWNER "select public.bootstrap_owner_admin()"; deny "once ANOTHER staff member exists, a fresh owner bootstrap is closed" "bootstrap is closed"

echo; echo "== Direct self-grant attempts by signed-in users"
as authenticated $MALLORY "insert into public.staff_roles(user_id, role) values ('$MALLORY','admin')"; deny "cannot insert a staff role directly"
as authenticated $MALLORY "update public.staff_roles set user_id='$MALLORY'"; deny "cannot update staff roles"
as authenticated $MALLORY "select * from public.staff_roles"; deny "cannot even read the staff roles table"
as anon - "insert into public.staff_roles(user_id, role) values ('$MALLORY','admin')"; deny "anonymous cannot insert a staff role"
as authenticated $MALLORY "select public.has_staff_role(array['admin']::public.staff_role[])"; [ "$OUT" = "f" ] && pass "has_staff_role is false for a stranger" || fail "has_staff_role: $OUT"
[ "$(su -c "select count(*) from public.staff_roles where user_id='$MALLORY'")" = "0" ] && pass "the stranger holds no role at the end" || fail "stranger has a role"
echo; echo "RESULT: $PASSN passed, $FAILN failed"
