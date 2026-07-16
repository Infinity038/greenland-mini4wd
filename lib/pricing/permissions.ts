// Pricing/campaign permission model — docs/PRICING-ADMIN-PERMISSIONS.md §16.
// Pure functions operating on a role passed in by the caller. This is
// deliberately NOT wired to Supabase Auth/RLS yet — until Phase 2/3 of
// supabase/migrations-proposed are approved and applied, there is no real
// session to check, so every admin route in this feature stays Preview-only
// (VERCEL_ENV === 'preview') and every "permission" here is enforced against
// a mock/seeded role selector, never a hardcoded password. Once Auth/RLS
// ships, these same rules become the RLS policies (see
// supabase/migrations-proposed/phase14_pricing_campaigns_forward.sql) and a
// server-side `has_staff_role()` check — this module's logic should not need
// to change, only its caller.

import type { CampaignType } from './campaign';

export type PricingStaffRole = 'admin' | 'shop_manager' | 'viewer';

export function canViewCampaignPreview(role: PricingStaffRole): boolean {
  return role === 'admin' || role === 'shop_manager' || role === 'viewer'; // all three roles may view a read-only preview
}

export function canChangeSupplierCost(role: PricingStaffRole): boolean {
  return role === 'admin';
}

export function canChangeExchangeRateSnapshot(role: PricingStaffRole): boolean {
  return role === 'admin';
}

export function canChangeShippingAllocation(role: PricingStaffRole): boolean {
  return role === 'admin';
}

export function canChangeRegularMarginPolicy(role: PricingStaffRole): boolean {
  return role === 'admin';
}

export function canModifyApprovedRegularPrice(role: PricingStaffRole): boolean {
  return role === 'admin';
}

export function canUseBelowCostOverride(role: PricingStaffRole): boolean {
  return role === 'admin';
}

// Shop Manager may create/manage Standard Sale campaigns within the
// approved (type-default or higher) margin floor only. Admin may create any
// campaign type, including Liquidation. Viewer may create none.
export function canCreateCampaign(role: PricingStaffRole, type: CampaignType, minimumAllowedMargin: number, typeDefaultFloor: number): boolean {
  if (role === 'viewer') return false;
  if (role === 'admin') return true;
  // shop_manager
  if (type !== 'standard_sale') return false;
  return minimumAllowedMargin >= typeDefaultFloor;
}

export function canApproveCampaign(role: PricingStaffRole): boolean {
  return role === 'admin';
}
