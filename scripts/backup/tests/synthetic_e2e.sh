#!/usr/bin/env bash
# End-to-end dry run of 10 -> 20 -> 40 -> 30 (+ decrypt test) using ONLY synthetic data in a
# disposable localhost Docker container. No cloud connection, no production credentials.
set -euo pipefail
umask 077
HERE="$(cd "$(dirname "$0")" && pwd)"; B="$HERE/.."
for t in docker psql pg_dump pg_restore pg_isready age age-keygen tar sha256sum; do
  command -v "$t" >/dev/null || { echo "ERROR: missing tool $t" >&2; exit 1; }
done
IMG="${SUPABASE_PG_IMAGE:-supabase/postgres:17.6.1.155}"
SRC="gl-synthetic-source-$$"; SPORT="${SYNTH_PORT:-54328}"
SPW=$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')
WORK="$(mktemp -d "${TMPDIR:-/tmp}/gl-synth-XXXXXX")"
cleanup() {
  rc=$?
  if [ $rc -ne 0 ]; then   # synthetic data only, safe to print
    for r in "$WORK"/out/*/rehearsal_report.txt; do [ -f "$r" ] && { echo "--- tail of synthetic rehearsal report ---"; tail -n 15 "$r"; }; done
    echo "SYNTHETIC E2E FAILED (exit $rc)" >&2
  fi
  docker rm -f "$SRC" >/dev/null 2>&1 || true; rm -rf "$WORK"
}
trap cleanup EXIT
git -C "$WORK" rev-parse >/dev/null 2>&1 && { echo "ERROR: temp dir inside git" >&2; exit 1; }

echo "== start synthetic source container ($IMG) =="
docker run -d --name "$SRC" -e POSTGRES_PASSWORD="$SPW" -p 127.0.0.1:$SPORT:5432 "$IMG" >/dev/null
export PGHOST=127.0.0.1 PGPORT=$SPORT PGUSER=supabase_admin PGPASSWORD="$SPW" PGDATABASE=postgres
for _ in $(seq 1 60); do pg_isready -q && break; sleep 2; done; sleep 3; pg_isready -q
PGOPTIONS='-c gl.synthetic_ok=yes' psql -X -q -v ON_ERROR_STOP=1 -f "$HERE/synthetic_seed.sql"

echo "== 10_backup (synthetic) =="
# EXPECTED_REF is set to the loopback host so the ref guard accepts ONLY this local source.
EXPECTED_REF=127.0.0.1 BACKUP_ROOT="$WORK/out" bash "$B/10_backup.sh"
OUT=$(ls -d "$WORK"/out/greenland-* | head -1)

echo "== 20_verify =="
bash "$B/20_verify.sh" "$OUT"

echo "== 40_restore_rehearsal (separate disposable container) =="
unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
bash "$B/40_restore_rehearsal.sh" "$OUT"

echo "== negative test: tampered dump must FAIL verify =="
cp -a "$OUT" "$WORK/tampered"; printf 'x' >> "$WORK/tampered/data_all.dump"
if bash "$B/20_verify.sh" "$WORK/tampered" >/dev/null 2>&1; then echo "ERROR: tamper not detected" >&2; exit 1; else echo "PASS tamper detected"; fi

echo "== negative test: count mismatch must FAIL rehearsal =="
cp -a "$OUT" "$WORK/mismatch"; awk -F'\t' -v OFS='\t' '$1=="public.members"{$2=$2+1}1' "$OUT/counts_before.tsv" > "$WORK/mismatch/counts_before.tsv"
if bash "$B/40_restore_rehearsal.sh" "$WORK/mismatch" >/dev/null 2>&1; then echo "ERROR: mismatch not detected" >&2; exit 1; else echo "PASS mismatch detected"; fi
rm -rf "$WORK/mismatch"

echo "== 30_encrypt + decrypt test (throwaway key) =="
age-keygen -o "$WORK/test.key" 2>/dev/null
AGE_RECIPIENT=$(age-keygen -y "$WORK/test.key") bash "$B/30_encrypt.sh" "$OUT"
( cd "$WORK/out" && sha256sum -c "$(basename "$OUT").tar.age.sha256" )
age -d -i "$WORK/test.key" "$OUT.tar.age" | tar -t | grep -q 'data_all.dump' && echo "PASS decrypt + archive listing"
mkdir "$WORK/dec" && age -d -i "$WORK/test.key" "$OUT.tar.age" | tar -x -C "$WORK/dec"
( cd "$WORK/dec/$(basename "$OUT")" && sha256sum -c --quiet SHA256SUMS ) && echo "PASS decrypted files match SHA256SUMS"
echo "SYNTHETIC E2E PASSED (all synthetic artifacts deleted on exit)"
