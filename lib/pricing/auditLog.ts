// Append-only pricing/campaign audit trail — docs/PRICING-ADMIN-PERMISSIONS.md
// §17. This module is pure/in-memory; the Preview admin UI uses
// `PricingAuditLog` as a mock store (see lib/pricing/campaignStore.ts). Once
// Phase 3/13+ of the Supabase migration plan is live, the same event shape
// is written to the real `pricing_audit_events` table via a SECURITY
// DEFINER function — never a direct client INSERT, matching every other
// ledger/audit table in this project.

export type PricingAuditEventType =
  | 'supplier_cost_change'
  | 'exchange_rate_change'
  | 'shipping_class_change'
  | 'shipping_override'
  | 'landed_cost_recalculation'
  | 'regular_price_change'
  | 'price_override'
  | 'campaign_created'
  | 'campaign_edited'
  | 'campaign_activated'
  | 'campaign_deactivated'
  | 'campaign_approved'
  | 'margin_floor_override'
  | 'below_cost_override'
  | 'product_excluded'
  | 'inventory_converted_to_club_asset';

export interface PricingAuditEvent {
  id: string;
  type: PricingAuditEventType;
  actorUserId: string;
  timestamp: string; // ISO
  previousValue: unknown;
  newValue: unknown;
  reason: string;
  affectedProductId?: string;
  affectedCampaignId?: string;
  sourceContext: string; // e.g. "admin campaign preview", "admin product cost form"
}

export function createAuditEvent(input: Omit<PricingAuditEvent, 'id' | 'timestamp'>): PricingAuditEvent {
  return {
    ...input,
    id: `audit_${Math.random().toString(36).slice(2)}_${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
}

// In-memory, append-only. `record()` is the only way to add an entry —
// there is deliberately no update/remove method, mirroring the real
// audit_log table's RLS (no UPDATE/DELETE policy for anyone).
export class PricingAuditLog {
  private events: PricingAuditEvent[] = [];

  record(input: Omit<PricingAuditEvent, 'id' | 'timestamp'>): PricingAuditEvent {
    const event = createAuditEvent(input);
    this.events.push(event);
    return event;
  }

  all(): readonly PricingAuditEvent[] {
    return this.events;
  }

  forProduct(productId: string): readonly PricingAuditEvent[] {
    return this.events.filter(e => e.affectedProductId === productId);
  }

  forCampaign(campaignId: string): readonly PricingAuditEvent[] {
    return this.events.filter(e => e.affectedCampaignId === campaignId);
  }
}
