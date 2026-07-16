// Grocery-style POS sale lifecycle: New Sale -> scan products/services -> scan
// Racer QR (either order, optional) -> apply reward/Shop Credit -> confirm
// payment. Pure/typed reference implementation — nothing here writes to a
// live table. Stock deduction, points award, receipt and audit-log creation
// only ever happen inside confirmSale(), and only once per idempotency key.
// This is a future database-dependent phase pending schema/RLS review.
import { calculateLoyaltyPoints } from './loyaltyPoints';
import { getAvailableReward, type RewardTier } from './loyaltyRoadmap';
import { isRaceServiceBarcode, type PosProduct, type PosPresetItem } from './posCatalog';
import { canRedeemRewards, type RacerAccountStatus } from './racerAccountStatus';
import type { PosEventRecord } from './posEventDirectory';

export type SaleStatus = 'open' | 'confirmed' | 'cancelled' | 'refunded';

export interface SaleLineItem {
  id: string;
  barcode: string;
  name: string;
  tamiyaItemNumber: string | null;
  unitPriceDkk: number;
  quantity: number;
  // Products deduct stock on confirmation; preset/service items never do.
  isStockTracked: boolean;
}

export interface RacerSnapshot {
  racerId: string;
  displayName: string;
  photoUrl: string | null;
  accountStatus: RacerAccountStatus;
  loyaltyPoints: number;
  shopCreditDkk: number;
}

export interface EventSnapshot {
  eventId: string;
  name: string;
  date: string;
  type: PosEventRecord['type'];
  pricingModel: PosEventRecord['pricingModel'];
}

export interface Sale {
  id: string;
  status: SaleStatus;
  lineItems: SaleLineItem[];
  racer: RacerSnapshot | null;
  event: EventSnapshot | null;
  appliedReward: RewardTier | null;
  shopCreditAppliedDkk: number;
  createdAt: string;
  confirmedAt: string | null;
  confirmationKey: string | null;
}

export interface SaleTotals {
  subtotalDkk: number;
  rewardDiscountDkk: number;
  shopCreditAppliedDkk: number;
  cashDueDkk: number;
  pointsToEarn: number;
}

export interface PointsActivityRecord {
  id: string;
  racerId: string;
  description: string;
  amountDkk: number;
  pointsDelta: number;
  date: string;
  reference: string;
}

export interface AuditLogEntry {
  id: string;
  action: 'sale_confirmed' | 'sale_refunded';
  saleId: string;
  racerId: string | null;
  timestamp: string;
}

export interface ConfirmedSaleResult {
  sale: Sale;
  stockDeductions: { barcode: string; quantity: number }[];
  pointsAwarded: number;
  pointsActivityEntry: PointsActivityRecord | null;
  receiptReference: string;
  auditLogEntry: AuditLogEntry;
}

export interface RefundResult {
  sale: Sale;
  stockRestorations: { barcode: string; quantity: number }[];
  pointsReversal: PointsActivityRecord | null;
  auditLogEntry: AuditLogEntry;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function assertOpen(sale: Sale): void {
  if (sale.status !== 'open') {
    throw new Error(`Sale is ${sale.status} — only an open sale can be changed.`);
  }
}

let saleSequence = 0;
export function createNewSale(): Sale {
  saleSequence += 1;
  return {
    id: `SALE-${Date.now()}-${saleSequence}`,
    status: 'open',
    lineItems: [],
    racer: null,
    event: null,
    appliedReward: null,
    shopCreditAppliedDkk: 0,
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    confirmationKey: null,
  };
}

// Scanning never mutates stock or points — it only adds a line item to the
// in-progress sale draft.
export function scanProduct(sale: Sale, product: PosProduct, quantity = 1): Sale {
  assertOpen(sale);
  const existing = sale.lineItems.find(li => li.barcode === product.barcode);
  const lineItems = existing
    ? sale.lineItems.map(li =>
        li.barcode === product.barcode ? { ...li, quantity: li.quantity + quantity } : li
      )
    : [
        ...sale.lineItems,
        {
          id: `${product.barcode}-${sale.lineItems.length}`,
          barcode: product.barcode,
          name: product.name,
          tamiyaItemNumber: product.tamiyaItemNumber,
          unitPriceDkk: product.unitPriceDkk,
          quantity,
          isStockTracked: true,
        },
      ];
  return { ...sale, lineItems };
}

export function scanPresetItem(
  sale: Sale,
  preset: PosPresetItem,
  opts?: { quantity?: number; staffEnteredPriceDkk?: number }
): Sale {
  assertOpen(sale);
  const unitPriceDkk = preset.unitPriceDkk ?? opts?.staffEnteredPriceDkk;
  if (unitPriceDkk == null) {
    throw new Error(`${preset.name} is an open-price item — staff must enter an amount.`);
  }
  const quantity = opts?.quantity ?? 1;
  return {
    ...sale,
    lineItems: [
      ...sale.lineItems,
      {
        id: `${preset.barcode}-${sale.lineItems.length}`,
        barcode: preset.barcode,
        name: preset.name,
        tamiyaItemNumber: null,
        unitPriceDkk,
        quantity,
        isStockTracked: false,
      },
    ],
  };
}

// May be called before or after scanning products/services — order is not enforced.
export function attachRacer(sale: Sale, racer: RacerSnapshot): Sale {
  assertOpen(sale);
  return { ...sale, racer };
}

// Clears the attached racer along with any reward/credit that depended on
// their balance — the totals preview returns to zero points automatically
// since calculateSaleTotals() only awards points when a racer is attached.
export function removeRacer(sale: Sale): Sale {
  assertOpen(sale);
  return { ...sale, racer: null, appliedReward: null, shopCreditAppliedDkk: 0 };
}

// Scanning an Event QR selects the current event context so a payment can
// never be recorded against the wrong event. May be attached before or after
// scanning products/services or a racer.
export function attachEvent(sale: Sale, event: EventSnapshot): Sale {
  assertOpen(sale);
  return { ...sale, event };
}

export function removeEvent(sale: Sale): Sale {
  assertOpen(sale);
  return { ...sale, event: null };
}

// A sale containing a race-related service (entry/second life) requires an
// attached Active Racer Profile and a selected event before it can be
// confirmed — enforced in confirmSale(), not just as a soft warning.
export function hasUnmetRaceServiceRequirements(sale: Sale): boolean {
  const hasRaceService = sale.lineItems.some(li => isRaceServiceBarcode(li.barcode));
  if (!hasRaceService) return false;
  return !sale.racer || sale.racer.accountStatus !== 'Active' || !sale.event;
}

function calculateSubtotal(sale: Sale): number {
  return round2(sale.lineItems.reduce((sum, li) => sum + li.unitPriceDkk * li.quantity, 0));
}

// `specificReward` is used by the Redemption QR flow, which redeems the one
// reward tied to that token rather than "whatever is highest available" —
// the permanent Racer QR never drives this path (see lib/posRedemption.ts).
export function applyLoyaltyReward(sale: Sale, specificReward?: RewardTier): Sale {
  assertOpen(sale);
  if (!sale.racer) throw new Error('Scan a Racer Profile before applying a loyalty reward.');
  if (!canRedeemRewards(sale.racer.accountStatus)) throw new Error(`A ${sale.racer.accountStatus} account cannot redeem rewards.`);
  if (sale.appliedReward) throw new Error('A loyalty reward has already been applied to this sale.');
  if (specificReward) {
    if (sale.racer.loyaltyPoints < specificReward.points) throw new Error('This racer no longer has enough points for this reward.');
    return { ...sale, appliedReward: specificReward };
  }
  const reward = getAvailableReward(sale.racer.loyaltyPoints);
  if (!reward) throw new Error('This racer has no eligible loyalty reward.');
  return { ...sale, appliedReward: reward };
}

export function applyShopCredit(sale: Sale, amountDkk: number): Sale {
  assertOpen(sale);
  if (!sale.racer) throw new Error('Scan a Racer Profile before applying Shop Credit.');
  if (amountDkk <= 0) throw new Error('Shop Credit amount must be greater than zero.');
  if (amountDkk > sale.racer.shopCreditDkk) throw new Error("Amount exceeds the racer's available Shop Credit.");
  const remainingAfterReward = Math.max(0, calculateSubtotal(sale) - (sale.appliedReward?.discountDkk ?? 0));
  if (amountDkk > remainingAfterReward) throw new Error('Shop Credit cannot exceed the remaining sale total.');
  return { ...sale, shopCreditAppliedDkk: amountDkk };
}

export function calculateSaleTotals(sale: Sale): SaleTotals {
  const subtotalDkk = calculateSubtotal(sale);
  const rewardDiscountDkk = sale.appliedReward?.discountDkk ?? 0;
  const afterReward = Math.max(0, round2(subtotalDkk - rewardDiscountDkk));
  const shopCreditAppliedDkk = Math.min(sale.shopCreditAppliedDkk, afterReward);
  const cashDueDkk = round2(afterReward - shopCreditAppliedDkk);
  // Points are earned only on the cash-paid portion — never on the Shop
  // Credit portion, and never at all without a scanned Racer Profile.
  const pointsToEarn = sale.racer ? calculateLoyaltyPoints(cashDueDkk) : 0;
  return { subtotalDkk, rewardDiscountDkk, shopCreditAppliedDkk, cashDueDkk, pointsToEarn };
}

// `processedKeys` is caller-owned (e.g. a Set backed by a unique DB constraint
// in the real system) so idempotency is testable without module-level state.
export function confirmSale(
  sale: Sale,
  idempotencyKey: string,
  processedKeys: Set<string>
): ConfirmedSaleResult {
  if (sale.status !== 'open') throw new Error('Only an open sale can be confirmed.');
  if (sale.lineItems.length === 0) throw new Error('Cannot confirm an empty sale.');
  if (hasUnmetRaceServiceRequirements(sale)) {
    throw new Error('Race-related services require an attached Active Racer Profile and a selected event before payment can be confirmed.');
  }
  if (processedKeys.has(idempotencyKey)) {
    throw new Error('This payment has already been confirmed — points cannot be awarded twice.');
  }
  processedKeys.add(idempotencyKey);

  const totals = calculateSaleTotals(sale);
  const confirmedAt = new Date().toISOString();
  const confirmedSale: Sale = { ...sale, status: 'confirmed', confirmedAt, confirmationKey: idempotencyKey };

  const stockDeductions = sale.lineItems
    .filter(li => li.isStockTracked)
    .map(li => ({ barcode: li.barcode, quantity: li.quantity }));

  const receiptReference = `RCPT-${idempotencyKey}`;

  const pointsActivityEntry: PointsActivityRecord | null = sale.racer
    ? {
        id: `PA-${idempotencyKey}`,
        racerId: sale.racer.racerId,
        description: 'POS Sale',
        amountDkk: totals.cashDueDkk,
        pointsDelta: totals.pointsToEarn,
        date: confirmedAt,
        reference: receiptReference,
      }
    : null;

  const auditLogEntry: AuditLogEntry = {
    id: `AUDIT-${idempotencyKey}`,
    action: 'sale_confirmed',
    saleId: sale.id,
    racerId: sale.racer?.racerId ?? null,
    timestamp: confirmedAt,
  };

  return {
    sale: confirmedSale,
    stockDeductions,
    pointsAwarded: totals.pointsToEarn,
    pointsActivityEntry,
    receiptReference,
    auditLogEntry,
  };
}

export function cancelSale(sale: Sale): Sale {
  if (sale.status !== 'open') throw new Error('Only an open sale can be cancelled.');
  return { ...sale, status: 'cancelled' };
}

export function refundSale(confirmed: ConfirmedSaleResult): RefundResult {
  const { sale } = confirmed;
  if (sale.status !== 'confirmed') throw new Error('Only a confirmed sale can be refunded.');
  const refundedAt = new Date().toISOString();
  const refundedSale: Sale = { ...sale, status: 'refunded' };

  const pointsReversal: PointsActivityRecord | null = confirmed.pointsActivityEntry
    ? {
        ...confirmed.pointsActivityEntry,
        id: `${confirmed.pointsActivityEntry.id}-REV`,
        description: 'POS Sale Refund',
        amountDkk: -confirmed.pointsActivityEntry.amountDkk,
        pointsDelta: -confirmed.pointsActivityEntry.pointsDelta,
        date: refundedAt,
      }
    : null;

  const auditLogEntry: AuditLogEntry = {
    id: `AUDIT-${sale.confirmationKey}-REFUND`,
    action: 'sale_refunded',
    saleId: sale.id,
    racerId: sale.racer?.racerId ?? null,
    timestamp: refundedAt,
  };

  return { sale: refundedSale, stockRestorations: confirmed.stockDeductions, pointsReversal, auditLogEntry };
}
