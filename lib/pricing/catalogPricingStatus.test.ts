import { describe, it, expect } from 'vitest';
import { checkPublishability, findDuplicateItemNumbers } from './catalogPricingStatus';
import { dkkToOre } from './money';

describe('catalogPricingStatus — unverified cost remains unpublished', () => {
  it('is not publishable with an unverified pricing source, even with a nonzero price field', () => {
    const result = checkPublishability({ pricingSource: 'unverified', approvedRegularPriceDkkOre: null, itemNo: '18094' });
    expect(result.publishable).toBe(false);
    expect(result.reasons).toContain('unverified supplier cost / no approved price');
  });

  it('is publishable with a board-approved fixed price and a real item number', () => {
    const result = checkPublishability({
      pricingSource: 'board_approved_fixed_price',
      approvedRegularPriceDkkOre: dkkToOre(299),
      itemNo: '18704',
    });
    expect(result.publishable).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('is publishable with a cost-plus-derived price', () => {
    const result = checkPublishability({
      pricingSource: 'cost_plus_formula',
      approvedRegularPriceDkkOre: dkkToOre(129),
      itemNo: '15477',
    });
    expect(result.publishable).toBe(true);
  });

  it('rejects a zero/placeholder price even with a verified source', () => {
    const result = checkPublishability({
      pricingSource: 'cost_plus_formula',
      approvedRegularPriceDkkOre: 0,
      itemNo: '15477',
    });
    expect(result.publishable).toBe(false);
    expect(result.reasons).toContain('zero or missing approved regular price');
  });

  it('rejects a missing item number', () => {
    const result = checkPublishability({
      pricingSource: 'board_approved_fixed_price',
      approvedRegularPriceDkkOre: dkkToOre(299),
      itemNo: '',
    });
    expect(result.publishable).toBe(false);
    expect(result.reasons).toContain('missing item identity (item_no)');
  });
});

describe('catalogPricingStatus — duplicate item numbers', () => {
  it('finds no duplicates in a clean catalog', () => {
    expect(findDuplicateItemNumbers([{ itemNo: '18099' }, { itemNo: '18094' }])).toHaveLength(0);
  });

  it('flags an item number used more than once', () => {
    expect(findDuplicateItemNumbers([{ itemNo: '18099' }, { itemNo: '18099' }, { itemNo: '18094' }])).toEqual(['18099']);
  });
});
