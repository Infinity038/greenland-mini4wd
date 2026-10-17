#!/usr/bin/env bash
# Offline integrity checks on a plaintext backup folder. No DB connection.
. "$(dirname "$0")/lib.sh"
D="${1:?usage: 20_verify.sh <backup-dir>}"; cd "$D" || exit 1; fail=0
chk() { if eval "$2"; then echo "PASS  $1"; else echo "FAIL  $1"; fail=1; fi; }
for t in pg_restore sha256sum; do need $t; done
chk "checksums match"                          "sha256sum -c --quiet SHA256SUMS"
chk "data_all.dump readable by pg_restore"     "pg_restore --list data_all.dump >/dev/null"
chk "schema has public.members"                "grep -q 'CREATE TABLE public.members' schema_all.sql"
chk "schema has auth.users"                    "grep -q 'CREATE TABLE auth.users' schema_all.sql"
chk "schema has storage.objects"               "grep -q 'CREATE TABLE storage.objects' schema_all.sql"
chk "schema has RLS/grant state captured"      "grep -q 'ENABLE ROW LEVEL SECURITY' schema_all.sql && grep -q '^GRANT' schema_all.sql"
chk "dump includes auth.users data"            "pg_restore --list data_all.dump | grep -q 'TABLE DATA auth users '"
chk "extensions inventory present"             "[ -s extensions.tsv ]"
chk "object inventory present"                 "[ -s objects_before.tsv ]"
chk "counts stable during export"              "cmp -s counts_before.tsv counts_after.tsv"
# every table in counts (public/auth/storage/supabase_migrations) must have a TABLE DATA entry in the dump
pg_restore --list data_all.dump | awk '$4=="TABLE" && $5=="DATA" {print $6"."$7}' | sort -u > .dumped
cut -f1 counts_before.tsv | sort -u > .expected
chk "all counted tables present in dump"       "[ -z \"\$(comm -13 .dumped .expected)\" ]"
[ -z "$(comm -13 .dumped .expected)" ] || { echo "  missing from dump:"; comm -13 .dumped .expected | sed 's/^/    /'; }
chk "no connection strings/passwords in text outputs" "! grep -r -E -l 'postgres(ql)?://[^ ]+:[^ ]+@' manifest.json backup.log counts_*.tsv roles_meta.tsv extensions.tsv objects_before.tsv 2>/dev/null | grep -q ."
rm -f .dumped .expected
[ $fail -eq 0 ] && echo "ALL CHECKS PASSED" || { echo "SOME CHECKS FAILED"; exit 1; }
