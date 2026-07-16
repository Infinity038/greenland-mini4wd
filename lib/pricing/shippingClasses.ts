// Fixed shipping-cost classes (docs/CATALOG-COSTING-AND-FREIGHT.md §2).
// Every product is assigned exactly one class; an administrator may override
// the class or the allocated amount for an exceptional product, but every
// override must be recorded in the pricing audit history (see
// lib/pricing/auditLog.ts) and shown to the admin as a warning, never applied
// silently.

export type ShippingClass = 'small_part' | 'boxed_body_chassis' | 'bulky_upgrade' | 'complete_car_kit';

export interface ShippingClassDefinition {
  id: ShippingClass;
  label: string;
  allocatedDkk: number;
  description: string;
}

export const SHIPPING_CLASSES: Record<ShippingClass, ShippingClassDefinition> = {
  small_part: {
    id: 'small_part',
    label: 'Small Part',
    allocatedDkk: 25,
    description:
      'Motors, rollers, FRP and carbon plates, gears, shafts, bearings, wheels, tires, brakes, dampers, screws, spacers, normal upgrade parts, loose small replacement components.',
  },
  boxed_body_chassis: {
    id: 'boxed_body_chassis',
    label: 'Boxed Body/Chassis Set',
    allocatedDkk: 35,
    description:
      'Boxed body sets, boxed chassis sets, replacement body/chassis kits, and products larger than a normal upgrade package but smaller than a complete Mini 4WD kit.',
  },
  bulky_upgrade: {
    id: 'bulky_upgrade',
    label: 'Bulky Upgrade',
    allocatedDkk: 50,
    description: 'Large tune-up sets, unusually bulky upgrade packages, large tool or maintenance sets.',
  },
  complete_car_kit: {
    id: 'complete_car_kit',
    label: 'Complete Car Kit',
    allocatedDkk: 80,
    description: 'Complete boxed Mini 4WD kits, complete Starter Packs.',
  },
};

export function shippingAllocationDkkOre(shippingClass: ShippingClass): number {
  return SHIPPING_CLASSES[shippingClass].allocatedDkk * 100;
}
