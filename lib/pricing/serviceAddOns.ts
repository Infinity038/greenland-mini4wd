// Boxed-kit service add-ons — docs/ASSEMBLY-SERVICE-WORKFLOW.md. These are
// services, never a second car SKU: choosing an add-on does not create
// inventory, and the car-kit stock count is reduced only for the underlying
// Boxed Kit (see lib/pricing/boxedKit.ts).
//
// Display Case is the one exception to "service, not a SKU" — it IS a real,
// physical, separately-stocked accessory (lib/pricing/displayCase.ts), sold
// either standalone (229 DKK, its own catalog card) or, as modeled here, as
// a car-order add-on at the bundled price (189 DKK). The 99 DKK flat price
// this field used to carry was a placeholder with no cost/margin basis
// behind it — corrected to the margin-verified bundled price.

import { DISPLAY_CASE_BUNDLED_PRICE_DKK } from './displayCase';

export type ServiceAddOnId = 'display_case' | 'standard_assembly' | 'ready_to_race_assembly';

export interface ServiceAddOnDefinition {
  id: ServiceAddOnId;
  label: string;
  defaultPriceDkk: number; // administrator-configurable; this is the default only
  isPhysicalStock: boolean; // true only for display_case, which has its own separate stock count
  includes: string[];
}

export const DEFAULT_SERVICE_ADDONS: Record<ServiceAddOnId, ServiceAddOnDefinition> = {
  display_case: {
    id: 'display_case',
    label: 'Display Case',
    defaultPriceDkk: DISPLAY_CASE_BUNDLED_PRICE_DKK, // 189 DKK — the bundled-with-a-car price
    isPhysicalStock: true,
    includes: ['A shared display case for the boxed kit (standalone price 229 DKK — this bundled price applies only inside a car order).'],
  },
  standard_assembly: {
    id: 'standard_assembly',
    label: 'Standard Assembly',
    defaultPriceDkk: 349,
    isPhysicalStock: false,
    includes: [
      'Complete assembly following the kit instructions',
      'Appropriate lubrication',
      'Installation of included motor and drivetrain',
      'Basic alignment',
      'Final tightening',
      'Functional check',
    ],
  },
  ready_to_race_assembly: {
    id: 'ready_to_race_assembly',
    label: 'Ready-to-Race Assembly',
    defaultPriceDkk: 449,
    isPhysicalStock: false,
    includes: [
      'Everything in Standard Assembly',
      'Drivetrain inspection',
      'Wheel and tire inspection',
      'Roller alignment',
      'Short functional test run',
      'Final race-readiness inspection',
    ],
  },
};

// Locked wording — never promise racing performance or guaranteed speed.
export const BUILD_TO_ORDER_MESSAGE = 'Built to order. Allow approximately 3–5 hours after confirmation.';

export function serviceAddOnPriceDkkOre(
  addOn: ServiceAddOnId,
  overridePriceDkk?: number
): number {
  const dkk = overridePriceDkk ?? DEFAULT_SERVICE_ADDONS[addOn].defaultPriceDkk;
  return Math.round(dkk * 100);
}
