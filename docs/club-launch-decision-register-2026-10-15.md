# Mini4WD club launch decision and release gates — 2026-10-15

This is a planning and implementation register, not permission to change live financial promises. The existing production site, customer account balances, tickets, sales, inventory and settled race results must be preserved.

## Decisions reflected in the preview

- Free website registration remains.
- Race day has ONE staff-controlled start line, a walk-in FIFO queue with equitable rotation, no random car placement, and no retrieval until marshal authorises a track stop.
- Introductory B-MAX demo is supervised and is **not** admission to a paid tournament. House demonstration cars remain club property.
- Public leaderboard picture is **optional**. Never display account legal name, email, ID documentation or non-opted-in avatar as a substitute. Render an avatar only after an explicit public photo opt-in; fallback to initial/icon. Public racer nickname should be separately consented to.
- Club refreshment planning: house coffee (offer/limits published per event), free potable tap water where available, bottled water, juice, soda, chips, packaged snacks. **No cigarette sales/promotion**.
- Advertise race dates by Facebook, TikTok, Instagram, YouTube and on-site event calendar. Social monetisation is upside, not operating cash-flow budget.
- Existing paid ticket prices (130 early bird / 150 weekly / 500 end-season) and all already announced prize promises stay unchanged until reviewed.

## Membership reconciliation gate (NOT implemented by this PR)

1. Preserve historical accounts and earned days (currently one membership day per 20 DKK qualifying spend), rank/coins benefits, and the existing punch-card policy for every ten paid eligible race tickets.
2. Model separate records: permanent free account; legacy earned membership-day balance; optional purchased Club Pass; loyalty history; one-time giveaway entitlement/redemption.
3. Decide prospectively how newly earned days work, whether qualifying pass purchases earn rewards, how unused days are honoured, how rewards are redeemed and when entitlements expire. Never double count historical benefits or remove earned credit without a documented transition.
4. Proposed *unapproved* introductory pricing to test after cost validation: 129 DKK/one month (no free car); 239/two months (small welcome extra); 349/three months (ONE selected Shelf-1 standard beginner kit). No B-MAX/special/collectors kit giveaway. Need actual landed inventory cost, stock reservation, cancellation/refund terms, guardian flows and payment verification before launch.
5. Redeem once per eligible person via staff approval and a database-enforced unique entitlement, not a browser-only check. Avoid ID copies, CPR or mandatory photograph.
6. Database RLS and least-privilege authenticated write operations required. This PR intentionally does not create financial tables: the Mini4WD Supabase project was not visible in the current connected project listing, so schema and policies could not be verified.

## Prize policy gate (NOT changed in this PR)

- Existing production tournament calculator commits 70% paid entry sales to prizes and 30% organiser. Keep for previously announced/sold events.
- Proposed policy for **new, separately published regular events**: prizes 35%, business 65%; separately approved championship/sponsor splits allowed. Check customer-facing rules, actual tickets, and staff costs before any migration. Do not retroactively reduce promised prize pools.
- Example 30 paid entries × 150 = 4500; 35% = 1575 prize; 65% = 2925 business before staff and all other event costs. Actual point-of-sale must use stored event-specific split, not a global hardcoded formula.

## Staff and sales governance gate (NOT implemented by this PR)

- Continue using the existing TimeLog app for clock-in/out if its records are verifiable/exportable; store job date, paid hours, breaks, Sunday +50 DKK/hour and approvals; do not build duplicate clock-in software.
- Staff POS should operate on a managed company laptop with unique named staff logins and hardware-backed device credentials / managed-device policy as feasible. Restricting by laptop browser/local storage or IP alone is not adequate.
- Server-verified roles and immutable timestamped event log: actor ID, register ID, session ID, sale/line item, payment method, discount/override, cancellation, refund, returns, manual inventory adjustments, cash count, handover and supervisor authorisation. Never log passwords, complete card details or unnecessary sensitive identity info.
- Owners may see finances, audit and stock; staff may record authorised POS transactions and track turns; supervisor approval for voids/refunds/price overrides. Daily signed till reconciliation and inventory exception report.
- Existing admin authentication and Supabase RLS require a targeted independent review before modifying the transactional tables.

## Venue and shared-use gate

- Initial confirmed operating schedule only; tentative Saturday/Sunday and future Thursday-Sunday hours must not be displayed as confirmed until real dates are approved.
- Municipality must approve area allocation/use, any applicable time limit, two-storey public assembly occupancy, structural design, accessible facilities, fire exits, sanitation, water, drainage and utilities **before** container purchase/fabrication. An area allocation is not ownership of the plot.
- Prefer ground-floor public/member assembly and track facilities at launch. Any upper level requires structural and fire/egress/accessibility approvals; single internal stair is not assumed sufficient. Silent Empire can use separately secured studio space on non-race days if authorisation and noise control allow.
- Cost-sharing between club and Silent Empire needs actual allocation evidence (submeters/equipment power draws and occupied usage periods), written agreement/invoicing between distinct legal entities where applicable. Do not book 70-80% of whole electricity/water to Silent Empire simply to transfer expenses without evidence.

## Promotion and QA

- Social channels advertise confirmed races; do not treat potential platform creator payouts as guaranteed cash flow.
- Film at consent-appropriate angles; guardian permission where relevant, and no public account PII.
- This branch intentionally changes only the visitor guide, preview-only leaderboard avatar rendering when opt-in public fields are present, unverified hero figures and navigation. It does NOT activate paid offers, mutate existing rewards, alter prize splits, record POS, install a device lock, deploy to production, or change Supabase data.
- QA: run existing repo test scripts; confirm free register, shop, tickets, race entries, old leaderboard, mobile navigation, new guide links and non-opted-in avatar fallback; check authenticated role/DB policies before a public photo field is introduced.
