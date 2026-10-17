#!/usr/bin/env bash
# LOCAL ONLY: restore a plaintext backup into disposable Docker PostgreSQL; prove
# public AND managed table counts. Any SQL error is a failure, never a green report.
. "$(dirname "$0")/lib.sh"
D="${1:?usage: 40_restore_rehearsal.sh <backup-dir>}"; D="$(cd "$D" && pwd)"; need docker
IMG="${SUPABASE_PG_IMAGE:-supabase/postgres:17.6.1.155}" # check published image/tag before running
NAME="gl-restore-rehearsal-$$"
PW=$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')
PORT="${REHEARSAL_PORT:-54329}"
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$NAME" -e POSTGRES_PASSWORD="$PW" -p 127.0.0.1:$PORT:5432 "$IMG" >/dev/null
export PGHOST=127.0.0.1 PGPORT=$PORT PGUSER=supabase_admin PGPASSWORD="$PW" PGDATABASE=postgres PGSSLMODE=disable
for i in $(seq 1 60); do pg_isready -q && break; sleep 2; done
pg_isready -q || die "rehearsal DB did not start"
REP="$D/rehearsal_report.txt"; : > "$REP"
if ! psql -X -v ON_ERROR_STOP=1 -q -f "$D/schema_public.sql" >>"$REP" 2>&1; then
  die "local public schema restore failed; inspect private rehearsal report (do not share row data)"
fi
if ! pg_restore --exit-on-error --data-only --disable-triggers --no-owner -d postgres "$D/data_public.dump" >>"$REP" 2>&1; then
  die "local public data restore failed; inspect private rehearsal report"
fi
if ! psql -X -v ON_ERROR_STOP=1 -q -f "$D/data_managed.sql" >>"$REP" 2>&1; then
  die "local Auth/Storage/migration data restore failed; do NOT mark recoverable"
fi
q "$COUNT_SQL" > "$D/counts_rehearsal.tsv"
[ -s "$D/counts_before.tsv" ] && [ -s "$D/counts_rehearsal.tsv" ] || die "missing table counts"
rc=0
while IFS=$'\t' read -r t n; do
  case "$t" in
    public.*|auth.*|storage.*|supabase_migrations.*)
      value=$(awk -F'\t' -v t="$t" '$1==t{print $2}' "$D/counts_rehearsal.tsv")
      if [ "${value:-missing}" = "$n" ]; then
        echo "PASS $t $n"
      else
        echo "FAIL $t expected=$n restored=${value:-missing}"
        rc=1
      fi ;;
  esac
done < "$D/counts_before.tsv" > "$D/.cmp"
tee -a "$REP" < "$D/.cmp"
grep -q '^FAIL' "$D/.cmp" && rc=1
rm -f "$D/.cmp"
if [ "$rc" -ne 0 ]; then
  echo "REHEARSAL FAILED: not a validated recoverable backup. Report: $REP" >&2
  exit 1
fi
echo "LOCAL RESTORE COUNTS PASSED: inspect report for omitted objects, Auth settings, storage files and role configuration before declaring full recoverability."
echo "Report: $REP (container removed on exit)"
