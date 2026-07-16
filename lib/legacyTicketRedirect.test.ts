import { describe, expect, it } from 'vitest';
import { getLegacyTicketRedirectPath } from './legacyTicketRedirect';

describe('getLegacyTicketRedirectPath', () => {
  it('redirects the exact legacy /tickets route to /race-check-in', () => {
    expect(getLegacyTicketRedirectPath('/tickets')).toBe('/race-check-in');
  });

  it('redirects /tickets subpaths, preserving the suffix', () => {
    expect(getLegacyTicketRedirectPath('/tickets/checkout')).toBe('/race-check-in/checkout');
  });

  it('does not redirect unrelated paths', () => {
    expect(getLegacyTicketRedirectPath('/race-check-in')).toBeNull();
    expect(getLegacyTicketRedirectPath('/tournament')).toBeNull();
    expect(getLegacyTicketRedirectPath('/ticketsomethingelse')).toBeNull();
  });
});
