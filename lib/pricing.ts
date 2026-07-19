// Shared price-on-request predicate and labels. A single source of truth so
// every price-rendering and checkout-guard call site agrees on what counts
// as "price not approved yet" — never inferred from price_dkk being 0/null.
export const PRICE_ON_REQUEST_LABEL = 'PRICE ON REQUEST';
export const ASK_FOR_PRICE_LABEL = 'ASK FOR PRICE';

export interface PriceOnRequestLike {
  price_on_request?: boolean | null;
}

export function isPriceOnRequest(p: PriceOnRequestLike | null | undefined): boolean {
  return p?.price_on_request === true;
}
