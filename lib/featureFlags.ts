// Centralized feature flags. Do not scatter conditional constants across pages —
// every flag-gated page/route/nav item should read from here.
export const FEATURE_FLAGS = {
  openTournamentEnabled: process.env.NEXT_PUBLIC_OPEN_TOURNAMENT_ENABLED === 'true',
} as const;
