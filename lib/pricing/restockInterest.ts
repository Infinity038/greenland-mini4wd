// Restock-interest requests — docs/CATALOG-COSTING-AND-FREIGHT.md §5.
// Preview-only, in-memory mock store: submitting a restock-interest request
// (REQUEST RESTOCK / NOTIFY ME / REGISTER INTEREST) NEVER creates an order,
// NEVER reserves stock, and NEVER charges a payment — this module has zero
// coupling to lib/pricing/boxedKit.ts or any order-placement code, which is
// what actually guarantees that invariant rather than a runtime check.

export type ContactPreference = 'email' | 'sms' | 'in_app';
export type RestockInterestStatus = 'open' | 'fulfilled' | 'cancelled';

export interface RestockInterestRequest {
  id: string;
  productId: string;
  itemNo: string;
  racerId: string | null; // set when the requester is an authenticated racer
  contactPreference: ContactPreference;
  requestedQuantity: number;
  createdAt: string; // ISO
  status: RestockInterestStatus;
}

export interface SubmitRestockInterestInput {
  productId: string;
  itemNo: string;
  racerId?: string | null;
  contactPreference: ContactPreference;
  requestedQuantity?: number; // defaults to 1
}

export function createRestockInterestRequest(input: SubmitRestockInterestInput): RestockInterestRequest {
  if (input.requestedQuantity != null && input.requestedQuantity <= 0) {
    throw new Error('requestedQuantity must be positive');
  }
  return {
    id: `restock_${Math.random().toString(36).slice(2)}_${Date.now()}`,
    productId: input.productId,
    itemNo: input.itemNo,
    racerId: input.racerId ?? null,
    contactPreference: input.contactPreference,
    requestedQuantity: input.requestedQuantity ?? 1,
    createdAt: new Date().toISOString(),
    status: 'open',
  };
}

export class RestockInterestStore {
  private requests: RestockInterestRequest[] = [];

  submit(input: SubmitRestockInterestInput): RestockInterestRequest {
    const request = createRestockInterestRequest(input);
    this.requests.push(request);
    return request;
  }

  all(): readonly RestockInterestRequest[] {
    return this.requests;
  }

  forProduct(productId: string): readonly RestockInterestRequest[] {
    return this.requests.filter(r => r.productId === productId);
  }

  countForProduct(productId: string): number {
    return this.forProduct(productId).filter(r => r.status === 'open').length;
  }

  setStatus(requestId: string, status: RestockInterestStatus): void {
    const request = this.requests.find(r => r.id === requestId);
    if (request) request.status = status;
  }
}

// Shared Preview-only singleton so /shop (where requests are submitted) and
// the admin catalog-status view (where they are reviewed) see the same
// in-memory data within a session — a fresh instance per module load, reset
// on every server restart/rebuild, never persisted.
export const restockInterestStore = new RestockInterestStore();
