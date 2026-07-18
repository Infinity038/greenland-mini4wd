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

  // BUSINESS DECISION: race entry is in-person only. Online race-ticket
  // purchasing (the Buy Ticket flow, ticket wallet, digital first/second lives,
  // ticket inventory) is discontinued — race entry and Second Life payments now
  // happen only at the venue during check-in. Defaults to false/off. Flipping to
  // 'true' is an emergency rollback that restores the OLD online purchase flow
  // exactly as it was — it does not create any new functionality.
  onlineRaceTicketsEnabled: process.env.NEXT_PUBLIC_ONLINE_RACE_TICKETS_ENABLED === 'true',

  // Pricing/campaign engine (docs/PRODUCT-PRICING-POLICY.md,
  // docs/SALE-CAMPAIGN-RULES.md). All four flags default to false/off in
  // every environment. Because Supabase Auth/staff roles/RLS are not yet
  // live (see docs/PHASED-SUPABASE-MIGRATION-PLAN.md), the admin pricing and
  // campaign UI is ALSO hard-gated to Preview only via
  // `process.env.VERCEL_ENV === 'preview'` (the same pattern as
  // app/admin/pos-camera-test) regardless of these flags — flipping a flag
  // to 'true' in Production does not expose the admin UI, it only controls
  // whether the flag-gated pieces render in Preview. See
  // docs/PRICING-ADMIN-PERMISSIONS.md §"Feature flags" for the full gating
  // model.
  pricingEngineEnabled: process.env.NEXT_PUBLIC_PRICING_ENGINE_ENABLED === 'true',
  saleCampaignsEnabled: process.env.NEXT_PUBLIC_SALE_CAMPAIGNS_ENABLED === 'true',
  assemblyServicesEnabled: process.env.NEXT_PUBLIC_ASSEMBLY_SERVICES_ENABLED === 'true',
  inventoryAgingEnabled: process.env.NEXT_PUBLIC_INVENTORY_AGING_ENABLED === 'true',

  // Supabase Auth admin login (docs/OWNER-BOOTSTRAP-AND-AUTH-ROLLOUT.md).
  // Defaults to false/off in every environment, including Production and
  // Preview, until explicitly set. While off, app/admin/login/page.tsx keeps
  // its current hardcoded-password behavior completely unchanged — flipping
  // this flag on is required before the Supabase Auth login screen renders
  // anywhere, and it is intended to be turned on in Preview first, never in
  // Production before the owner bootstrap (docs/OWNER-BOOTSTRAP-AND-AUTH-ROLLOUT.md)
  // has actually run.
  supabaseAuthEnabled: process.env.NEXT_PUBLIC_SUPABASE_AUTH_ENABLED === 'true',
} as const;
