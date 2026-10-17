#!/usr/bin/env bash
# READ-ONLY logical export of schema + data to BACKUP_ROOT. Run during a write freeze. Output is SENSITIVE (contains auth hashes + customer data).
. "$(dirname "$0")/lib.sh"
BACKUP_ROOT="${BACKUP_ROOT:?set BACKUP_ROOT outside the repo}"; mkdir -p "$BACKUP_ROOT"; not_in_git "$BACKUP_ROOT"
for t in psql pg_dump pg_restore sha256sum; do need $t; done
load_conn
srv_major=$(( $(q "show server_version_num" | head -1) / 10000 ))
[ "$(pg_major pg_dump)" -ge "$srv_major" ] || die "pg_dump older than server ($srv_major)"
TS=$(date -u +%Y%m%dT%H%M%SZ); OUT="$BACKUP_ROOT/greenland-$EXPECTED_REF-$TS"; mkdir -p "$OUT"; exec > >(tee -a "$OUT/backup.log") 2>&1
echo "Backup start $TS -> $OUT (no credentials are logged)"

q "$COUNT_SQL" > "$OUT/counts_before.tsv"
q "select rolname, rolsuper, rolcanlogin, rolbypassrls from pg_roles where rolname !~ '^pg_' order by 1" > "$OUT/roles_meta.tsv"   # names/flags only, no secrets
q "select id, name, public, file_size_limit, allowed_mime_types from storage.buckets order by 1" > "$OUT/storage_buckets.tsv" || warn "storage.buckets unreadable"
objs=$(q "select count(*) from storage.objects" | head -1 || echo unknown); echo "storage.objects rows: $objs" | tee "$OUT/storage_objects_count.txt"
[ "$objs" = "0" ] || warn "Storage has objects: download the actual files separately (docs/backup/BACKUP_PROCEDURE.md section 6)"

COMMON=(--no-owner --no-comments)    # ACLs/grants/RLS policies are KEPT (they are part of what we must be able to restore)
pg_dump "${COMMON[@]}" --schema-only -n public -f "$OUT/schema_public.sql"
pg_dump "${COMMON[@]}" --schema-only -n auth -n storage -n supabase_migrations -f "$OUT/schema_managed_REFERENCE_ONLY.sql" || warn "managed schema dump had errors (reference only)"
pg_dump "${COMMON[@]}" --data-only --format=custom -n public -f "$OUT/data_public.dump"
pg_dump "${COMMON[@]}" --data-only -n auth -n storage -n supabase_migrations -f "$OUT/data_managed.sql" || warn "managed data dump had errors; inspect backup.log"

q "$COUNT_SQL" > "$OUT/counts_after.tsv"
cmp -s "$OUT/counts_before.tsv" "$OUT/counts_after.tsv" || warn "row counts changed during export (writes occurred); re-run during a freeze"

cat > "$OUT/manifest.json" <<JSON
{"project_ref":"$EXPECTED_REF","created_utc":"$TS","server_major":$srv_major,"pg_dump":"$(pg_dump --version | tr -d '\n')",
 "files":"see SHA256SUMS","contains_customer_data":true,"counts":"counts_before.tsv / counts_after.tsv","restore_rehearsal":"not yet run"}
JSON
( cd "$OUT" && sha256sum $(ls | grep -v -E '^(SHA256SUMS|backup.log)$') > SHA256SUMS )
unset PGPASSWORD
echo "Done. NEXT: 20_verify.sh \"$OUT\"  then 40_restore_rehearsal.sh \"$OUT\"  then 30_encrypt.sh \"$OUT\""
