#!/usr/bin/env bash
# Disposable GitHub Actions PostgreSQL only. No hosted Supabase credentials.
set -euo pipefail
: "$PGPASSWORD"
createdb -h 127.0.0.1 -U pit_test pit_reserve_race
psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d pit_reserve_race \
  -f scripts/pit-p0/mini4wd-concurrent-reserve-seed.sql >/dev/null
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
set +e
psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d pit_reserve_race \
  -c "SELECT pp.m4_place_bet('00000000-0000-0000-0000-000000000005','10000000-0000-0000-0005-000000000001',25,40,'concurrent-m4-heat5')" \
  >"$tmp/h5" 2>&1 &
a=$!
sleep 0.2
psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d pit_reserve_race \
  -c "SELECT pp.m4_place_bet('00000000-0000-0000-0000-000000000006','10000000-0000-0000-0006-000000000001',25,40,'concurrent-m4-heat6')" \
  >"$tmp/h6" 2>&1 &
b=$!
wait "$a"; first=$?
wait "$b"; second=$?
set -e
if ((first + second != 1)); then
 echo "FAIL: exactly one of two overlapping heat stakes should succeed: $first, $second"
 cat "$tmp/h5"; cat "$tmp/h6"; exit 1
fi
if ((first == 0)); then
 grep -q "P0 Mini4WD combined downside limit exceeded" "$tmp/h6"
else
 grep -q "P0 Mini4WD combined downside limit exceeded" "$tmp/h5"
fi
count="$(psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d pit_reserve_race -tAc "
 SELECT count(*)::text || ':' || sum(stake)::text || ':' ||
  (SELECT count(*) FROM pp.ledger)::text
 FROM pp.m4_bets;")"
[[ "$count" == "3:75:3" ]] || { echo "FAIL: expected 3 accepted tickets and 3 wallet debits; got $count"; exit 1; }
reserve="$(psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d pit_reserve_race -tAc "
 SELECT settled_free_reserve FROM pp.p0_operator_reserve WHERE scope='mini4wd';")"
[[ "$reserve" == "30000" ]] || { echo "FAIL: unsettled accepted stakes must not be falsely recognized as operator income: $reserve"; exit 1; }
echo "PASS: concurrent heats respect shared 3,000 risk cap, preserve funding, no second debit."
