import { describe, it, expect } from 'vitest';
import {
  createNewSale,
  scanProduct,
  scanPresetItem,
  attachRacer,
  applyLoyaltyReward,
  applyShopCredit,
  calculateSaleTotals,
  confirmSale,
  cancelSale,
  refundSale,
  type RacerSnapshot,
} from './posSale';
import { MOCK_PRODUCT_CATALOG, PRESET_POS_ITEMS } from './posCatalog';

const MOTOR = MOCK_PRODUCT_CATALOG.find(p => p.name === 'Hyper-Dash 3 Motor')!;
const WEEKLY_ENTRY = PRESET_POS_ITEMS.find(p => p.name === 'Weekly Entry')!;
const SNACK = PRESET_POS_ITEMS.find(p => p.name === 'Soft Drinks / Snacks')!;

const RACER: RacerSnapshot = {
  racerId: 'G4W-R-0047',
  displayName: 'J. Racer',
  photoUrl: null,
  loyaltyPoints: 42,
  shopCreditDkk: 100,
};

describe('posSale — scanning', () => {
  it('scanning products/services does not mutate stock or points', () => {
    let sale = createNewSale();
    sale = scanProduct(sale, MOTOR, 2);
    sale = scanPresetItem(sale, WEEKLY_ENTRY);
    expect(MOTOR.stockQuantity).toBe(4); // unchanged mock catalog stock
    const totals = calculateSaleTotals(sale);
    expect(totals.pointsToEarn).toBe(0); // no racer scanned yet — no points computed
  });

  it('supports scanning the Racer ID first or scanning products first — both orders work', () => {
    let saleRacerFirst = createNewSale();
    saleRacerFirst = attachRacer(saleRacerFirst, RACER);
    saleRacerFirst = scanProduct(saleRacerFirst, MOTOR, 1);

    let saleProductsFirst = createNewSale();
    saleProductsFirst = scanProduct(saleProductsFirst, MOTOR, 1);
    saleProductsFirst = attachRacer(saleProductsFirst, RACER);

    expect(calculateSaleTotals(saleRacerFirst)).toEqual(calculateSaleTotals(saleProductsFirst));
  });

  it('scanning a Racer ID is optional — a sale is valid with zero racer', () => {
    let sale = createNewSale();
    sale = scanProduct(sale, MOTOR, 1);
    expect(sale.racer).toBeNull();
    expect(() => calculateSaleTotals(sale)).not.toThrow();
  });

  it('an open-price preset item requires a staff-entered amount', () => {
    let sale = createNewSale();
    expect(() => scanPresetItem(sale, SNACK)).toThrow(/staff must enter/i);
    sale = scanPresetItem(sale, SNACK, { staffEnteredPriceDkk: 20 });
    expect(sale.lineItems[0].unitPriceDkk).toBe(20);
  });

  it('scanning the same product barcode twice increases quantity instead of duplicating the line', () => {
    let sale = createNewSale();
    sale = scanProduct(sale, MOTOR, 1);
    sale = scanProduct(sale, MOTOR, 1);
    expect(sale.lineItems).toHaveLength(1);
    expect(sale.lineItems[0].quantity).toBe(2);
  });
});

describe('posSale — points calculation', () => {
  it('calculates points as the eligible paid amount divided by 100', () => {
    let sale = createNewSale();
    sale = attachRacer(sale, RACER);
    sale = scanPresetItem(sale, WEEKLY_ENTRY); // 150 DKK
    const totals = calculateSaleTotals(sale);
    expect(totals.cashDueDkk).toBe(150);
    expect(totals.pointsToEarn).toBe(1.5);
  });

  it('a customer without a Racer Profile earns no Loyalty Points', () => {
    let sale = createNewSale();
    sale = scanPresetItem(sale, WEEKLY_ENTRY);
    const totals = calculateSaleTotals(sale);
    expect(totals.pointsToEarn).toBe(0);
  });

  it('the amount paid using Shop Credit does not earn new Loyalty Points', () => {
    let sale = createNewSale();
    sale = attachRacer(sale, RACER);
    sale = scanPresetItem(sale, WEEKLY_ENTRY); // 150 DKK
    sale = applyShopCredit(sale, 100);
    const totals = calculateSaleTotals(sale);
    expect(totals.cashDueDkk).toBe(50);
    expect(totals.pointsToEarn).toBe(0.5); // only the 50 DKK cash portion earns points
  });
});

describe('posSale — rewards and Shop Credit', () => {
  it('applying a loyalty reward requires a scanned Racer Profile', () => {
    let sale = createNewSale();
    sale = scanPresetItem(sale, WEEKLY_ENTRY);
    expect(() => applyLoyaltyReward(sale)).toThrow(/scan a racer profile/i);
  });

  it('applies the highest eligible reward tier and discounts the total', () => {
    let sale = createNewSale();
    sale = attachRacer(sale, { ...RACER, loyaltyPoints: 42 }); // eligible for the 25-point/50 DKK tier
    sale = scanPresetItem(sale, WEEKLY_ENTRY); // 150 DKK
    sale = applyLoyaltyReward(sale);
    const totals = calculateSaleTotals(sale);
    expect(totals.rewardDiscountDkk).toBe(50);
    expect(totals.cashDueDkk).toBe(100);
  });

  it('rejects Shop Credit beyond the racer\'s available balance', () => {
    let sale = createNewSale();
    sale = attachRacer(sale, RACER); // 100 DKK Shop Credit
    sale = scanPresetItem(sale, WEEKLY_ENTRY);
    expect(() => applyShopCredit(sale, 150)).toThrow(/exceeds/i);
  });

  it('rejects Shop Credit beyond the remaining sale total', () => {
    let sale = createNewSale();
    sale = attachRacer(sale, { ...RACER, shopCreditDkk: 500 });
    sale = scanPresetItem(sale, WEEKLY_ENTRY); // 150 DKK
    expect(() => applyShopCredit(sale, 200)).toThrow(/remaining sale total/i);
  });
});

describe('posSale — confirmation, stock, and audit trail', () => {
  it('stock changes only after payment confirmation, never on scan', () => {
    let sale = createNewSale();
    sale = scanProduct(sale, MOTOR, 3);
    sale = attachRacer(sale, RACER);
    const before = confirmSale(sale, 'key-1', new Set());
    expect(before.stockDeductions).toEqual([{ barcode: MOTOR.barcode, quantity: 3 }]);
    expect(MOTOR.stockQuantity).toBe(4); // the mock catalog record itself is never mutated by this reference layer
  });

  it('confirming a sale creates a receipt reference and an audit-log entry', () => {
    let sale = createNewSale();
    sale = scanPresetItem(sale, WEEKLY_ENTRY);
    sale = attachRacer(sale, RACER);
    const result = confirmSale(sale, 'key-2', new Set());
    expect(result.receiptReference).toMatch(/^RCPT-/);
    expect(result.auditLogEntry.action).toBe('sale_confirmed');
    expect(result.auditLogEntry.racerId).toBe(RACER.racerId);
  });

  it('confirming a sale awards points and creates a Points Activity entry for the scanned racer', () => {
    let sale = createNewSale();
    sale = scanPresetItem(sale, WEEKLY_ENTRY);
    sale = attachRacer(sale, RACER);
    const result = confirmSale(sale, 'key-3', new Set());
    expect(result.pointsAwarded).toBe(1.5);
    expect(result.pointsActivityEntry).not.toBeNull();
    expect(result.pointsActivityEntry?.pointsDelta).toBe(1.5);
  });

  it('a cancelled sale cannot be confirmed and awards no points', () => {
    let sale = createNewSale();
    sale = scanPresetItem(sale, WEEKLY_ENTRY);
    sale = cancelSale(sale);
    expect(() => confirmSale(sale, 'key-4', new Set())).toThrow(/only an open sale/i);
  });

  it('cannot confirm an empty sale', () => {
    const sale = createNewSale();
    expect(() => confirmSale(sale, 'key-5', new Set())).toThrow(/empty/i);
  });

  it('idempotency: the same payment confirmation key cannot award points twice', () => {
    let sale = createNewSale();
    sale = scanPresetItem(sale, WEEKLY_ENTRY);
    sale = attachRacer(sale, RACER);
    const processedKeys = new Set<string>();
    confirmSale(sale, 'shared-key', processedKeys);
    expect(() => confirmSale(sale, 'shared-key', processedKeys)).toThrow(/already been confirmed/i);
  });
});

describe('posSale — refunds', () => {
  it('refunding a confirmed sale restores stock and creates a visible point reversal', () => {
    let sale = createNewSale();
    sale = scanProduct(sale, MOTOR, 2);
    sale = attachRacer(sale, RACER);
    const confirmed = confirmSale(sale, 'key-refund-1', new Set());
    const refund = refundSale(confirmed);
    expect(refund.stockRestorations).toEqual([{ barcode: MOTOR.barcode, quantity: 2 }]);
    expect(refund.pointsReversal?.pointsDelta).toBeLessThan(0);
    expect(refund.pointsReversal?.pointsDelta).toBe(-confirmed.pointsActivityEntry!.pointsDelta);
    expect(refund.sale.status).toBe('refunded');
    expect(refund.auditLogEntry.action).toBe('sale_refunded');
  });

  it('only a confirmed sale can be refunded', () => {
    const sale = createNewSale();
    const fakeConfirmed = { sale, stockDeductions: [], pointsAwarded: 0, pointsActivityEntry: null, receiptReference: 'x', auditLogEntry: { id: 'x', action: 'sale_confirmed' as const, saleId: sale.id, racerId: null, timestamp: sale.createdAt } };
    expect(() => refundSale(fakeConfirmed)).toThrow(/only a confirmed sale/i);
  });

  it('a sale with no racer produces no points reversal on refund', () => {
    let sale = createNewSale();
    sale = scanProduct(sale, MOTOR, 1);
    const confirmed = confirmSale(sale, 'key-refund-2', new Set());
    const refund = refundSale(confirmed);
    expect(refund.pointsReversal).toBeNull();
  });
});
