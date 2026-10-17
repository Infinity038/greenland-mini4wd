#!/usr/bin/env bash
# Shared helpers. Source only. Never prints credentials; never writes inside a git work tree.
set -euo pipefail
umask 077
EXPECTED_REF="${EXPECTED_REF:-eojdjqihmxxaqltudqjx}"   # production greenland-mini4wd (non-secret)
EXPECTED_PG_MAJOR=17

die()  { echo "ERROR: $*" >&2; exit 1; }
warn() { echo "WARN: $*" >&2; }
need() { command -v "$1" >/dev/null 2>&1 || die "missing tool: $1 (see docs/backup/BACKUP_PROCEDURE.md)"; }

pg_major() { "$1" --version | sed -E 's/.* ([0-9]+)[.0-9]*.*/\1/'; }

# Connection comes from PG* env vars or silent prompts. Use the Supabase *session pooler* host if IPv6 is unavailable.
load_conn() {
  set +x
  [ -n "${PGHOST:-}" ] || read -r -p "DB host (Dashboard > Connect > Session pooler): " PGHOST
  PGUSER="${PGUSER:-postgres.${EXPECTED_REF}}"; PGPORT="${PGPORT:-5432}"; PGDATABASE="${PGDATABASE:-postgres}"
  [ -n "${PGPASSWORD:-}" ] || { read -r -s -p "DB password (input hidden): " PGPASSWORD; echo; }
  export PGHOST PGUSER PGPORT PGDATABASE PGPASSWORD PGSSLMODE=require
  case "${PGHOST}${PGUSER}" in *"$EXPECTED_REF"*) ;; *) die "host/user do not contain expected project ref; refusing (wrong project?)";; esac
}

# Read-only query helper: always wrapped in a READ ONLY transaction.
q() { psql -X -v ON_ERROR_STOP=1 -At -F $'\t' -c "BEGIN READ ONLY; $1; COMMIT;" | grep -v -E '^(BEGIN|COMMIT)$' || true; }

not_in_git() {
  git -C "$1" rev-parse --is-inside-work-tree >/dev/null 2>&1 && die "output dir $1 is inside a git work tree; choose a path outside any repo"
  return 0
}

COUNT_SQL="select table_schema||'.'||table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint
from information_schema.tables where table_schema in ('public','auth','storage','supabase_migrations') and table_type='BASE TABLE' order by 1"
