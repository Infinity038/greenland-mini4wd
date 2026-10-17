#!/usr/bin/env bash
# READ-ONLY logical export of schema + data to BACKUP_ROOT. Run during a write freeze. Output is SENSITIVE (contains auth hashes + customer data).
. "$(dirname "$0")/lib.sh"
BACKUP_ROOT="${BACKUP_ROOT:?set BACKUP_ROOT outside the repo}"; mkdir -p "$BACKUP_ROOT"; not_in_git "$BACKUP_ROOT"
for t in psql pg_dump pg_restore sha256sum; do need $t; done
load_conn
srv_major=$(server_major)
[ "$(pg_major pg_dump)" -ge "$srv_major" ] || die "pg_dump older than server ($srv_major)"
TS=$(date -u +%Y%m%dT%H%M%SZ); OUT="$BACKUP_ROOT/greenland-$EXPECTED_REF-$TS"; mkdir -p "$OUT"; exec > >(tee -a "$OUT/backup.log") 2>&1
echo "Backup start $TS -> $OUT (no credentials are logged)"

q "$COUNT_SQL" > "$OUT/counts_before.tsv"
q "select rolname, rolsuper, rolcanlogin, rolbypassrls from pg_roles where rolname !~ '^pg_' order by 1" > "$OUT/roles_meta.tsv"   # names/flags only, no secrets
q "select id, name, public, file_size_limit, allowed_mime_types from storage.buckets order by 1" > "$OUT/storage_buckets.tsv"
objs=$(q "select count(*) from storage.objects" | head -1); [[ "$objs" =~ ^[0-9]+$ ]] || die "Storage object count not verified"; echo "storage.objects rows: $objs" | tee "$OUT/storage_objects_count.txt"
[ "$objs" = "0" ] || warn "Storage has objects: download the actual files separately (docs/backup/BACKUP_PROCEDURE.md section 6)"

q "$EXT_SQL" > "$OUT/extensions.tsv"           # extension names/versions/schemas (not dumped by -n)
q "$OBJ_SQL" > "$OUT/objects_before.tsv"       # structural inventory: RLS, policies, functions, triggers, constraints, grants

COMMON=(--no-owner --no-comments)    # ACLs/grants/RLS policies are KEPT (they are part of what we must be able to restore)
# Single schema dump across public + managed schemas: pg_dump orders cross-schema dependencies
# (e.g. a trigger on auth.users calling a public function) correctly.
pg_dump "${COMMON[@]}" --schema-only "${DUMP_SCHEMAS[@]}" -f "$OUT/schema_all.sql" || die "schema export failed; export incomplete"
# Single data dump = one consistent MVCC snapshot for public AND auth/storage/migrations.
pg_dump "${COMMON[@]}" --data-only --format=custom "${DUMP_SCHEMAS[@]}" -f "$OUT/data_all.dump" || die "data export failed; export incomplete"

q "$COUNT_SQL" > "$OUT/counts_after.tsv"
cmp -s "$OUT/counts_before.tsv" "$OUT/counts_after.tsv" || die "row counts changed during export; do not verify this inconsistent snapshot"

cat > "$OUT/manifest.json" <<JSON
{"project_ref":"$EXPECTED_REF","created_utc":"$TS","server_major":$srv_major,"pg_dump":"$(pg_dump --version | tr -d '\n')",
 "files":"see SHA256SUMS","contains_customer_data":true,"counts":"counts_before.tsv / counts_after.tsv","schema":"schema_all.sql","data":"data_all.dump","extensions":"extensions.tsv","objects":"objects_before.tsv","restore_rehearsal":"not yet run"}
JSON
( cd "$OUT" && for f in *; do case "$f" in SHA256SUMS|backup.log) ;; *) sha256sum -- "$f";; esac; done > SHA256SUMS )
unset PGPASSWORD
echo "Done. NEXT: 20_verify.sh \"$OUT\"  then 40_restore_rehearsal.sh \"$OUT\"  then 30_encrypt.sh \"$OUT\""
