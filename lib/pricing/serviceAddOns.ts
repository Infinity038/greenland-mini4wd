// Boxed-kit service add-ons — docs/ASSEMBLY-SERVICE-WORKFLOW.md. These are
// services, never a second car SKU: choosing an add-on does not create
// inventory, and the car-kit stock count is reduced only for the underlying
// Boxed Kit (see lib/pricing/boxedKit.ts).

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
    defaultPriceDkk: 99,
    isPhysicalStock: true,
    includes: ['A display case for the assembled or boxed kit.'],
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
