import { describe, it, expect } from 'vitest';
import { parseQrPayload, formatQrPayload } from './qrPayload';

describe('parseQrPayload', () => {
  it('parses a typed product payload', () => {
    const result = parseQrPayload('g4w:product:tok_abc123');
    expect(result).toEqual({ ok: true, payload: { type: 'product', token: 'tok_abc123', raw: 'g4w:product:tok_abc123' } });
  });

  it.each(['racer', 'car', 'service', 'event', 'redemption'] as const)('parses a typed %s payload', (type) => {
    const result = parseQrPayload(`g4w:${type}:tok_xyz`);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.type).toBe(type);
  });

  it('rejects an unknown record type', () => {
    expect(parseQrPayload('g4w:coupon:tok_abc')).toEqual({ ok: false, reason: 'unknown_type' });
  });

  it('rejects a payload missing the g4w prefix', () => {
    expect(parseQrPayload('acme:product:tok_abc')).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects a payload with too few segments', () => {
    expect(parseQrPayload('g4w:product')).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects a payload with an empty token', () => {
    expect(parseQrPayload('g4w:product:')).toEqual({ ok: false, reason: 'empty_token' });
  });

  it('rejects a completely malformed string', () => {
    expect(parseQrPayload('not a qr payload at all')).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects a token that looks like an email address', () => {
    expect(parseQrPayload('g4w:racer:jane@example.com')).toEqual({ ok: false, reason: 'looks_like_personal_data' });
  });

  it('rejects a token that looks like a phone number', () => {
    expect(parseQrPayload('g4w:racer:29912345678')).toEqual({ ok: false, reason: 'looks_like_personal_data' });
  });

  it('allows a token containing colons (e.g. a namespaced service code)', () => {
    const result = parseQrPayload('g4w:service:weekly:entry');
    expect(result).toEqual({ ok: true, payload: { type: 'service', token: 'weekly:entry', raw: 'g4w:service:weekly:entry' } });
  });

  it('formats a payload back into its canonical string', () => {
    expect(formatQrPayload('car', 'tok_car_1')).toBe('g4w:car:tok_car_1');
  });
});
