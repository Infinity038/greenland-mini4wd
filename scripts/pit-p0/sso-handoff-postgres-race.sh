#!/usr/bin/env bash
# CI-only: synthetic member claim, no live credentials or existing Pit account writes.
set -euo pipefail
: "$PGPASSWORD"
createdb -h 127.0.0.1 -U pit_test pit_sso_disposable
psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d pit_sso_disposable \
 -f scripts/pit-p0/sso-handoff-postgres-seed.sql >/dev/null
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
# Calls use a trusted server-only mock role. Anon/auth user execution is
# independently forbidden by the SQL preflight. Both issue the identical
# verified nonce digest, exactly one should succeed.
sql="SET ROLE service_role; SELECT pp.p0_redeem_verified_handoff('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', repeat('d',64), clock_timestamp()+interval '30 seconds');"
set +e
psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d pit_sso_disposable -c "$sql" >"$tmp/a" 2>&1 &
a=$!
sleep 0.15
psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d pit_sso_disposable -c "$sql" >"$tmp/b" 2>&1 &
b=$!
wait "$a"; exit_a=$?
wait "$b"; exit_b=$?
set -e
if ((exit_a + exit_b != 1)); then
 echo "Expected exactly one one-time redemption, got $exit_a, $exit_b"
 cat "$tmp/a" "$tmp/b"; exit 1
fi
if ((exit_a == 0)); then
 grep -q "Handoff already redeemed" "$tmp/b"
else
 grep -q "Handoff already redeemed" "$tmp/a"
fi
state="$(psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d pit_sso_disposable -tAc "
 SELECT count(*)::text || ':' || (array_agg(player_id))[1]::text FROM pp.p0_handoff_redemptions;")"
[[ "$state" == "1:22222222-2222-4222-8222-222222222222" ]] || {
 echo "One-time handoff mislinked player: $state"; exit 1;
}
balances="$(psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d pit_sso_disposable -tAc "
 SELECT count(*)::text || ':' || sum(balance)::text
 FROM pp.wallet_accounts;")"
[[ "$balances" == "2:8100" ]] || {
 echo "Handoff corrupted legacy wallet inventory: $balances"; exit 1;
}
owner_unlinked="$(psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -U pit_test -d pit_sso_disposable -tAc "
 SELECT count(*) FROM pp.players
 WHERE id='11111111-1111-4111-8111-111111111111' AND member_id IS NULL;")"
[[ "$owner_unlinked" == "1" ]] || {
 echo "Unverified legacy owner was silently relinked"; exit 1;
}
echo "PASS: exactly one trusted redemption; no replay and no legacy wallet changes."
