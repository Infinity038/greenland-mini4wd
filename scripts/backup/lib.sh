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
  # TLS is mandatory for any remote host; only a loopback synthetic test source may run without it.
  case "$PGHOST" in 127.0.0.1|localhost) PGSSLMODE="${PGSSLMODE:-prefer}";; *) PGSSLMODE=require;; esac
  export PGHOST PGUSER PGPORT PGDATABASE PGPASSWORD PGSSLMODE
  case "${PGHOST}${PGUSER}" in *"$EXPECTED_REF"*) ;; *) die "host/user do not contain expected project ref; refusing (wrong project?)";; esac
}

# Read-only query helper: SQL failure must propagate; no error suppression.
server_major() { local v; v=$(q "show server_version_num" | head -1); [[ "$v" =~ ^[0-9]+$ ]] || die "could not read server version (connection failed?)"; echo $((v/10000)); }

q() { psql -X -qAt -v ON_ERROR_STOP=1 -F $'\t' -c "BEGIN TRANSACTION READ ONLY; $1; COMMIT;"; }

not_in_git() {
  git -C "$1" rev-parse --is-inside-work-tree >/dev/null 2>&1 && die "output dir $1 is inside a git work tree; choose a path outside any repo"
  return 0
}

COUNT_SQL="select table_schema||'.'||table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint
from information_schema.tables where table_schema in ('public','auth','storage','supabase_migrations') and table_type='BASE TABLE' order by 1"

# Schemas captured by the backup (one pg_dump = one consistent snapshot, dependency-ordered across schemas).
DUMP_SCHEMAS=(-n public -n auth -n storage -n supabase_migrations)

# Extensions are NOT included by schema-scoped pg_dump; record them so the rehearsal can recreate them.
EXT_SQL="select e.extname, e.extversion, n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace order by 1"

# Structural inventory (names/flags only; no row data). Owner-independent so --no-owner restores compare cleanly.
OBJ_SQL="with s(n) as (values ('public'),('auth'),('storage'),('supabase_migrations'))
select 'rls', n.nspname||'.'||c.relname||' enabled='||c.relrowsecurity||' forced='||c.relforcerowsecurity
  from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in (select n from s) and c.relkind in ('r','p')
union all select 'policy', schemaname||'.'||tablename||'.'||policyname||' '||cmd||' '||array_to_string(roles,',') from pg_policies where schemaname in (select n from s)
union all select 'function', n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||') secdef='||p.prosecdef
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in (select n from s)
  and not exists (select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
union all select 'trigger', n.nspname||'.'||c.relname||'.'||t.tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
  where not t.tgisinternal and n.nspname in (select n from s)
union all select 'constraint', n.nspname||'.'||c.relname||'.'||k.conname||' '||k.contype::text from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in (select n from s)
union all select 'grant', n.nspname||'.'||c.relname||' '||coalesce(r.rolname,'PUBLIC')||' '||a.privilege_type
  from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(c.relacl) a left join pg_roles r on r.oid=a.grantee
  where n.nspname in (select n from s) and c.relkind in ('r','p','v','m','S') and a.grantee<>c.relowner
order by 1,2"
