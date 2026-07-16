'use client';
// Preview-only, printable QR test sheet for physical-device verification of
// the POS QR scanner (see components/pos/CameraScannerModal.tsx and
// lib/scanner/qrPayload.ts). Every payload below is a fixed mock record from
// lib/posCatalog.ts / posRacerDirectory.ts / posCarDirectory.ts /
// posEventDirectory.ts / posRedemption.ts — nothing here reads or writes a
// live Supabase table, and no personal information is encoded in any QR.
//
// IMPORTANT: this route must be disabled or removed before merging to
// production. It is intentionally left out of all public and admin
// navigation menus — it is only reachable by typing the URL directly.
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

interface TestSheetItem {
  id: string;
  number: number;
  title: string;
  recordName: string;
  payload: string;
  expected: string;
}

const ITEMS: TestSheetItem[] = [
  { id: 'product',           number: 1, title: 'PRODUCT',              recordName: 'Hyper-Dash 3 Motor · Item #15373 · 99 DKK',              payload: 'g4w:product:tok_prod_15373',              expected: 'Adds the matching mock product to the sale.' },
  { id: 'service',           number: 2, title: 'SERVICE',               recordName: 'Weekly Entry · 150 DKK (fixed price)',                  payload: 'g4w:service:weekly-entry',                 expected: 'Adds the configured preset service and price.' },
  { id: 'racer',             number: 3, title: 'RACER',                 recordName: 'J. Racer · G4W-R-0047 · Active',                        payload: 'g4w:racer:tok_racer_0047',                 expected: 'Attaches the mock Active Racer Profile.' },
  { id: 'car',               number: 4, title: 'CAR',                   recordName: 'Ray Spear · G4W-BS-0047 · owner J. Racer',              payload: 'g4w:car:tok_car_0047',                     expected: 'Identifies the registered chassis and owner.' },
  { id: 'event',             number: 5, title: 'EVENT',                 recordName: 'Weekly Race Night · 2026-07-18',                        payload: 'g4w:event:tok_event_weekly_260718',        expected: 'Selects the mock event and pricing model.' },
  { id: 'redemption-valid',  number: 6, title: 'REDEMPTION — VALID',    recordName: '25-point / 50 DKK reward · linked to J. Racer',         payload: 'g4w:redemption:redeem_demo_valid_0001',    expected: 'Identifies the selected reward but requires confirmation.' },
  { id: 'redemption-expired', number: 7, title: 'REDEMPTION — EXPIRED', recordName: 'Same reward · token expired 2020',                      payload: 'g4w:redemption:redeem_demo_expired_0001',  expected: 'Rejected as expired.' },
  { id: 'invalid',           number: 8, title: 'INVALID / UNKNOWN',     recordName: 'Unrecognized record type ("coupon")',                   payload: 'g4w:coupon:tok_unknown_0001',              expected: 'Rejected with a clear error.' },
];

export default function QrTestSheetPage() {
  const [images, setImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      ITEMS.map(item =>
        QRCode.toDataURL(item.payload, { width: 320, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
          .then(url => [item.id, url] as const)
      )
    ).then(pairs => { if (!cancelled) setImages(Object.fromEntries(pairs)); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', color: '#111', padding: '24px 16px' }}>
      <style>{`
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .qr-card { break-inside: avoid; page-break-inside: avoid; border: 1px solid #999 !important; }
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ background: '#7f1d1d', color: '#fff', borderRadius: 8, padding: '14px 18px', marginBottom: 20, textAlign: 'center', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2 }}>
          ⚠️ PREVIEW TEST DATA — NOT VALID FOR LIVE USE
        </div>

        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ ...F, fontWeight: 900, fontSize: 24 }}>QR SCANNER TEST SHEET</div>
            <div style={{ ...FB, fontSize: 13, color: '#444' }}>Arctic Mini4WD POS — physical-device verification only. Mock records, no live data.</div>
          </div>
          <button onClick={() => window.print()} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', ...F, fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: 'pointer' }}>
            PRINT
          </button>
        </div>

        <div style={{ ...FB, fontSize: 12, color: '#444', marginBottom: 24, lineHeight: 1.6 }}>
          Scan each code below with the POS terminal&apos;s <strong>📷 SCAN QR</strong> button at <code>/admin/pos</code> and confirm the result matches &quot;Expected.&quot; None of these codes contain personal information, and no record here is read from or written to Supabase.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
          {ITEMS.map(item => (
            <div key={item.id} className="qr-card" style={{ background: '#fff', border: '1px solid #ccc', borderRadius: 10, padding: 24, textAlign: 'center' }}>
              <div style={{ ...F, fontWeight: 900, fontSize: 13, letterSpacing: 2, color: '#7f1d1d', marginBottom: 4 }}>{item.number}. {item.title}</div>
              <div style={{ ...FB, fontSize: 13, color: '#111', marginBottom: 16 }}>{item.recordName}</div>

              <div style={{ padding: 16, display: 'inline-block' }}>
                {images[item.id]
                  ? <img src={images[item.id]} alt={`QR code for ${item.title}`} style={{ width: 240, height: 240 }} />
                  : <div style={{ width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', ...FB, fontSize: 12, color: '#999' }}>Generating…</div>}
              </div>

              <div style={{ ...FB, fontSize: 12, color: '#333', fontFamily: 'monospace', wordBreak: 'break-all', marginTop: 12, marginBottom: 12 }}>{item.payload}</div>

              <div style={{ borderTop: '1px solid #eee', paddingTop: 12, ...FB, fontSize: 12, color: '#444' }}>
                <strong>Expected:</strong> {item.expected}
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...FB, fontSize: 11, color: '#888', marginTop: 32, textAlign: 'center' }}>
          Generated by the Arctic Mini4WD POS Preview build. This route is not linked from any navigation menu and must be disabled or removed before production merge.
        </div>
      </div>
    </div>
  );
}
