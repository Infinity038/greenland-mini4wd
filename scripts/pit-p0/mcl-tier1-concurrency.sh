#!/usr/bin/env bash
# Disposable GitHub Actions Postgres service ONLY. No production credentials.
set -euo pipefail
: "$PGPASSWORD"
createdb -h 127.0.0.1 -U pit_test pit_concurrent
psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d pit_concurrent \
  -f scripts/pit-p0/mcl-tier1-concurrency-seed.sql >/dev/null
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Winner and Exact are different markets but share a player and a race.
# A 50-coin historical accepted ticket leaves capacity for ONE of them.
set +e
psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d pit_concurrent \
  -c "SELECT pp.mcl_place_ticket('00000000-0000-0000-0000-000000000101','M2',50,'concurrent-winner50')" \
  >"$tmp/winner.out" 2>&1 &
pid_a=$!
sleep 0.2
psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d pit_concurrent \
  -c "SELECT pp.mcl_place_ticket('00000000-0000-0000-0000-000000000102','M3:1',50,'concurrent-exact50')" \
  >"$tmp/exact.out" 2>&1 &
pid_b=$!
wait "$pid_a"; status_a=$?
wait "$pid_b"; status_b=$?
set -e

if ((status_a + status_b != 1)); then
  echo "Expected exactly one successful concurrent stake: $status_a $status_b"
  cat "$tmp/winner.out"
  cat "$tmp/exact.out"
  exit 1
fi
if ((status_a == 0)); then
  grep -q "P0 MCL combined participant limit exceeded" "$tmp/exact.out"
else
  grep -q "P0 MCL combined participant limit exceeded" "$tmp/winner.out"
fi
res="$(psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d pit_concurrent -tAc "
SELECT count(*)::text || ':' || coalesce(sum(stake),0)::text || ':' ||
  (select count(*) from pp.ledger)::text
FROM pp.mcl_tickets;")"
if [[ "$res" != "2:100:2" ]]; then
 echo "Expected seed+one accepted ticket and two mock wallet debits; got $res"
 exit 1
fi
echo "PASS: overlapping Winner/Exact stakes yielded ONE accepted ticket, ONE cap denial, no rejected wallet debit."
