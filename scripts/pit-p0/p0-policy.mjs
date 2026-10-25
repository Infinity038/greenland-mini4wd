/** Owner-approved P0 limits, 2026-10-24 Nuuk. NO production authority.
 * These constants are policy ceilings, NOT evidence of a funded operator
 * reserve or live atomic enforcement. Production must read an authenticated
 * server-side policy and reject requests if a gate is missing. */
export const P0_POLICY = Object.freeze({
  version: 'owner-approved-2026-10-24',
  tier: 1,
  initialOperatorReserve: 30_000,
  automaticTierUpgrade: false,
  mcl: Object.freeze({
    winnerTicketMax: 50,
    positionTicketMax: 50,
    racePlayerCombinedMax: 100,
    championTicketMax: 25,
    championSeasonPlayerMax: 100,
    fundedPrizeNumerator: 40,
    fundedPrizeDenominator: 100,
    championReturnCap: 8,
    winnerReturnCap: 2,
    positionReturnCap: 3,
  }),
  mini4wd: Object.freeze({
    winnerTicketMax: 25,
    podiumTicketMax: 25,
    playerHeatCombinedMax: 100,
  }),
  risk: Object.freeze({
    eventNetDownsideMax: 1_000,
    combinedUnsettledNetDownsideMax: 3_000,
  }),
  settlement: Object.freeze({
    organizerVoidRefundPercent: 100,
    unclaimedChampionDisposition: 'operator-after-official-settlement-no-rollover',
    postSettlementCorrections: 'owner-controlled-compensating-ledger-only',
  }),
});
