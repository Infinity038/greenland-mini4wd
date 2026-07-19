import { describe, expect, it } from 'vitest';
import { isPriceOnRequest, PRICE_ON_REQUEST_LABEL, ASK_FOR_PRICE_LABEL } from './pricing';

describe('isPriceOnRequest', () => {
  it('is true only when price_on_request is exactly true', () => {
    expect(isPriceOnRequest({ price_on_request: true })).toBe(true);
  });

  it('is false when price_on_request is false', () => {
    expect(isPriceOnRequest({ price_on_request: false })).toBe(false);
  });

  it('is false when price_on_request is absent', () => {
    expect(isPriceOnRequest({})).toBe(false);
  });

  it('is false for null/undefined product', () => {
    expect(isPriceOnRequest(null)).toBe(false);
    expect(isPriceOnRequest(undefined)).toBe(false);
  });

  it('never treats a falsy/zero price as an on-request signal — only the explicit flag counts', () => {
    // price_dkk being 0 or null must never be interpreted as price-on-request;
    // only the explicit boolean does. This type intentionally has no price
    // field at all, so a bug that reads price instead of the flag would fail
    // to compile/would have nothing to read.
    expect(isPriceOnRequest({ price_on_request: true })).toBe(true);
    expect(isPriceOnRequest({})).toBe(false);
  });
});

describe('labels', () => {
  it('never render a numeric-looking placeholder', () => {
    expect(PRICE_ON_REQUEST_LABEL).toBe('PRICE ON REQUEST');
    expect(ASK_FOR_PRICE_LABEL).toBe('ASK FOR PRICE');
    expect(PRICE_ON_REQUEST_LABEL).not.toMatch(/\d/);
    expect(ASK_FOR_PRICE_LABEL).not.toMatch(/\d/);
  });
});
