#!/usr/bin/env bash
# Offline integrity checks on a plaintext backup folder. No DB connection.
. "$(dirname "$0")/lib.sh"
D="${1:?usage: 20_verify.sh <backup-dir>}"; cd "$D"; fail=0
chk() { if eval "$2"; then echo "PASS  $1"; else echo "FAIL  $1"; fail=1; fi; }
for t in pg_restore sha256sum; do need $t; done
chk "checksums match"                         "sha256sum -c --quiet SHA256SUMS"
chk "data_public.dump readable by pg_restore" "pg_restore --list data_public.dump >/dev/null"
chk "schema_public.sql has tables"            "grep -q 'CREATE TABLE public.members' schema_public.sql"
chk "schema has RLS/grant state captured"     "grep -q -E 'GRANT|ENABLE ROW LEVEL SECURITY' schema_public.sql"
chk "managed data includes auth.users COPY"   "grep -q 'COPY auth.users' data_managed.sql"
chk "counts stable during export"             "cmp -s counts_before.tsv counts_after.tsv"
# every public table with rows in counts must have a TABLE DATA entry in the dump
pg_restore --list data_public.dump | awk '/TABLE DATA public/{print "public."$(NF-1)}' | sort > .dumped
awk -F'\t' '$1 ~ /^public\./ {print $1}' counts_before.tsv | sort > .expected
chk "all public tables present in dump"       "[ -z \"\$(comm -13 .dumped .expected)\" ]"
chk "no connection strings/passwords in text outputs" "! grep -r -E -l 'postgres(ql)?://[^ ]+:[^ ]+@' manifest.json backup.log counts_*.tsv roles_meta.tsv 2>/dev/null | grep -q ."
rm -f .dumped .expected
[ $fail -eq 0 ] && echo "ALL CHECKS PASSED" || { echo "SOME CHECKS FAILED"; exit 1; }
