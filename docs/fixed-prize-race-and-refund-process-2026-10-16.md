# Regular race: prospective fixed-prize operating procedure

Effective for **new regular weekly events created after this release only**. Preserve prior sold/advertised event terms and any existing event-specific prize obligations. The old percentage allocation is retained only as historical/internal data, never on general public marketing pages.

## Public offer
- One race requires at least **six distinct, verified paying racers** at the scheduled race start. Multiple cars owned by one person do not multiply the minimum-racer count or prize growth. A paid racer counts once.
- Six racers: **350 DKK total prize pool**; each additional distinct verified paying racer adds **25 DKK**. 15 qualifying racers: **575 DKK total**. This is a total fund, not an automatic payout to first place. Podium allocation must be set in the event notice before paid registration.
- Bonus, complimentary, trial and unpaid entries do not count towards the minimum or increase the cash prize. Only confirmed genuine payments are counted.
- The published event date/start time, ticket price, full prize and deferral/refund terms must be available before taking payments.
- If the minimum is not verified at scheduled race start, do not run the paid competition or announce winners. The organiser marks it POSTPONED, communicates the replacement date (next **announced** opening day), and gives affected paying racers a choice of (a) carrying their original entry to the replacement event or (b) requesting refund of their verified original event payment. If that date does not suit them, do not force carry-forward.

## Staff workflow for postponement/refunds (manual; no automated refund service exists)
1. Count unique payer identity (not number of cars or unverified ticket orders) against confirmed original payment records, ticket quantity and event registration; do not treat an uploaded screenshot by itself as confirmed payment.
2. Owner/staff confirms the minimum was missed. Change status to POSTPONED in admin. Record reason, old event date, next planned opening date, and notify entrants using the contact details already supplied for ticket fulfilment. Do not silently change dates.
3. For each affected paid entrant, record their selected remedy and original payment reference. For refunds, verify original transaction, amount, recipient, prior credits and whether any ticket was already consumed; have the authorised owner process the refund via the appropriate channel and retain a refund confirmation. Never claim an automated refund has occurred.
4. Record reconciliation/approval in the established company payment records. Update dates/status and published event details only after notice. An entry withdrawal button alone does not refund or initiate a refund.
5. If separate categories compete, publish whether the minimum applies event-wide or to the individual class BEFORE tickets are sold. The current approved policy is six **distinct paying racers per regular competition**, not six paid cars. No automatic count/payment validation has been deployed because Mini4WD Supabase is not accessible via the connected account.

## Release safeguards
- The public estimator is illustrative; ticket purchases currently are not intrinsically bound to a specific event at purchase time, and the current Supabase project has not been verified via the connector. Therefore the live frontend cannot independently certify the six-payment count, postpone races automatically, or issue money. Staff status and refund operations remain manual.
- Keep historic descriptions intact in storage. Public event copy strips the old internal allocation tag and displays that earlier terms still apply; written terms must remain available to customers who bought under them.
- No database migrations or existing ticket/race record mutations in this code release.
