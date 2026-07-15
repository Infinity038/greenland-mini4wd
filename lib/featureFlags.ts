// Centralized feature flags. Do not scatter conditional constants across pages —
// every flag-gated page/route/nav item should read from here.
export const FEATURE_FLAGS = {
  openTournamentEnabled: process.env.NEXT_PUBLIC_OPEN_TOURNAMENT_ENABLED === 'true',

  // Discontinued per the Racer Profile business-rules refresh: time-based
  // membership (spend->days->expiry) and the digital ticket/stored-lives model
  // are being replaced by a free, non-expiring Racer Profile and venue-side
  // Race Entry/Second Life payments. Defaults to hidden/off; flipping either to
  // 'true' only restores the OLD explanatory copy for comparison/rollback — it
  // does not re-enable any removed backend behavior.
  legacyMembershipUiEnabled: process.env.NEXT_PUBLIC_LEGACY_MEMBERSHIP_UI_ENABLED === 'true',
  legacyDigitalTicketUiEnabled: process.env.NEXT_PUBLIC_LEGACY_DIGITAL_TICKET_UI_ENABLED === 'true',
} as const;
