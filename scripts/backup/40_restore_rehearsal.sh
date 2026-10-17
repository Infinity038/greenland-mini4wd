#!/usr/bin/env bash
# Restore the plaintext backup into a DISPOSABLE LOCAL Docker Postgres (no cloud, no cost). Compare counts. Container is always removed.
. "$(dirname "$0")/lib.sh"
D="${1:?usage: 40_restore_rehearsal.sh <backup-dir>}"; D="$(cd "$D" && pwd)"; need docker
IMG="${SUPABASE_PG_IMAGE:-supabase/postgres:17.6.1.155}"   # match production Postgres version; adjust tag if not found
NAME="gl-restore-rehearsal-$$"; PW=$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n'); PORT="${REHEARSAL_PORT:-54329}"
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$NAME" -e POSTGRES_PASSWORD="$PW" -p 127.0.0.1:$PORT:5432 "$IMG" >/dev/null
export PGHOST=127.0.0.1 PGPORT=$PORT PGUSER=supabase_admin PGPASSWORD="$PW" PGDATABASE=postgres PGSSLMODE=disable
for i in $(seq 1 60); do pg_isready -q && break; sleep 2; done; pg_isready -q || die "rehearsal DB did not start"
REP="$D/rehearsal_report.txt"; : > "$REP"
psql -X -v ON_ERROR_STOP=0 -q -f "$D/schema_public.sql"                        >>"$REP" 2>&1 || true
pg_restore --data-only --disable-triggers --no-owner -d postgres "$D/data_public.dump" >>"$REP" 2>&1 || warn "pg_restore reported issues (see report)"
psql -X -v ON_ERROR_STOP=0 -q -f "$D/data_managed.sql"                          >>"$REP" 2>&1 || true   # best effort: auth/storage version drift is possible
q "$COUNT_SQL" > "$D/counts_rehearsal.tsv"
rc=0
while IFS=$'\t' read -r t n; do
  case "$t" in public.*) r=$(awk -F'\t' -v t="$t" '$1==t{print $2}' "$D/counts_rehearsal.tsv"); [ "${r:-x}" = "$n" ] && echo "PASS $t $n" || { echo "FAIL $t expected=$n restored=${r:-missing}"; rc=1; };; esac
done < "$D/counts_before.tsv" > "$D/.cmp"
tee -a "$REP" < "$D/.cmp"; grep -q '^FAIL' "$D/.cmp" && rc=1; rm -f "$D/.cmp"
for t in auth.users storage.buckets; do echo "INFO  $t expected=$(awk -F'\t' -v t=$t '$1==t{print $2}' "$D/counts_before.tsv") restored=$(awk -F'\t' -v t=$t '$1==t{print $2}' "$D/counts_rehearsal.tsv")" | tee -a "$REP"; done
echo "Report: $REP (counts only; also check it for ERROR lines). Container removed on exit."
exit $rc
