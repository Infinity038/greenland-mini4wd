#!/usr/bin/env bash
# Read-only preflight: tools, versions, disk, connectivity. Writes nothing.
. "$(dirname "$0")/lib.sh"
BACKUP_ROOT="${BACKUP_ROOT:?set BACKUP_ROOT to an encrypted-disk folder OUTSIDE the repo}"
mkdir -p "$BACKUP_ROOT"; not_in_git "$BACKUP_ROOT"
for t in psql pg_dump pg_restore sha256sum tar; do need $t; done
command -v age >/dev/null || command -v gpg >/dev/null || die "need age or gpg for encryption"
avail_mb=$(df -Pm "$BACKUP_ROOT" | awk 'NR==2{print $4}'); [ "$avail_mb" -ge 1024 ] || die "need >=1 GB free in BACKUP_ROOT (have ${avail_mb} MB)"
load_conn
srv=$(q "show server_version_num" | head -1); srv_major=$((srv/10000))
[ "$srv_major" -eq "$EXPECTED_PG_MAJOR" ] || warn "server major is $srv_major (expected $EXPECTED_PG_MAJOR)"
[ "$(pg_major pg_dump)" -ge "$srv_major" ] || die "pg_dump $(pg_major pg_dump) is older than server $srv_major; install postgresql-client-$srv_major"
echo "OK: connected as ${PGUSER%%.*} to ref-matching host; server major $srv_major; pg_dump $(pg_major pg_dump); free ${avail_mb} MB"
echo "Public/auth/storage table list (names only):"; q "$COUNT_SQL" | cut -f1
