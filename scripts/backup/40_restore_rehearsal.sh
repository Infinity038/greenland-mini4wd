#!/usr/bin/env bash
# LOCAL ONLY: restore a plaintext backup into a NEW, EMPTY database inside a disposable
# localhost-only Docker container started by this script. Nothing is dropped: the restore
# target is a fresh database created from template0, so the image's own auth/storage
# bootstrap is never touched or relied on. Managed schemas come from the source dump.
# Any SQL error, count mismatch, structure mismatch or FK violation is a failure.
. "$(dirname "$0")/lib.sh"
D="${1:?usage: 40_restore_rehearsal.sh <backup-dir>}"; D="$(cd "$D" && pwd)"
for t in docker psql pg_restore pg_isready; do need $t; done
for f in schema_all.sql data_all.dump extensions.tsv objects_before.tsv counts_before.tsv; do
  [ -s "$D/$f" ] || die "missing $f in backup folder (produced by the current 10_backup.sh)"
done
IMG="${SUPABASE_PG_IMAGE:-supabase/postgres:17.6.1.155}"   # = production version (Supabase get_project)
NAME="gl-restore-rehearsal-$$"
PW=$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')
PORT="${REHEARSAL_PORT:-54329}"
DB=gl_rehearsal
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$NAME" --label gl-rehearsal=disposable -e POSTGRES_PASSWORD="$PW" -p 127.0.0.1:$PORT:5432 "$IMG" >/dev/null \
  || die "could not start disposable container"
export PGHOST=127.0.0.1 PGPORT=$PORT PGUSER=supabase_admin PGPASSWORD="$PW" PGDATABASE=postgres PGSSLMODE=disable
unset PGSERVICE PGSERVICEFILE
for _ in $(seq 1 60); do pg_isready -q && break; sleep 2; done
pg_isready -q || die "rehearsal DB did not start"
sleep 3; pg_isready -q || die "rehearsal DB not stable after init"

# Safety guard: target must be loopback, the container we just started, and not the production ref.
[ "$PGHOST" = "127.0.0.1" ] || die "refusing: rehearsal target is not loopback"
[ "$(docker inspect -f '{{.State.Running}}' "$NAME" 2>/dev/null)" = "true" ] || die "refusing: disposable container not running"
case "$PGHOST$PGUSER$PGDATABASE" in *"$EXPECTED_REF"*) die "refusing: target looks like production";; esac

REP="$D/rehearsal_report.txt"; : > "$REP"
psqlx() { psql -X -q -v ON_ERROR_STOP=1 "$@"; }

echo "== create empty restore database $DB (template0) ==" | tee -a "$REP"
psqlx -d postgres -c "create database $DB template template0" >>"$REP" 2>&1 || die "could not create $DB"
export PGDATABASE=$DB
# The dump recreates schema public with its production grants. Remove the EMPTY default public
# schema of the database we just created (RESTRICT: fails if it contains anything).
psqlx -c "drop schema public restrict" >>"$REP" 2>&1 || die "could not reset empty public schema in fresh $DB"

echo "== extensions (production list) ==" | tee -a "$REP"
while IFS=$'\t' read -r ext ver nsp; do
  [ -n "$ext" ] || continue; [ "$ext" = plpgsql ] && continue
  if psqlx -c "create schema if not exists \"$nsp\"" -c "create extension if not exists \"$ext\" with schema \"$nsp\"" >>"$REP" 2>&1; then
    got=$(psql -X -qAt -c "select extversion from pg_extension where extname='$ext'")
    [ "$got" = "$ver" ] && echo "ext ok $ext $ver" >>"$REP" || echo "WARN extension $ext version local=$got prod=$ver" | tee -a "$REP"
  else
    echo "WARN extension $ext ($nsp) not creatable in a non-default DB; restore errors below decide if it matters" | tee -a "$REP"
  fi
done < "$D/extensions.tsv"

echo "== schema (public + auth + storage + supabase_migrations, dependency-ordered) ==" | tee -a "$REP"
psqlx -f "$D/schema_all.sql" >>"$REP" 2>&1 || die "local schema restore failed; see private report $REP (do not share row data)"

echo "== data (single snapshot, triggers disabled during load) ==" | tee -a "$REP"
pg_restore --exit-on-error --data-only --disable-triggers --no-owner -d "$DB" "$D/data_all.dump" >>"$REP" 2>&1 \
  || die "local data restore failed; do NOT mark recoverable; see private report $REP"

echo "== foreign-key re-validation ==" | tee -a "$REP"
psqlx >>"$REP" 2>&1 <<'SQL' || die "foreign-key validation failed after restore (orphaned rows); do NOT mark recoverable"
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conrelid::regclass AS t, conname, pg_get_constraintdef(oid) AS d
           FROM pg_constraint
           WHERE contype = 'f' AND connamespace::regnamespace::text IN ('public','auth','storage','supabase_migrations')
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I, ADD CONSTRAINT %I %s', r.t, r.conname, r.conname, r.d);
  END LOOP;
END $$;
SQL
echo "FK constraints re-validated" | tee -a "$REP"

q "$COUNT_SQL" > "$D/counts_rehearsal.tsv"
q "$OBJ_SQL"   > "$D/objects_rehearsal.tsv"
rc=0
{
  while IFS=$'\t' read -r t n; do
    value=$(awk -F'\t' -v t="$t" '$1==t{print $2}' "$D/counts_rehearsal.tsv")
    if [ "${value:-missing}" = "$n" ]; then echo "PASS $t $n"; else echo "FAIL $t expected=$n restored=${value:-missing}"; fi
  done < "$D/counts_before.tsv"
  cut -f1 "$D/counts_before.tsv" | sort > "$D/.a"; cut -f1 "$D/counts_rehearsal.tsv" | sort > "$D/.b"
  comm -13 "$D/.a" "$D/.b" | sed 's/^/FAIL unexpected extra table /'
} > "$D/.cmp"
tee -a "$REP" < "$D/.cmp"
grep -q '^FAIL' "$D/.cmp" && rc=1

sort "$D/objects_before.tsv" > "$D/.a"; sort "$D/objects_rehearsal.tsv" > "$D/.b"
if cmp -s "$D/.a" "$D/.b"; then
  echo "PASS structure: RLS flags, policies, functions, triggers, constraints, grants match ($(wc -l < "$D/.a") items)" | tee -a "$REP"
else
  echo "FAIL structure differs (metadata names only; '<' production only, '>' restore only):" | tee -a "$REP"
  diff "$D/.a" "$D/.b" | grep -E '^[<>]' | tee -a "$REP"
  rc=1
fi
rm -f "$D/.cmp" "$D/.a" "$D/.b"

if [ "$rc" -ne 0 ]; then
  echo "REHEARSAL FAILED: not a validated recoverable backup. Report: $REP" >&2
  exit 1
fi
echo "LOCAL RESTORE PASSED: all table counts (public/auth/storage/migrations), structure inventory and FKs match."
echo "Still NOT proven by this test: Auth service sign-in/config, Storage files, roles/passwords, project settings (see BACKUP_PROCEDURE.md section 6)."
echo "Report: $REP (container removed on exit)"
