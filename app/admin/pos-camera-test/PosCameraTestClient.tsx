'use client';
// Preview-only camera diagnostic tool for the shared QR scanner. Read-only:
// every lookup below uses the existing mock catalog/directory modules and
// never mutates them, awards points, deducts stock, or marks a redemption
// token used. No Supabase import anywhere in this file or its dependencies.
import { useState } from 'react';
import CameraScannerModal from '@/components/pos/CameraScannerModal';
import { parseQrPayload, type QrRecordType } from '@/lib/scanner/qrPayload';
import { getCameraCapability, getBarcodeDetectorCapability } from '@/lib/scanner/scannerSupport';
import { lookupProductByQrToken, lookupServiceByCode } from '@/lib/posCatalog';
import { lookupRacerByQrToken } from '@/lib/posRacerDirectory';
import { lookupCarByQrToken } from '@/lib/posCarDirectory';
import { lookupEventByQrToken } from '@/lib/posEventDirectory';
import { resolveRedemptionScan, DEMO_VALID_REDEMPTION_TOKEN, DEMO_EXPIRED_REDEMPTION_TOKEN } from '@/lib/posRedemption';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

function describeLookup(type: QrRecordType, token: string): string {
  switch (type) {
    case 'product': {
      const p = lookupProductByQrToken(token);
      return p ? `Product: ${p.name} (${p.clubProductId}), ${p.unitPriceDkk} DKK` : 'No matching mock product for this token.';
    }
    case 'service': {
      const s = lookupServiceByCode(token);
      return s ? `Service: ${s.name}${s.unitPriceDkk != null ? ` — ${s.unitPriceDkk} DKK` : ' (open price)'}` : 'No matching mock service for this code.';
    }
    case 'racer': {
      const outcome = lookupRacerByQrToken(token);
      if (outcome.kind === 'invalid_qr') return 'No matching mock racer for this token.';
      if (outcome.kind === 'revoked_card') return 'Revoked card (mock).';
      return `Racer: ${outcome.racer.displayName} (${outcome.racer.racerId}) — ${outcome.kind === 'found' ? 'Active' : outcome.kind}`;
    }
    case 'car': {
      const c = lookupCarByQrToken(token);
      return c ? `Car: ${c.model} — ${c.clubCarId} (owner ${c.ownerName})` : 'No matching mock car for this token.';
    }
    case 'event': {
      const e = lookupEventByQrToken(token);
      return e ? `Event: ${e.name} (${e.date})` : 'No matching mock event for this token.';
    }
    case 'redemption': {
      const outcome = resolveRedemptionScan(token, [DEMO_VALID_REDEMPTION_TOKEN, DEMO_EXPIRED_REDEMPTION_TOKEN]);
      return `Redemption lookup result: ${outcome.kind}`;
    }
  }
}

export default function PosCameraTestClient() {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [result, setResult] = useState<{ raw: string; summary: string } | null>(null);

  // Cheap synchronous browser-capability reads — no effect needed.
  const cameraCapability = getCameraCapability();
  const detectorCapability = getBarcodeDetectorCapability();

  const processCode = (raw: string) => {
    const parsed = parseQrPayload(raw);
    if (!parsed.ok) {
      setResult({ raw, summary: `Not a recognized Arctic Mini4WD QR payload (${parsed.reason}).` });
      return;
    }
    setResult({ raw, summary: `Type: ${parsed.payload.type} · Token: ${parsed.payload.token} · ${describeLookup(parsed.payload.type, parsed.payload.token)}` });
  };

  const handleCameraDetected = (raw: string) => {
    setCameraOpen(false);
    processCode(raw);
  };

  const handleManualSubmit = () => {
    const code = qrInput.trim();
    if (!code) return;
    processCode(code);
    setQrInput('');
  };

  return (
    <div style={{ background: '#050505', minHeight: '100vh', color: '#F5F5F5' }}>
      <div style={{ background: '#7f1d1d', color: '#fff', padding: '14px 18px', textAlign: 'center', ...F, fontWeight: 900, fontSize: 16, letterSpacing: 2 }}>
        PREVIEW CAMERA TEST — MOCK DATA ONLY
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 20, lineHeight: 1.7 }}>
          Temporary Preview-only tool for verifying the QR camera scanner on real hardware. Every lookup here reads the existing mock catalog/racer/car/event/redemption data — nothing is added to a sale, no stock or points are touched, and no Supabase call happens anywhere on this page.
          {' '}<a href="/admin/qr-test-sheet" style={{ color: '#FACC15' }}>View the printable QR test sheet →</a>
        </div>

        <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#B8C1CC', marginBottom: 10 }}>CAMERA DIAGNOSTICS</div>
          <div style={{ ...FB, fontSize: 13, color: '#F5F5F5', lineHeight: 1.8 }}>
            Camera (getUserMedia): <strong style={{ color: cameraCapability === 'supported' ? '#22C55E' : '#DC2626' }}>{cameraCapability}</strong><br />
            Native BarcodeDetector: <strong style={{ color: detectorCapability === 'supported' ? '#22C55E' : '#FACC15' }}>{detectorCapability}</strong><br />
            Decode engine that will be used: <strong>{detectorCapability === 'supported' ? 'native BarcodeDetector' : 'fallback (jsQR, lazy-loaded)'}</strong>
          </div>
        </div>

        <div style={{ background: '#071426', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, padding: 16 }}>
          <div style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#B8C1CC', marginBottom: 10 }}>SCAN A QR CODE</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <button onClick={() => setCameraOpen(true)} style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', ...F, fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: 'pointer' }}>
              📷 OPEN CAMERA
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              value={qrInput}
              onChange={e => setQrInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleManualSubmit(); }}
              placeholder="Or type/paste a QR payload (g4w:...)"
              style={{ flex: '1 1 220px', minWidth: 0, background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#F5F5F5', ...FB, fontSize: 14 }}
            />
            <button onClick={handleManualSubmit} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5', borderRadius: 8, padding: '10px 18px', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: 'pointer' }}>PARSE</button>
          </div>

          {result && (
            <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12 }}>
              <div style={{ ...FB, fontSize: 12, color: '#6B7280', fontFamily: 'monospace', marginBottom: 6 }}>{result.raw}</div>
              <div style={{ ...FB, fontSize: 13, color: '#F5F5F5' }}>{result.summary}</div>
            </div>
          )}
        </div>
      </div>

      {cameraOpen && (
        <CameraScannerModal
          title="Scan QR Code (Preview Test)"
          onDetected={handleCameraDetected}
          onCancel={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}
