import { describe, it, expect } from 'vitest';
import { derivePublicState, PUBLIC_STATE_DISPLAY, type PublicStateInput } from './publicProductState';

function makeInput(overrides: Partial<PublicStateInput> = {}): PublicStateInput {
  return {
    catalogVisible: true,
    pricingSource: 'board_approved_fixed_price',
    stockQty: 0,
    catalogTier: 'core',
    isPreorderEnabled: false,
    forceComingSoon: false,
    ...overrides,
  };
}

describe('publicProductState — derivation', () => {
  it('ARCHIVED when catalogVisible is false, regardless of other fields', () => {
    expect(derivePublicState(makeInput({ catalogVisible: false, stockQty: 5 }))).toBe('ARCHIVED');
  });

  it('COMING_SOON when explicitly forced, even with an approved price', () => {
    expect(derivePublicState(makeInput({ forceComingSoon: true, stockQty: 10 }))).toBe('COMING_SOON');
  });

  it('PRICE_PENDING for an unverified pricing source (never hidden, never a fallback price)', () => {
    expect(derivePublicState(makeInput({ pricingSource: 'unverified', stockQty: 5 }))).toBe('PRICE_PENDING');
  });

  it('SPECIAL_ORDER for a priced special_order-tier product', () => {
    expect(derivePublicState(makeInput({ catalogTier: 'special_order' }))).toBe('SPECIAL_ORDER');
  });

  it('PREORDER when explicitly enabled by an administrator', () => {
    expect(derivePublicState(makeInput({ isPreorderEnabled: true }))).toBe('PREORDER');
  });

  it('IN_STOCK for a priced, non-special-order product with stock', () => {
    expect(derivePublicState(makeInput({ stockQty: 3 }))).toBe('IN_STOCK');
  });

  it('OUT_OF_STOCK for a priced, non-special-order product with zero stock (never hidden)', () => {
    expect(derivePublicState(makeInput({ stockQty: 0 }))).toBe('OUT_OF_STOCK');
  });

  it('Expansion Stock tier alone does not change the derived state', () => {
    expect(derivePublicState(makeInput({ catalogTier: 'expansion', stockQty: 0 }))).toBe('OUT_OF_STOCK');
    expect(derivePublicState(makeInput({ catalogTier: 'expansion', stockQty: 2 }))).toBe('IN_STOCK');
  });
});

describe('publicProductState — display mapping', () => {
  it('OUT_OF_STOCK disables purchase and offers REQUEST RESTOCK', () => {
    const d = PUBLIC_STATE_DISPLAY.OUT_OF_STOCK;
    expect(d.isPurchasable).toBe(false);
    expect(d.ctaLabel).toBe('REQUEST RESTOCK');
    expect(d.allowsRestockInterest).toBe(true);
    expect(d.showPrice).toBe(true); // shows the last approved price
  });

  it('PRICE_PENDING never shows a price and disables checkout entirely', () => {
    const d = PUBLIC_STATE_DISPLAY.PRICE_PENDING;
    expect(d.showPrice).toBe(false);
    expect(d.isPurchasable).toBe(false);
    expect(d.ctaAction).toBe('restock_interest');
  });

  it('SPECIAL_ORDER is never directly purchasable — only REGISTER INTEREST', () => {
    const d = PUBLIC_STATE_DISPLAY.SPECIAL_ORDER;
    expect(d.isPurchasable).toBe(false);
    expect(d.ctaLabel).toBe('REGISTER INTEREST');
  });

  it('IN_STOCK is purchasable with a normal Reserve action', () => {
    const d = PUBLIC_STATE_DISPLAY.IN_STOCK;
    expect(d.isPurchasable).toBe(true);
    expect(d.ctaAction).toBe('reserve');
  });

  it('ARCHIVED offers no action at all (it is never rendered, but the mapping stays inert)', () => {
    const d = PUBLIC_STATE_DISPLAY.ARCHIVED;
    expect(d.isPurchasable).toBe(false);
    expect(d.ctaAction).toBe('none');
  });
});
