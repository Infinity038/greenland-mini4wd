#!/usr/bin/env bash
# Stage 1 prerequisite check (LOCAL ONLY, no cloud, no credentials).
# usage: BACKUP_ROOT=~/gm4wd-backups bash scripts/backup/tests/stage1_check.sh
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; REPO="$(cd "$HERE/../../.." && pwd)"
IMG="${SUPABASE_PG_IMAGE:-supabase/postgres:17.6.1.155}"
fail=0; ok() { echo "PASS  $*"; }; bad() { echo "FAIL  $*"; fail=1; }

echo "== environment =="
grep -qi microsoft /proc/version 2>/dev/null && ok "running inside WSL" || echo "INFO  not WSL (fine on native Linux)"
echo "INFO  repo commit $(git -C "$REPO" log -1 --format=%h)"

echo "== scripts =="
for f in "$REPO"/scripts/backup/*.sh "$REPO"/scripts/backup/tests/*.sh; do
  n=$(basename "$f")
  if grep -q $'\r' "$f"; then bad "$n has CRLF line endings (use a fresh WSL clone)"; continue; fi
  bash -n "$f" && ok "syntax $n" || bad "syntax $n"
done

echo "== tools =="
for t in psql pg_dump pg_restore pg_isready; do
  if command -v $t >/dev/null; then
    v=$($t --version | sed -E 's/.* ([0-9]+)[.0-9]*.*/\1/'); [ "$v" -ge 17 ] && ok "$t $v" || bad "$t is $v, need >=17"
  else bad "$t missing"; fi
done
for t in age age-keygen sha256sum tar docker git; do command -v $t >/dev/null && ok "$t present" || bad "$t missing"; done
docker info >/dev/null 2>&1 && ok "docker daemon reachable" || bad "docker daemon not reachable (Docker Desktop > Settings > Resources > WSL integration)"

echo "== backup destination =="
if [ -n "${BACKUP_ROOT:-}" ]; then
  mkdir -p "$BACKUP_ROOT" && chmod 700 "$BACKUP_ROOT"
  git -C "$BACKUP_ROOT" rev-parse >/dev/null 2>&1 && bad "BACKUP_ROOT is inside a git repo" || ok "BACKUP_ROOT outside git"
  case "$(cd "$BACKUP_ROOT" && pwd)" in "$REPO"*) bad "BACKUP_ROOT inside repo";; esac
  mb=$(df -Pm "$BACKUP_ROOT" | awk 'NR==2{print $4}'); [ "$mb" -ge 1024 ] && ok "free space ${mb} MB" || bad "free space ${mb} MB < 1024"
  echo "INFO  disk-at-rest encryption must be confirmed on Windows: Get-BitLockerVolume C:"
else bad "BACKUP_ROOT not set"; fi

echo "== image + production extensions in a fresh DB (disposable container) =="
if [ $fail -eq 0 ]; then
  docker image inspect "$IMG" >/dev/null 2>&1 || docker pull -q "$IMG" >/dev/null || bad "cannot pull $IMG"
  N="gl-stage1-ext-$$"; PW=$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n'); P="${STAGE1_PORT:-54327}"
  trap 'docker rm -f "$N" >/dev/null 2>&1 || true' EXIT
  docker run -d --name "$N" -e POSTGRES_PASSWORD="$PW" -p 127.0.0.1:$P:5432 "$IMG" >/dev/null
  export PGHOST=127.0.0.1 PGPORT=$P PGUSER=supabase_admin PGPASSWORD="$PW" PGDATABASE=postgres PGSSLMODE=disable
  for _ in $(seq 1 60); do pg_isready -q && break; sleep 2; done; sleep 3
  if pg_isready -q && psql -X -q -c "create database gl_extcheck template template0" >/dev/null 2>&1; then
    ok "image $IMG starts; supabase_admin login works"
    # production inventory (Ace, read-only): name version schema
    while read -r e v s; do
      out=$(psql -X -qAt -d gl_extcheck -v ON_ERROR_STOP=1 -c "create schema if not exists \"$s\"" \
            -c "create extension if not exists \"$e\" with schema \"$s\"" -c "select extversion from pg_extension where extname='$e'" 2>&1 | tail -1)
      [ "$out" = "$v" ] && ok "extension $e $v in $s" || bad "extension $e: expected $v in $s, got: $out"
    done <<'EXT'
pg_stat_statements 1.11 extensions
pgcrypto 1.3 extensions
uuid-ossp 1.1 extensions
supabase_vault 0.3.1 vault
EXT
  else bad "image did not start or supabase_admin login failed"; fi
else echo "SKIP  (fix FAIL items above first)"; fi

[ $fail -eq 0 ] && echo "STAGE 1 PREREQUISITES PASSED — next: bash scripts/backup/tests/synthetic_e2e.sh" || { echo "STAGE 1 PREREQUISITES FAILED"; exit 1; }
